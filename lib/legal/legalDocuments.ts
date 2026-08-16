/**
 * Shared Legal Pages V1 constants and document bodies (English primary).
 * Structured for future localization without inventing unverified entity details.
 */

export const LEGAL_EFFECTIVE_DATE = "19 July 2026";
export const LEGAL_LAST_UPDATED = "13 August 2026";

export const LEGAL_BETA_NOTICE =
  "This document is a general Beta soft-launch statement for UMTUBA. It is not a substitute for specialized legal counsel. Before a wider commercial launch, have qualified counsel review and adapt these terms for your jurisdictions and operating model.";

export const LEGAL_CONTACT_LINE =
  "Questions about these documents may be sent through the UMTUBA Support page at /support.";

export type LegalSection = {
  id: string;
  title: string;
  /** Intro paragraphs shown before optional bullets. */
  paragraphs: string[];
  bullets?: string[];
  /** Paragraphs shown after bullets (optional). */
  closingParagraphs?: string[];
};

export const TERMS_SECTIONS: LegalSection[] = [
  {
    id: "acceptance",
    title: "Acceptance of these Terms",
    paragraphs: [
      "By creating an account, accessing, or using UMTUBA (the “Service”), you agree to these Terms of Use (“Terms”). If you do not agree, do not use the Service.",
      "These Terms apply to the Beta and publicly available features of UMTUBA as they exist today. Features may change, appear unfinished, or be limited during Beta.",
    ],
  },
  {
    id: "eligibility",
    title: "Eligibility and age",
    paragraphs: [
      "You must be able to form a binding agreement where you live to use UMTUBA.",
      "If you are under the age of digital consent or majority that applies where you live, you may use the Service only with permission and appropriate supervision from a parent or legal guardian, to the extent required by applicable law. Parents and guardians are responsible for monitoring a minor’s use of the Service.",
      "Do not use UMTUBA if applicable law prohibits you from doing so.",
    ],
  },
  {
    id: "accounts",
    title: "Accounts and security",
    paragraphs: [
      "You are responsible for the accuracy of information you provide and for keeping your login credentials confidential.",
      "Notify us promptly through the Support page at /support if you believe your account has been compromised.",
      "We may refuse, suspend, or limit accounts that appear abusive, unsafe, fraudulent, or in violation of these Terms.",
    ],
  },
  {
    id: "user-content",
    title: "Your content",
    paragraphs: [
      "You retain ownership of content you create and submit to UMTUBA, including videos, images, audio, text, comments, messages, live streams, stories, product listings you are authorized to publish, and similar materials (“User Content”), subject to the licenses below and any rights of others.",
      "You are solely responsible for User Content you submit and for ensuring you have all rights needed to post it.",
    ],
  },
  {
    id: "license",
    title: "License you grant to UMTUBA",
    paragraphs: [
      "To operate, host, display, distribute, promote, and improve the Service, you grant UMTUBA a worldwide, non-exclusive, royalty-free license to use, host, store, reproduce, adapt (for technical formats), publicly perform, publicly display, communicate, and distribute your User Content on and through the Service and related channels that make the Service work (including CDNs and media infrastructure).",
      "This license is limited to operating and improving UMTUBA. It does not transfer ownership of your User Content to us.",
      "You can remove some User Content using in-product controls where available; residual copies may remain in backups or caches for a limited time as described in the Privacy Policy.",
    ],
  },
  {
    id: "conduct",
    title: "Community rules and prohibited content",
    paragraphs: [
      "You agree not to use UMTUBA to:",
    ],
    bullets: [
      "Harass, threaten, exploit, or harm others, including minors",
      "Post illegal content, or content that promotes violent crime or terrorism",
      "Share non-consensual intimate imagery, extreme pornography involving minors (which is strictly forbidden), or sexually exploitative material",
      "Infringe intellectual property, privacy, or publicity rights",
      "Spread malware, scams, phishing, or deceptive impersonation",
      "Spam, manipulate engagement metrics, or interfere with platform security",
      "Attempt unauthorized access to accounts, systems, or other users’ data",
      "Violate applicable laws or regulations",
    ],
  },
  {
    id: "live-messages",
    title: "Live, messaging, and community features",
    paragraphs: [
      "Live streaming, direct messages, comments, reactions, and similar features are provided to enable social interaction. They are not private in an absolute sense: moderators, hosts, recipients, and technical operators may have access as needed to run and secure the Service.",
      "Do not assume end-to-end encryption for messages or live sessions unless UMTUBA explicitly documents that a specific feature uses it. Today’s Beta messaging and live tooling are not described as end-to-end encrypted.",
      "Hosts and participants must follow community rules. We may remove content, end streams, mute participants, or restrict features to protect safety and integrity.",
    ],
  },
  {
    id: "um-points",
    title: "UM Points and rewards",
    paragraphs: [
      "UM Points and similar in-product rewards are internal loyalty or engagement units for use inside UMTUBA features. They are not money, bank deposits, securities, or cryptocurrency, and they generally have no cash value outside the Service unless we expressly state otherwise in a separate, clear offer.",
      "We may change earning rules, balances display, or reward programs, and may reverse points granted in error or through abuse.",
    ],
  },
  {
    id: "store",
    title: "Store and future commerce features",
    paragraphs: [
      "UMTUBA may offer storefront, cart, marketplace, or advertising tools that are incomplete or limited during Beta. Listings, prices, availability, and fulfillment may be experimental.",
      "Unless a separate merchant or payment agreement says otherwise, UMTUBA does not guarantee sales outcomes, payment processing, shipping, or consumer statutory rights beyond what applicable law requires. Treat Beta commerce features as early access.",
    ],
  },
  {
    id: "ip",
    title: "Intellectual property and infringement reports",
    paragraphs: [
      "UMTUBA branding, software, design, and original platform materials are owned by their respective rights holders and are protected by intellectual property laws.",
      "If you believe content on UMTUBA infringes your rights, contact us through the Support page at /support with enough detail to identify the material and your claim. We may remove or restrict content while reviewing reports.",
    ],
  },
  {
    id: "suspension",
    title: "Suspension and termination",
    paragraphs: [
      "You may stop using UMTUBA at any time. To request deletion of your account and associated personal data, use the public account-deletion page at /account-deletion (also linked from Settings). You must sign in so we can verify the request is yours. Deletion is queued for processing and is not immediate.",
      "We may suspend or terminate access, remove content, or limit features if we reasonably believe you violated these Terms, created risk for others, or harmed the Service—subject to rights that cannot be waived under applicable law.",
    ],
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    paragraphs: [
      "UMTUBA is provided on an “as is” and “as available” basis during Beta. We do not promise uninterrupted, error-free, or completely secure operation.",
      "To the fullest extent permitted by law, we disclaim warranties that are not required to be given. Nothing in these Terms is intended to exclude or limit liability or rights that cannot be limited under applicable law (including certain consumer rights).",
    ],
  },
  {
    id: "liability",
    title: "Limitation of liability",
    paragraphs: [
      "To the fullest extent permitted by law, UMTUBA and its operators will not be liable for indirect, incidental, special, consequential, or punitive damages, or for lost profits, data, or goodwill, arising from your use of the Service.",
      "Where liability cannot be excluded, it is limited to the maximum extent permitted by applicable law. These limitations do not apply to liability that cannot be limited, such as liability for death or personal injury caused by negligence where such limitation is prohibited, or for fraud.",
    ],
  },
  {
    id: "changes",
    title: "Changes to the Service and Terms",
    paragraphs: [
      "We may update features, availability, and these Terms as UMTUBA evolves. When we make material changes, we will update the “Last updated” date and may provide additional notice in the product when practical.",
      "Continued use after changes become effective means you accept the updated Terms, except where applicable law requires a different process.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    paragraphs: [LEGAL_CONTACT_LINE],
  },
];

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    id: "overview",
    title: "Overview",
    paragraphs: [
      "This Privacy Policy explains what information UMTUBA processes when you use the Service, why we process it, and the choices available to you.",
      "It applies to the Beta experience described in our product and documentation. Practices may evolve as features mature.",
    ],
  },
  {
    id: "data-you-provide",
    title: "Information you provide",
    paragraphs: [
      "Depending on how you use UMTUBA, you may provide:",
    ],
    bullets: [
      "Account details such as email address and password (passwords are handled by our authentication provider; we do not store plaintext passwords)",
      "Profile information such as display name, username, bio, and avatar",
      "User Content: videos, images, audio, captions, comments, reactions, stories, and similar uploads",
      "Messages and live chat text you send to others",
      "Store or seller information you choose to submit when those features are available",
      "Support or feedback you send through the Support page at /support",
    ],
  },
  {
    id: "usage-device",
    title: "Usage, device, and log data",
    paragraphs: [
      "We may process technical and usage information such as approximate device type, browser or app version, language, referring pages, feature interactions, performance diagnostics, and security logs.",
      "IP addresses and similar network identifiers may be processed for security, abuse prevention, and basic localization.",
    ],
  },
  {
    id: "location",
    title: "Approximate location and discovery",
    paragraphs: [
      "Some discovery or “nearby” style features may use city, country, or other approximate location signals you provide or that can be inferred at a coarse level. UMTUBA’s documented nearby-live notifications are designed around approximate city matching—not precise continuous GPS tracking in the notification payload.",
      "Precise location, if ever collected for a specific feature, should only be used with appropriate disclosure and control in that feature. Do not assume precise tracking is enabled for every surface.",
    ],
  },
  {
    id: "permissions",
    title: "Camera, microphone, and notifications",
    paragraphs: [
      "Creating video, joining live stages, or enabling notifications may require device permissions (camera, microphone, notification prompts). Those permissions are controlled by your device OS; you can revoke them in system settings.",
      "We use those inputs to provide the feature you requested (for example, publishing a live stream or showing in-app alerts), not to claim unrelated background surveillance.",
    ],
  },
  {
    id: "purposes",
    title: "How we use information",
    paragraphs: [
      "We use information to:",
    ],
    bullets: [
      "Provide, operate, secure, and improve UMTUBA",
      "Authenticate accounts and prevent abuse or fraud",
      "Deliver feeds, live, messaging, notifications, search, and related features",
      "Process rewards such as UM Points according to product rules",
      "Personalize discovery in limited, documented ways (for example, watch signals used for recommendations infrastructure)",
      "Comply with legal obligations and enforce these policies",
      "Communicate service-related notices",
    ],
  },
  {
    id: "processors",
    title: "Service providers and infrastructure",
    paragraphs: [
      "UMTUBA relies on specialized providers to run the product. In particular, project code and documentation use:",
    ],
    bullets: [
      "Supabase — authentication, database, storage, and related backend services",
      "LiveKit — real-time media infrastructure for live experiences",
      "Hosting and delivery networks needed to serve the web application and media",
    ],
    closingParagraphs: [
      "These providers process data on our behalf under their terms and our configuration. We do not sell your personal information as a business model description in this Beta policy.",
    ],
  },
  {
    id: "sharing",
    title: "When we share information",
    paragraphs: [
      "We may share information with:",
    ],
    bullets: [
      "Other users, when you choose to publish content, profiles, comments, messages, or live participation that is visible to them",
      "Service providers who process data to operate UMTUBA (such as infrastructure vendors listed above)",
      "Authorities or third parties when required by law or to protect rights, safety, and security",
      "Successors in a reorganization, if applicable, subject to appropriate safeguards",
    ],
  },
  {
    id: "retention",
    title: "Retention and deletion",
    paragraphs: [
      "We retain information as long as needed to provide the Service, meet security and legal requirements, resolve disputes, and maintain backups.",
      "When you delete content or submit an account-deletion request, we aim to remove or de-identify associated personal data from active systems within a reasonable period after the request is processed, except where retention is required or permitted by law, or where residual copies remain temporarily in backups.",
    ],
  },
  {
    id: "account-deletion",
    title: "Account deletion",
    paragraphs: [
      "You can request deletion of your UMTUBA account and associated personal data on the public web page at /account-deletion. You can do this from any web browser. You do not need a mobile app. You must sign in so we can verify that the request belongs to your account.",
      "Submitting the form queues a deletion request. It does not delete the account immediately. After verification, we process the request: authentication and profile data, User Content you published and still control, engagement records, and similar personal data are removed or de-identified from active systems, except where retention is required.",
      "We may retain store/order and other financial records as required for tax, accounting, disputes, and law; limited security and abuse-prevention logs; copies of messages already delivered to other users (with your sender identity detached where the architecture supports it); and residual backup copies until those systems rotate.",
    ],
  },
  {
    id: "security",
    title: "Security",
    paragraphs: [
      "We use administrative, technical, and organizational measures designed to protect information. No method of transmission or storage is completely secure, and we cannot promise absolute security.",
    ],
  },
  {
    id: "rights",
    title: "Your rights and requests",
    paragraphs: [
      "Depending on where you live, you may have rights to access, correct, delete, or restrict certain personal data, or to object to certain processing.",
      "To make a request, use the account-deletion page at /account-deletion for account erasure, or the Support page at /support for other rights. We verify your identity before fulfilling a request. Some rights are limited by law or by the need to keep the Service secure and lawful.",
    ],
  },
  {
    id: "children",
    title: "Children and teens",
    paragraphs: [
      "UMTUBA is not directed at children who are too young to use social platforms under applicable law. Do not create an account for a child below the minimum age required where you live.",
      "If you believe we have collected personal information from a child in violation of applicable law, contact us through the Support page at /support so we can take appropriate steps.",
    ],
  },
  {
    id: "international",
    title: "International processing",
    paragraphs: [
      "UMTUBA may process and store information in countries other than where you live, including where our infrastructure providers operate. Where required, we rely on appropriate safeguards recognized by applicable law for such transfers.",
    ],
  },
  {
    id: "cookies",
    title: "Cookies and local storage",
    paragraphs: [
      "We use cookies, local storage, and similar technologies for essentials such as authentication sessions, security, preferences, and basic product functionality (for example, referral attribution cookies used in invite flows).",
      "You can control cookies through browser settings; disabling some cookies may break sign-in or features.",
    ],
  },
  {
    id: "changes",
    title: "Changes to this Privacy Policy",
    paragraphs: [
      "We may update this Privacy Policy as the Service evolves. We will revise the “Last updated” date and may provide in-product notice for material changes when practical.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    paragraphs: [LEGAL_CONTACT_LINE],
  },
];
