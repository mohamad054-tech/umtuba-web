import { LEGAL_PLACEHOLDERS, type LegalSection } from "./constants";

const { entityName, registeredAddress, legalEmail, governingLaw } =
  LEGAL_PLACEHOLDERS;

export const TERMS_TITLE = "Terms of Service";

export const TERMS_INTRO =
  "These Terms of Service (“Terms”) govern access to and use of the UMTUBA platform, including websites, apps, and related services (collectively, the “Service”). By creating an account or using the Service, you agree to these Terms.";

export const TERMS_SECTIONS: LegalSection[] = [
  {
    id: "about",
    title: "About UMTUBA",
    paragraphs: [
      "UMTUBA is a social platform for discovering creators, videos, live moments, stories, messaging, storefronts, and related community features under the brand mission “Ideas Without Borders.”",
      `The Service is operated by ${entityName}, with registered address at ${registeredAddress}. Contact for legal notices: ${legalEmail}.`,
    ],
  },
  {
    id: "eligibility",
    title: "Eligibility",
    paragraphs: [
      "You may use the Service only if you can form a binding contract with us and are not barred from using the Service under applicable law.",
      "You must provide accurate registration information and keep it up to date.",
    ],
  },
  {
    id: "age",
    title: "Age Requirements",
    paragraphs: [
      "You must meet the minimum age required by law in your country to use the Service. Where local law requires parental consent for minors, you represent that such consent has been obtained.",
      "Features that involve advertising, marketplace activity, or adult-oriented content may impose higher age floors. We may restrict or refuse access when age requirements are not met.",
    ],
  },
  {
    id: "accounts",
    title: "User Accounts",
    paragraphs: [
      "You are responsible for activity under your account. Usernames and profile information must not impersonate others or mislead the public.",
      "One person or organization should not create accounts primarily to evade enforcement, spam, or manipulate rankings.",
    ],
  },
  {
    id: "security",
    title: "Account Security",
    paragraphs: [
      "Keep your password confidential and use a strong, unique password. Notify us promptly if you suspect unauthorized access.",
      "We may require additional verification for sensitive account actions.",
    ],
  },
  {
    id: "user-content",
    title: "User Content",
    paragraphs: [
      "You retain ownership of content you upload (videos, stories, live streams, messages, product listings, creatives, and similar materials), subject to the licenses below and third-party rights.",
      "You are solely responsible for your content and for obtaining all rights needed to post it.",
    ],
  },
  {
    id: "license",
    title: "Content License",
    paragraphs: [
      "By posting content, you grant UMTUBA a worldwide, non-exclusive, royalty-free license to host, store, reproduce, adapt for technical delivery, display, and distribute that content on the Service, for as long as needed to operate, improve, and promote the Service.",
      "This license ends when your content is deleted from our systems, except for reasonable residual copies in backups or caches and uses already made under these Terms.",
    ],
  },
  {
    id: "community",
    title: "Community Rules",
    paragraphs: [
      "Be respectful. Do not harass, threaten, dox, or encourage harm. Do not spam, scrape abusively, or interfere with platform integrity.",
      "Follow applicable laws and respect intellectual property, privacy, and publicity rights of others.",
    ],
  },
  {
    id: "prohibited",
    title: "Prohibited Content",
    paragraphs: [
      "You may not post or transmit content that is illegal, exploitative of minors, non-consensual intimate imagery, terrorist propaganda, malware, or content that facilitates fraud, scams, or trafficking.",
      "We may remove content and restrict accounts that violate these rules or create severe risk to users or the Service.",
    ],
  },
  {
    id: "child-safety",
    title: "Child Safety",
    paragraphs: [
      "Child sexual exploitation and abuse material is strictly prohibited. We report apparent CSAM to the appropriate authorities as required by law.",
      "Advertising, targeting, and marketplace features must respect teen and minor safety rules described in our product policies and applicable law.",
    ],
  },
  {
    id: "reporting",
    title: "Reporting & Moderation",
    paragraphs: [
      "Users may report content or accounts that appear to violate these Terms. We may review reports, remove content, limit distribution, suspend accounts, or take other actions we reasonably believe are appropriate.",
      "Moderation decisions may be automated or human-assisted. Appeals processes, where offered, will be described in-product or by support.",
    ],
  },
  {
    id: "video",
    title: "Video Uploads",
    paragraphs: [
      "Uploaded videos must comply with these Terms and any format, size, and duration limits we publish.",
      "We may process media for delivery (transcoding, thumbnails, signed playback) and may remove videos that fail review or violate policy.",
    ],
  },
  {
    id: "live",
    title: "Live Streaming",
    paragraphs: [
      "Hosts are responsible for live room content, guest permissions, and compliance with local broadcast and safety rules.",
      "We may end streams, restrict visibility, or suspend hosts for violations, abuse, or technical misuse.",
    ],
  },
  {
    id: "stories",
    title: "Stories",
    paragraphs: [
      "Stories may expire automatically after a limited period. Visibility may be limited (for example, followers-only) as described in-product.",
      "Do not use Stories to circumvent content rules that apply to other surfaces.",
    ],
  },
  {
    id: "messages",
    title: "Messages",
    paragraphs: [
      "Direct messages are for personal communication. Do not use messaging for spam, phishing, harassment, or illegal solicitation.",
      "We may access message metadata or content when required for safety, abuse investigation, legal process, or Service operation, as described in the Privacy Policy.",
    ],
  },
  {
    id: "store",
    title: "Store & Sellers",
    paragraphs: [
      "Sellers must provide accurate product information, honor applicable consumer laws, and only list items they are permitted to sell.",
      "UMTUBA is not the seller of record for third-party store listings unless expressly stated. Disputes between buyers and sellers should first be addressed between those parties, subject to any marketplace rules we publish.",
    ],
  },
  {
    id: "advertisers",
    title: "Advertisers",
    paragraphs: [
      "Advertisers must comply with advertising policies, targeting restrictions (including teen safety), creative review requirements, and truth-in-advertising laws.",
      "Approval of an advertiser account, campaign, or creative does not waive our right to later suspend ads that violate policy or law. Delivery features may be disabled until we enable them.",
    ],
  },
  {
    id: "um-points",
    title: "UM Points",
    paragraphs: [
      "UM Points are a promotional loyalty benefit with no cash value unless we expressly say otherwise in a written program term.",
      "Points may be adjusted for error, abuse, or policy violations. Program rules may change with reasonable notice where required.",
    ],
  },
  {
    id: "ip",
    title: "Intellectual Property",
    paragraphs: [
      "UMTUBA branding, software, and design are owned by us or our licensors. You may not copy or reverse engineer the Service except as allowed by law.",
      `If you believe content infringes your rights, contact ${legalEmail} with sufficient detail for us to investigate.`,
    ],
  },
  {
    id: "suspension",
    title: "Account Suspension",
    paragraphs: [
      "We may suspend access when we reasonably believe an account poses risk, violates these Terms, or is required by law or a valid legal request.",
      "During suspension, some features may be unavailable while we review the account.",
    ],
  },
  {
    id: "termination",
    title: "Account Termination",
    paragraphs: [
      "You may stop using the Service and request account deletion through available in-product flows or by contacting support/legal channels when published.",
      "We may terminate accounts for severe or repeated violations. Provisions that by nature should survive (including IP, liability limits, and governing law) will survive termination.",
    ],
  },
  {
    id: "liability",
    title: "Limitation of Liability",
    paragraphs: [
      `To the fullest extent permitted by law, UMTUBA and ${entityName} will not be liable for indirect, incidental, special, consequential, or punitive damages, or for lost profits, data, or goodwill arising from your use of the Service.`,
      "Our aggregate liability for claims relating to the Service is limited to the greater of fees you paid us for the Service in the twelve months before the claim (if any) or a minimum amount required by applicable law.",
    ],
  },
  {
    id: "disclaimer",
    title: "Disclaimer",
    paragraphs: [
      "THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT, EXCEPT WHERE SUCH DISCLAIMERS ARE PROHIBITED.",
      "We do not guarantee uninterrupted or error-free operation, or that content will always be available or suitable for every audience.",
    ],
  },
  {
    id: "changes",
    title: "Changes to Terms",
    paragraphs: [
      "We may update these Terms from time to time. Material changes will be indicated by updating the “Last updated” date and, where appropriate, providing additional notice.",
      "Continued use after the effective date of changes constitutes acceptance of the updated Terms, except where local law requires a different process.",
    ],
  },
  {
    id: "governing-law",
    title: "Governing Law",
    paragraphs: [
      `These Terms are governed by the laws of ${governingLaw}, without regard to conflict-of-law principles, except where mandatory local consumer protections apply.`,
      "Dispute resolution venue and procedures will be confirmed when legal entity details are finalized.",
    ],
  },
  {
    id: "contact",
    title: "Legal Contact",
    paragraphs: [
      `For legal notices related to these Terms, contact ${legalEmail}.`,
      `Operator: ${entityName}. Address: ${registeredAddress}.`,
      "This document is a Draft for legal review and is not final legal advice.",
    ],
  },
];
