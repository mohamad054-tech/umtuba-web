import { createClient } from "./client";

export type UserProfile = {
  id: string;
  full_name: string;
  username: string;
  avatar_initial: string;
};

function getAuthErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: unknown }).message).trim();

    if (message) {
      return message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    throw new Error(getAuthErrorMessage(error, "Unable to sign in."));
  }

  // Prefer getUser() over trusting the sign-in payload alone for identity checks.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error(
      getAuthErrorMessage(userError, "Signed in, but the session could not be verified.")
    );
  }

  return { session: data.session, user };
}

export async function signUpWithEmail(input: {
  email: string;
  password: string;
  fullName: string;
  username: string;
}) {
  const supabase = createClient();
  const email = input.email.trim();
  const fullName = input.fullName.trim();
  const username = input.username.trim().replace(/^@/, "").toLowerCase();

  if (!fullName) {
    throw new Error("Please enter your full name.");
  }

  if (!username) {
    throw new Error("Please choose a username.");
  }

  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    throw new Error(
      "Username must be 3–24 characters and use only letters, numbers, or underscores."
    );
  }

  const { data: existingUsername, error: usernameLookupError } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (usernameLookupError) {
    // Profiles table may not exist until the SQL migration is applied.
    // Continue and let signup/trigger surface a clearer error if needed.
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
        username,
      },
    },
  });

  if (error) {
    throw new Error(getAuthErrorMessage(error, "Unable to create your account."));
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
      getAuthErrorMessage(
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
    throw new Error(getAuthErrorMessage(error, "Unable to sign out."));
  }
}

export async function getAuthenticatedUser() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(getAuthErrorMessage(error, "Unable to verify your session."));
  }

  return user;
}

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(getAuthErrorMessage(userError, "Unable to verify your session."));
  }

  if (!user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_initial")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(
      getAuthErrorMessage(profileError, "Unable to load your profile.")
    );
  }

  if (profile) {
    return profile as UserProfile;
  }

  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : user.email?.split("@")[0] || "UMTUBA User";

  const username =
    typeof user.user_metadata?.username === "string"
      ? user.user_metadata.username
      : `user_${user.id.slice(0, 8)}`;

  return {
    id: user.id,
    full_name: fullName,
    username,
    avatar_initial: fullName.charAt(0).toUpperCase() || "U",
  };
}
