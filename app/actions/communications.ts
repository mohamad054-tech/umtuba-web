"use server";

import { createClient, getServerUser } from "../../lib/supabase/server";
import { normalizeUsername, isValidUsername } from "../../lib/supabase/validation";
import { normalizeDiscoveryEmail } from "../../lib/comms/emailIdentity";
import {
  composeE164,
  inferCountryCodeFromE164,
  normalizeCountryCode,
  normalizeE164Input,
} from "../../lib/comms/phoneIdentity";
import {
  type CommunicationPrivacy,
  type DiscoveredIdentity,
  type EmailFindValue,
  type PhoneFindValue,
  type PreparedVisibility,
  isEmailFindValue,
  isPhoneFindValue,
  isPreparedVisibility,
} from "../../lib/comms/privacyContract";
import { parsePersonalContactInput } from "../../lib/comms/contactLink";
import {
  bindOwnPhone,
  discoverUserByEmail,
  discoverUserByPhone,
  discoverUserByUsername,
  getOwnCommunicationPrivacy,
  getOwnContactSyncState,
  getOwnPhoneIdentity,
  setOwnCommunicationPrivacy,
  setOwnContactSyncPermission,
  unbindOwnPhone,
  type ContactSyncState,
  type OwnPhoneIdentity,
} from "../../lib/supabase/communicationsDiscovery";
import type { ActionResult } from "../../lib/supabase/messenger";

const GENERIC_NOT_FOUND = "No UMTUBA account is available to message with this lookup.";

async function requireUser(): Promise<
  ActionResult<{ userId: string }>
> {
  const user = await getServerUser();
  if (!user) {
    return {
      ok: false,
      message: "Please sign in to start a conversation.",
      requiresAuth: true,
    };
  }
  return { ok: true, userId: user.id };
}

export async function discoverByUsernameAction(
  raw: string
): Promise<ActionResult<{ identity: DiscoveredIdentity | null }>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;
  const username = normalizeUsername(raw);
  if (!isValidUsername(username)) {
    return { ok: true, identity: null };
  }
  const supabase = await createClient();
  const result = await discoverUserByUsername(supabase, username);
  if (!result.ok) return result;
  return { ok: true, identity: result.identity };
}

export async function discoverByEmailAction(
  raw: string
): Promise<ActionResult<{ identity: DiscoveredIdentity | null }>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;
  const email = normalizeDiscoveryEmail(raw);
  if (!email) {
    return { ok: true, identity: null };
  }
  const supabase = await createClient();
  const result = await discoverUserByEmail(supabase, email);
  if (!result.ok) return result;
  return { ok: true, identity: result.identity };
}

export async function discoverByPhoneAction(
  raw: string,
  countryCode?: string
): Promise<ActionResult<{ identity: DiscoveredIdentity | null }>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;
  const e164 = countryCode
    ? composeE164(countryCode, raw)
    : normalizeE164Input(raw);
  if (!e164) {
    return { ok: true, identity: null };
  }
  const supabase = await createClient();
  const result = await discoverUserByPhone(supabase, e164);
  if (!result.ok) return result;
  return { ok: true, identity: result.identity };
}

export async function discoverByContactLinkAction(
  raw: string
): Promise<ActionResult<{ identity: DiscoveredIdentity | null }>> {
  const parsed = parsePersonalContactInput(raw);
  if (!parsed) {
    return { ok: true, identity: null };
  }
  return discoverByUsernameAction(parsed.username);
}

export async function loadCommunicationsSettingsAction(): Promise<
  ActionResult<{
    privacy: CommunicationPrivacy;
    phone: OwnPhoneIdentity | null;
    contactSync: ContactSyncState;
  }>
> {
  const auth = await requireUser();
  if (!auth.ok) return auth;
  const supabase = await createClient();
  const [privacy, phone, contactSync] = await Promise.all([
    getOwnCommunicationPrivacy(supabase),
    getOwnPhoneIdentity(supabase),
    getOwnContactSyncState(supabase),
  ]);
  if (!privacy.ok) return privacy;
  if (!phone.ok) return phone;
  if (!contactSync.ok) return contactSync;
  return {
    ok: true,
    privacy: privacy.privacy,
    phone: phone.phone,
    contactSync: contactSync.state,
  };
}

export async function saveCommunicationPrivacyAction(input: {
  findByPhone?: string;
  findByEmail?: string;
  whoCanMessage?: string;
  whoCanCall?: string;
  readReceiptsEnabled?: boolean;
  lastSeenVisible?: string;
}): Promise<ActionResult<{ privacy: CommunicationPrivacy }>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;
  const patch: {
    findByPhone?: PhoneFindValue;
    findByEmail?: EmailFindValue;
    whoCanMessage?: PreparedVisibility;
    whoCanCall?: PreparedVisibility;
    readReceiptsEnabled?: boolean;
    lastSeenVisible?: PreparedVisibility;
  } = {};
  if (input.findByPhone !== undefined) {
    if (!isPhoneFindValue(input.findByPhone)) {
      return { ok: false, message: "Invalid phone privacy." };
    }
    patch.findByPhone = input.findByPhone;
  }
  if (input.findByEmail !== undefined) {
    if (!isEmailFindValue(input.findByEmail)) {
      return { ok: false, message: "Invalid email privacy." };
    }
    patch.findByEmail = input.findByEmail;
  }
  if (input.whoCanMessage !== undefined) {
    if (!isPreparedVisibility(input.whoCanMessage)) {
      return { ok: false, message: "Invalid message privacy." };
    }
    patch.whoCanMessage = input.whoCanMessage;
  }
  if (input.whoCanCall !== undefined) {
    if (!isPreparedVisibility(input.whoCanCall)) {
      return { ok: false, message: "Invalid call privacy." };
    }
    patch.whoCanCall = input.whoCanCall;
  }
  if (input.lastSeenVisible !== undefined) {
    if (!isPreparedVisibility(input.lastSeenVisible)) {
      return { ok: false, message: "Invalid last-seen privacy." };
    }
    patch.lastSeenVisible = input.lastSeenVisible;
  }
  if (input.readReceiptsEnabled !== undefined) {
    patch.readReceiptsEnabled = input.readReceiptsEnabled;
  }
  const supabase = await createClient();
  return setOwnCommunicationPrivacy(supabase, patch);
}

export async function bindOwnPhoneAction(input: {
  phone: string;
  countryCode: string;
}): Promise<ActionResult<{ phone: OwnPhoneIdentity }>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;
  const countryCode = normalizeCountryCode(input.countryCode);
  const e164 =
    composeE164(input.countryCode, input.phone) ??
    normalizeE164Input(input.phone);
  const inferred = e164 ? inferCountryCodeFromE164(e164) : null;
  const cc = countryCode ?? inferred;
  if (!e164 || !cc) {
    return { ok: false, message: "Enter a valid phone number." };
  }
  const supabase = await createClient();
  return bindOwnPhone(supabase, e164, cc);
}

export async function unbindOwnPhoneAction(): Promise<
  ActionResult<{ unbound: true }>
> {
  const auth = await requireUser();
  if (!auth.ok) return auth;
  const supabase = await createClient();
  return unbindOwnPhone(supabase);
}

export async function setContactSyncPermissionAction(
  granted: boolean
): Promise<ActionResult<{ state: ContactSyncState }>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;
  const supabase = await createClient();
  return setOwnContactSyncPermission(supabase, granted);
}

export function discoveryNotFoundMessage(): string {
  return GENERIC_NOT_FOUND;
}
