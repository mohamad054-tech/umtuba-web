/**
 * Public Support page copy — App Store Support URL surface.
 * Uses only live UMTUBA pathways (no invented mailbox).
 */

export const SUPPORT_PAGE_TITLE = "Support";

export const SUPPORT_PAGE_DESCRIPTION =
  "Get help with your UMTUBA account, privacy requests, safety reports, and product questions.";

export const SUPPORT_INTRO =
  "UMTUBA Support is the public contact surface for the UMTUBA apps and website. Use the pathways below — they are live production links, not placeholders.";

export const SUPPORT_SECTIONS = [
  {
    id: "contact",
    title: "Contact UMTUBA",
    paragraphs: [
      "For account, privacy, and data requests, use the signed-in account deletion request form. That is the authorized in-product contact pathway for erasure and related account help.",
      "For product policies, read Terms of Use and Privacy Policy. Questions about those documents may also be raised through this Support page.",
    ],
    links: [
      { hrefKey: "accountDeletion" as const, label: "Request account deletion" },
      { hrefKey: "privacy" as const, label: "Privacy Policy" },
      { hrefKey: "terms" as const, label: "Terms of Use" },
    ],
  },
  {
    id: "safety",
    title: "Safety and reporting",
    paragraphs: [
      "Signed-in users can report objectionable content and manage account controls from within the UMTUBA product surfaces where those tools are available.",
      "If you cannot access your account, use Forgot password on the login page, then return here for account-deletion or policy links.",
    ],
    links: [
      { hrefKey: "login" as const, label: "Log in / Forgot password" },
      { hrefKey: "accountDeletion" as const, label: "Account deletion" },
    ],
  },
  {
    id: "app-store",
    title: "App Store Support URL",
    paragraphs: [
      "This page (`https://umtuba.com/support`) is the intended public Support URL for App Store Connect and in-app Help destinations.",
    ],
    links: [],
  },
] as const;
