import type { Metadata } from "next";
import { buildPageMetadata } from "./metadata";
import { BRAND, DEFAULT_DESCRIPTION, DEFAULT_TITLE } from "./brand";

/** Shared route metadata objects for pages and thin layouts. */

export const landingMetadata: Metadata = {
  ...buildPageMetadata({
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    path: "/",
    index: "index",
  }),
  // Home uses the absolute default title (no `%s | UMTUBA` suffix).
  title: { absolute: DEFAULT_TITLE },
};

export const discoverMetadata = buildPageMetadata({
  title: "Discover",
  description: `Discover creators and videos on ${BRAND.name}. ${BRAND.tagline}.`,
  path: "/discover",
  index: "index",
});

export const liveMetadata = buildPageMetadata({
  title: "Live",
  description: `Watch and join live moments on ${BRAND.name}. ${BRAND.tagline}.`,
  path: "/live",
  index: "index",
});

export const watchMetadata = buildPageMetadata({
  title: "Watch",
  description: `Watch videos on ${BRAND.name}. ${BRAND.tagline}.`,
  path: "/watch",
  index: "index",
});

export const postJourneyMetadata = buildPageMetadata({
  title: "Post Journey",
  description: `See where a post travels on ${BRAND.name}. ${BRAND.tagline}.`,
  path: "/post-journey",
  index: "index",
});

export const messagesMetadata = buildPageMetadata({
  title: "Messages",
  description: `Your ${BRAND.name} messages.`,
  path: "/messages",
  index: "noindex",
});

export const notificationsMetadata = buildPageMetadata({
  title: "Notifications",
  description: `Your ${BRAND.name} notifications.`,
  path: "/notifications",
  index: "noindex",
});

export const rewardsMetadata = buildPageMetadata({
  title: "Rewards",
  description: `Your ${BRAND.name} rewards.`,
  path: "/rewards",
  index: "noindex",
});

export const savedMetadata = buildPageMetadata({
  title: "Saved",
  description: `Your saved content on ${BRAND.name}.`,
  path: "/saved",
  index: "noindex",
});

export const createVideoMetadata = buildPageMetadata({
  title: "Create video",
  description: `Create and share a video on ${BRAND.name}.`,
  path: "/create/video",
  index: "noindex",
});

export const settingsMetadata = buildPageMetadata({
  title: "Settings",
  description: `Manage your ${BRAND.name} account settings.`,
  path: "/settings",
  index: "noindex",
});

export const loginMetadata = buildPageMetadata({
  title: "Log in",
  description: `Log in to ${BRAND.name}.`,
  path: "/login",
  index: "noindex",
});

export const signupMetadata = buildPageMetadata({
  title: "Sign up",
  description: `Create your ${BRAND.name} account. ${BRAND.tagline}.`,
  path: "/signup",
  index: "noindex",
});

export const registerMetadata = buildPageMetadata({
  title: "Register",
  description: `Create your ${BRAND.name} account. ${BRAND.tagline}.`,
  path: "/register",
  index: "noindex",
});

export const forgotPasswordMetadata = buildPageMetadata({
  title: "Forgot password",
  description: `Reset your ${BRAND.name} password.`,
  path: "/forgot-password",
  index: "noindex",
});

export const updatePasswordMetadata = buildPageMetadata({
  title: "Update password",
  description: `Choose a new ${BRAND.name} password.`,
  path: "/auth/update-password",
  index: "noindex",
});

export const inviteMetadataBase = {
  titlePrefix: `Join ${BRAND.name}`,
  description: `Create your ${BRAND.name} account with an invite. ${BRAND.tagline}. ${BRAND.mission}`,
} as const;
