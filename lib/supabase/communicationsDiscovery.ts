import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionResult } from "./messenger";
import {
  DEFAULT_COMMUNICATION_PRIVACY,
  type CommunicationPrivacy,
  type DiscoveredIdentity,
  type EmailFindValue,
  type PhoneFindValue,
  type PreparedVisibility,
  isEmailFindValue,
  isPhoneFindValue,
  isPreparedVisibility,
} from "../comms/privacyContract";

type PublicIdentityRow = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

type PrivacyRow = {
  find_by_phone: string;
  find_by_email: string;
  who_can_message: string;
  who_can_call: string;
  read_receipts_enabled: boolean;
  last_seen_visible: string;
};

type PhoneRow = {
  phone_e164: string;
  phone_country_code: string;
  phone_verified_at: string | null;
};

type ContactSyncRow = {
  permission_granted_at: string | null;
  sync_enabled: boolean;
  last_sync_at: string | null;
  revoked_at: string | null;
};

export type OwnPhoneIdentity = {
  phoneE164: string;
  phoneCountryCode: string;
  phoneVerifiedAt: string | null;
};

export type ContactSyncState = {
  permissionGrantedAt: string | null;
  syncEnabled: boolean;
  lastSyncAt: string | null;
  revokedAt: string | null;
};

function mapIdentity(row: PublicIdentityRow): DiscoveredIdentity {
  return {
    userId: row.user_id,
    username: row.username,
    displayName: (row.display_name ?? "").trim() || row.username,
    avatarUrl: row.avatar_url,
  };
}

function mapPrivacy(row: PrivacyRow | null): CommunicationPrivacy {
  if (!row) {
    return DEFAULT_COMMUNICATION_PRIVACY;
  }
  return {
    findByPhone: isPhoneFindValue(row.find_by_phone)
      ? row.find_by_phone
      : DEFAULT_COMMUNICATION_PRIVACY.findByPhone,
    findByEmail: isEmailFindValue(row.find_by_email)
      ? row.find_by_email
      : DEFAULT_COMMUNICATION_PRIVACY.findByEmail,
    whoCanMessage: isPreparedVisibility(row.who_can_message)
      ? row.who_can_message
      : DEFAULT_COMMUNICATION_PRIVACY.whoCanMessage,
    whoCanCall: isPreparedVisibility(row.who_can_call)
      ? row.who_can_call
      : DEFAULT_COMMUNICATION_PRIVACY.whoCanCall,
    readReceiptsEnabled: Boolean(row.read_receipts_enabled),
    lastSeenVisible: isPreparedVisibility(row.last_seen_visible)
      ? row.last_seen_visible
      : DEFAULT_COMMUNICATION_PRIVACY.lastSeenVisible,
  };
}

function discoveryError(error: { message?: string; code?: string }): ActionResult<never> {
  const message = (error.message || "").toLowerCase();
  if (message.includes("authentication required")) {
    return {
      ok: false,
      message: "Please sign in to start a conversation.",
      requiresAuth: true,
    };
  }
  if (
    error.code === "PGRST202" ||
    message.includes("could not find the function") ||
    message.includes("schema cache")
  ) {
    return {
      ok: false,
      message:
        "Communications discovery is not set up on this project yet. Apply 20260936_communications_identity_discovery_v1.sql locally.",
    };
  }
  return { ok: false, message: error.message || "Unable to look up this person." };
}

async function discoverByRpc(
  supabase: SupabaseClient,
  fn: "discover_user_by_username" | "discover_user_by_email" | "discover_user_by_phone",
  args: Record<string, string>
): Promise<ActionResult<{ identity: DiscoveredIdentity | null }>> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    return discoveryError(error);
  }
  const row = Array.isArray(data) ? (data[0] as PublicIdentityRow | undefined) : null;
  if (!row?.user_id || !row.username) {
    return { ok: true, identity: null };
  }
  return { ok: true, identity: mapIdentity(row) };
}

export async function discoverUserByUsername(
  supabase: SupabaseClient,
  username: string
): Promise<ActionResult<{ identity: DiscoveredIdentity | null }>> {
  return discoverByRpc(supabase, "discover_user_by_username", {
    p_username: username,
  });
}

export async function discoverUserByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<ActionResult<{ identity: DiscoveredIdentity | null }>> {
  return discoverByRpc(supabase, "discover_user_by_email", { p_email: email });
}

export async function discoverUserByPhone(
  supabase: SupabaseClient,
  phoneE164: string
): Promise<ActionResult<{ identity: DiscoveredIdentity | null }>> {
  return discoverByRpc(supabase, "discover_user_by_phone", { p_phone: phoneE164 });
}

