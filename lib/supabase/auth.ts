import { createClient } from "./client";
import type { ProfileRow } from "./database.types";
import {
  getErrorMessage,
  isValidUsername,
  normalizeUsername,
  USERNAME_HINT,
} from "./validation";
import type { User } from "@supabase/supabase-js";

export type UserProfile = {
  id: string;
  username: string;
  display_name: string;
  full_name: string;
  bio: string | null;
  city: string | null;
  country: string | null;
  avatar_url: string | null;
  avatar_initial: string;
};

const PROFILE_COLUMNS =
  "id, username, display_name, full_name, bio, city, country, avatar_url, avatar_initial, created_at, updated_at";

function mapProfileRow(row: ProfileRow): UserProfile {
  const displayName =
    (row.display_name && row.display_name.trim()) ||
    (row.full_name && row.full_name.trim()) ||
    row.username;

  return {
    id: row.id,
    username: row.username,
    display_name: displayName,
    full_name: row.full_name || displayName,
    bio: row.bio,
    city: row.city,
    country: row.country,
    avatar_url: row.avatar_url,
    avatar_initial:
      row.avatar_initial || displayName.charAt(0).toUpperCase() || "U",
  };
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    throw new Error(getErrorMessage(error, "Unable to sign in."));
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(
      getErrorMessage(userError, "Signed in, but the session could not be verified.")
    );
  }

  return { session: data.session, user };
}

export async function signUpWithEmail(input: {
  email: string;
  password: string;
  fullName: string;
  username: string;
  /** Optional referral code (first-touch attribution). */
  referralCode?: string | null;
}) {
  const supabase = createClient();
  const email = input.email.trim();
  const fullName = input.fullName.trim();
  const username = normalizeUsername(input.username);
  const referralCode =
    typeof input.referralCode === "string"
      ? input.referralCode.trim().toUpperCase()
      : "";

  if (!fullName) {
    throw new Error("Please enter your full name.");
  }

  if (!username) {
    throw new Error("Please choose a username.");
  }

  if (!isValidUsername(username)) {
    throw new Error(USERNAME_HINT);
  }

  const { data: existingUsername, error: usernameLookupError } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (usernameLookupError) {
    // Profiles table may not exist until the SQL migration is applied.
    console.error("Username lookup failed:", usernameLookupError);
  } else if (existingUsername) {
    throw new Error("That username is already taken.");
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      data: {
        full_name: fullName,
        display_name: fullName,
        username,
        ...(referralCode && /^[A-Z0-9]{6,16}$/.test(referralCode)
          ? { referral_code: referralCode }
          : {}),
      },
    },
  });

  if (error) {
    throw new Error(getErrorMessage(error, "Unable to create your account."));
  }

  if (data.user && !data.session) {
    throw new Error(
      "Account created. Please check your email to confirm your address before signing in."
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(
      getErrorMessage(
        userError,
        "Account created, but the session could not be verified. Please sign in."
      )
    );
  }

  return { session: data.session, user };
}

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(getErrorMessage(error, "Unable to sign out."));
  }
}

export async function getAuthenticatedUser() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(getErrorMessage(error, "Unable to verify your session."));
  }

  return user;
}

/** Map auth user → profile. Does not call getUser() — safe inside onAuthStateChange. */
export async function getProfileForUser(user: User): Promise<UserProfile> {
  const supabase = createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Unable to load profile row:", profileError);
    // Fall back to auth metadata so the account menu still works when
    // the profiles query fails (RLS / migration), instead of looking signed out.
  } else if (profile) {
    return mapProfileRow(profile as ProfileRow);
  }

  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.display_name === "string"
        ? user.user_metadata.display_name
        : user.email?.split("@")[0] || "UMTUBA User";

  const username =
    typeof user.user_metadata?.username === "string"
      ? normalizeUsername(user.user_metadata.username)
      : `user_${user.id.slice(0, 8)}`;

  return {
    id: user.id,
    username,
    display_name: fullName,
    full_name: fullName,
    bio: null,
    city: null,
    country: null,
    avatar_url: null,
    avatar_initial: fullName.charAt(0).toUpperCase() || "U",
  };
}

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return null;
  }

  return getProfileForUser(user);
}
