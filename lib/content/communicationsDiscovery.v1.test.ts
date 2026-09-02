import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildPersonalAtPath,
  buildPersonalContactPath,
  buildPersonalContactUrl,
  parsePersonalContactInput,
} from "../comms/contactLink";
import { normalizeDiscoveryEmail } from "../comms/emailIdentity";
import {
  composeE164,
  inferCountryCodeFromE164,
  normalizeE164Input,
} from "../comms/phoneIdentity";
import {
  DEFAULT_EMAIL_FIND,
  DEFAULT_PHONE_FIND,
  effectivePhoneFind,
} from "../comms/privacyContract";
import { renderContactQrSvg } from "../comms/qrSvg";
import { discoveryNotFoundMessage } from "../comms/discoveryNotFound";

const ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("personal contact link", () => {
  it("builds username paths without private ids", () => {
    expect(buildPersonalContactPath("@Ada.User")).toBe("/u/ada.user");
    expect(buildPersonalAtPath("Ada.User")).toBe("/@ada.user");
    expect(buildPersonalContactUrl("ada.user", "https://umtuba.com")).toBe(
      "https://umtuba.com/@ada.user"
    );
    expect(buildPersonalContactPath("ab")).toBeNull();
  });

  it("parses @handle, /u/handle, and absolute URLs", () => {
    expect(parsePersonalContactInput("@maya")).toEqual({ username: "maya" });
    expect(parsePersonalContactInput("/u/maya")).toEqual({ username: "maya" });
    expect(parsePersonalContactInput("https://umtuba.com/@maya")).toEqual({
      username: "maya",
    });
    expect(parsePersonalContactInput("not a handle!")).toBeNull();
  });
});

describe("email and phone identity", () => {
  it("normalizes emails without exposing them as public identity", () => {
    expect(normalizeDiscoveryEmail("  Ada@Example.COM ")).toBe("ada@example.com");
    expect(normalizeDiscoveryEmail("nope")).toBeNull();
  });

  it("composes E.164 and never treats unverified numbers as discoverable in contract", () => {
    expect(composeE164("+1", "2025550123")).toBe("+12025550123");
    expect(normalizeE164Input("+44 7700 900123")).toBe("+447700900123");
    expect(inferCountryCodeFromE164("+12025550123")).toBe("+1");
    expect(DEFAULT_EMAIL_FIND).toBe("nobody");
    expect(DEFAULT_PHONE_FIND).toBe("nobody");
    expect(effectivePhoneFind("contacts")).toBe("nobody");
    expect(effectivePhoneFind("everyone")).toBe("everyone");
  });
});

describe("contact QR payload", () => {
  it("encodes only the personal contact URL", () => {
    const url = "https://umtuba.com/@ada.user";
    const svg = renderContactQrSvg(url);
    expect(svg).toContain("<svg");
    expect(svg).not.toMatch(/\+[1-9][0-9]{7,14}/);
    expect(svg).not.toMatch(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
    expect(svg).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
    );
  });
});