export async function getOwnCommunicationPrivacy(
  supabase: SupabaseClient
): Promise<ActionResult<{ privacy: CommunicationPrivacy }>> {
  const { data, error } = await supabase.rpc("get_own_communication_privacy");
  if (error) {
    return discoveryError(error);
  }
  return { ok: true, privacy: mapPrivacy(data as PrivacyRow | null) };
}

export async function setOwnCommunicationPrivacy(
  supabase: SupabaseClient,
  patch: {
    findByPhone?: PhoneFindValue;
    findByEmail?: EmailFindValue;
    whoCanMessage?: PreparedVisibility;
    whoCanCall?: PreparedVisibility;
    readReceiptsEnabled?: boolean;
    lastSeenVisible?: PreparedVisibility;
  }
): Promise<ActionResult<{ privacy: CommunicationPrivacy }>> {
  const { data, error } = await supabase.rpc("set_own_communication_privacy", {
    p_find_by_phone: patch.findByPhone ?? null,
    p_find_by_email: patch.findByEmail ?? null,
    p_who_can_message: patch.whoCanMessage ?? null,
    p_who_can_call: patch.whoCanCall ?? null,
    p_read_receipts_enabled: patch.readReceiptsEnabled ?? null,
    p_last_seen_visible: patch.lastSeenVisible ?? null,
  });
  if (error) {
    return discoveryError(error);
  }
  return { ok: true, privacy: mapPrivacy(data as PrivacyRow | null) };
}

export async function getOwnPhoneIdentity(
  supabase: SupabaseClient
): Promise<ActionResult<{ phone: OwnPhoneIdentity | null }>> {
  const { data, error } = await supabase.rpc("get_own_phone_identity");
  if (error) {
    return discoveryError(error);
  }
  const row = Array.isArray(data) ? (data[0] as PhoneRow | undefined) : null;
  if (!row?.phone_e164) {
    return { ok: true, phone: null };
  }
  return {
    ok: true,
    phone: {
      phoneE164: row.phone_e164,
      phoneCountryCode: row.phone_country_code,
      phoneVerifiedAt: row.phone_verified_at,
    },
  };
}

export async function bindOwnPhone(
  supabase: SupabaseClient,
  phoneE164: string,
  countryCode: string
): Promise<ActionResult<{ phone: OwnPhoneIdentity }>> {
  const { data, error } = await supabase.rpc("bind_own_phone", {
    p_phone_e164: phoneE164,
    p_country_code: countryCode,
  });
  if (error) {
    const message = (error.message || "").toLowerCase();
    if (message.includes("phone unavailable")) {
      return { ok: false, message: "This number cannot be used." };
    }
    if (message.includes("invalid phone")) {
      return { ok: false, message: "Enter a valid phone number." };
    }
    return discoveryError(error);
  }
  const row = Array.isArray(data) ? (data[0] as PhoneRow | undefined) : (data as PhoneRow | null);
  if (!row?.phone_e164) {
    return { ok: false, message: "Unable to save this number." };
  }
  return {
    ok: true,
    phone: {
      phoneE164: row.phone_e164,
      phoneCountryCode: row.phone_country_code,
      phoneVerifiedAt: row.phone_verified_at,
    },
  };
}

export async function unbindOwnPhone(
  supabase: SupabaseClient
): Promise<ActionResult<{ unbound: true }>> {
  const { error } = await supabase.rpc("unbind_own_phone");
  if (error) {
    return discoveryError(error);
  }
  return { ok: true, unbound: true };
}

export async function getOwnContactSyncState(
  supabase: SupabaseClient
): Promise<ActionResult<{ state: ContactSyncState }>> {
  const { data, error } = await supabase.rpc("get_own_contact_sync_state");
  if (error) {
    return discoveryError(error);
  }
  const row = data as ContactSyncRow | null;
  return {
    ok: true,
    state: {
      permissionGrantedAt: row?.permission_granted_at ?? null,
      syncEnabled: Boolean(row?.sync_enabled),
      lastSyncAt: row?.last_sync_at ?? null,
      revokedAt: row?.revoked_at ?? null,
    },
  };
}

export async function setOwnContactSyncPermission(
  supabase: SupabaseClient,
  granted: boolean
): Promise<ActionResult<{ state: ContactSyncState }>> {
  const { data, error } = await supabase.rpc("set_own_contact_sync_permission", {
    p_granted: granted,
  });
  if (error) {
    return discoveryError(error);
  }
  const row = data as ContactSyncRow | null;
  return {
    ok: true,
    state: {
      permissionGrantedAt: row?.permission_granted_at ?? null,
      syncEnabled: Boolean(row?.sync_enabled),
      lastSyncAt: row?.last_sync_at ?? null,
      revokedAt: row?.revoked_at ?? null,
    },
  };
}