describe("discovery not-found copy", () => {
  it("keeps the generic lookup message off the server-action module", () => {
    expect(discoveryNotFoundMessage()).toBe(
      "No UMTUBA account is available to message with this lookup."
    );
    expect(read("app/actions/communications.ts")).toMatch(/^"use server";/);
    expect(read("lib/comms/discoveryNotFound.ts")).not.toMatch(
      /^["']use server["']/
    );
  });
});

describe("communications migration and reuse", () => {
  it("keeps phone/email off public.profiles and reuses get_or_create", () => {
    const migration = read(
      "supabase/migrations/20260936_communications_identity_discovery_v1.sql"
    );
    const profileMigration = read(
      "supabase/migrations/20260935_rich_personal_profile_foundation_v1.sql"
    );
    const messenger = read("lib/supabase/messenger.ts");
    const start = read("app/messages/components/StartConversationPanel.tsx");
    const foundCard = read("app/messages/components/DiscoveredIdentityCard.tsx");
    const profileActions = read("app/profile/components/ProfileActions.tsx");

    expect(migration).toMatch(/communication_phone_identities/);
    expect(migration).toMatch(/communication_privacy_settings/);
    expect(migration).toMatch(/discover_user_by_username/);
    expect(migration).toMatch(/discover_user_by_email/);
    expect(migration).toMatch(/discover_user_by_phone/);
    expect(migration).toMatch(/force row level security/);
    expect(migration).toMatch(/set search_path = public/);
    expect(migration).toMatch(/from auth\.users/);
    expect(migration).toMatch(/email_confirmed_at is not null/);
    expect(migration).toMatch(/phone_verified_at is not null/);
    expect(migration).toMatch(/find_by_email in \('nobody', 'everyone'\)/);
    expect(migration).toMatch(/default 'nobody'/);
    expect(migration).toMatch(/on conflict \(user_id\)/);
    expect(migration).toMatch(
      /on conflict on constraint communication_privacy_settings_pkey do nothing/
    );
    const emailRpc = migration.slice(
      migration.indexOf("create or replace function public.discover_user_by_email"),
      migration.indexOf("create or replace function public.discover_user_by_phone")
    );
    expect(emailRpc).toMatch(
      /on conflict on constraint communication_privacy_settings_pkey do nothing/
    );
    expect(emailRpc).not.toMatch(/on conflict \(user_id\)/);
    expect(migration).toMatch(/MUTE != BLOCK/);
    expect(migration).toMatch(/CONTACT_SYNC foundation/);
    expect(migration).not.toMatch(/alter table public\.profiles/);
    expect(migration).not.toMatch(/profiles\.phone/);
    expect(migration).not.toMatch(/profiles\.email/);
    expect(profileMigration).not.toMatch(/phone_e164|find_by_email/);

    expect(messenger).toMatch(/get_or_create_direct_conversation/);
    expect(start).toMatch(/DiscoveredIdentityCard|discoverByUsernameAction/);
    expect(start).toMatch(/lib\/comms\/discoveryNotFound/);
    expect(start).not.toMatch(
      /discoveryNotFoundMessage,\s*\n\s*\} from ["'].*actions\/communications/
    );
    expect(read("app/actions/communications.ts")).not.toMatch(
      /export function discoveryNotFoundMessage/
    );
    expect(foundCard).toMatch(/StartDirectMessageButton/);
    expect(profileActions).toMatch(/StartDirectMessageButton/);
    expect(read("app/components/messaging/StartDirectMessageButton.tsx")).toMatch(
      /openDirectConversationAction/
    );
  });

  it("does not grant digest or public identity helpers to clients", () => {
    const migration = read(
      "supabase/migrations/20260936_communications_identity_discovery_v1.sql"
    );
    expect(migration).toMatch(
      /revoke all on function public\.comms_identity_digest/
    );
    expect(migration).toMatch(
      /revoke all on function public\.comms_public_identity/
    );
    expect(migration).toMatch(
      /grant execute on function public\.discover_user_by_email/
    );
    expect(migration).toMatch(
      /revoke insert, update, delete on table public\.communication_phone_identities/
    );
    expect(migration).toMatch(
      /revoke insert, update, delete on table public\.communication_contact_sync_state/
    );
    expect(migration).toMatch(/comms_phone_identity_guard/);
    expect(migration).toMatch(/NEW\.phone_verified_at := null/);
    expect(migration).not.toMatch(
      /grant select, insert, update, delete on table public\.communication_phone_identities/
    );
  });

  it("wires start conversation and settings privacy without a second messenger", () => {
    const list = read("app/messages/components/ConversationList.tsx");
    const experience = read("app/messages/MessagesExperience.tsx");
    const settings = read("app/settings/SettingsExperience.tsx");
    const privacy = read("app/settings/CommunicationsPrivacyPanel.tsx");

    expect(list).toMatch(/onStartConversation/);
    expect(experience).toMatch(/StartConversationPanel/);
    expect(settings).toMatch(/communications/);
    expect(privacy).toMatch(/findByEmail/);
    expect(privacy).toMatch(/findByPhone/);
    expect(experience).not.toMatch(/coming soon/i);
    expect(experience).not.toMatch(/video.?call/i);
  });
});
