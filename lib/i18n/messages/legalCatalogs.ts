/**
 * Legal page copy. English is the source locale.
 * Arabic is the supplied translation. Other catalogs reuse English until supplied.
 */

import {
  OPERATOR_STATEMENT_AR,
  OPERATOR_STATEMENT_EN,
  PRIVACY_CONTROLLER_AR,
  PRIVACY_CONTROLLER_EN,
  REGISTERED_OFFICE_AR,
  REGISTERED_OFFICE_EN,
  TERMS_AGREEMENT_AR,
  TERMS_AGREEMENT_EN,
  TERMS_BODY_AR,
  TERMS_BODY_EN,
} from "../../legal/company";

export const legalEnMessages = {
  "legal.draftBanner":
    "DRAFT — pending legal review. Not yet binding.",
  "legal.translationDisclaimer":
    "This is a translation provided for convenience. In case of conflict, the English version prevails.",
  "legal.lastUpdatedLabel": "Last updated:",
  "legal.lastUpdatedValue": "13 September 2026",
  "legal.effectiveLabel": "Effective:",
  "legal.effectiveValue": "on public launch",
  "legal.eyebrow": "Legal",
  "legal.navAria": "Legal pages",

  "legal.footer.navAria": "Legal and company",
  "legal.footer.privacy": "Privacy",
  "legal.footer.terms": "Terms",
  "legal.footer.cookies": "Cookies",
  "legal.footer.community": "Community Guidelines",
  "legal.footer.copyright": "Copyright",
  "legal.footer.contact": "Contact",
  "legal.footer.about": "About",
  "legal.footer.delete": "Delete account",
  "legal.footer.export": "Export data",
  "legal.footer.operator": OPERATOR_STATEMENT_EN,

  "legal.meta.privacyTitle": "Privacy Policy",
  "legal.meta.privacyDescription": PRIVACY_CONTROLLER_EN,
  "legal.meta.termsTitle": "Terms of Service",
  "legal.meta.termsDescription": TERMS_AGREEMENT_EN,
  "legal.meta.cookiesTitle": "Cookie Policy",
  "legal.meta.cookiesDescription":
    "Cookies are small files stored on your device. We also use similar technologies such as local storage and device identifiers.",
  "legal.meta.communityTitle": "Community Guidelines",
  "legal.meta.communityDescription":
    "UMTUBA exists so ideas can cross borders. That only works if people are safe here.",
  "legal.meta.copyrightTitle": "Copyright and DMCA Policy",
  "legal.meta.copyrightDescription":
    "UMTUBA Limited respects intellectual property and expects its users to do the same.",
  "legal.meta.contactTitle": "Contact",
  "legal.meta.contactDescription":
    "Support and general enquiries: support@umtuba.com. Privacy and data requests: privacy@umtuba.com.",
  "legal.meta.aboutTitle": "About UMTUBA",
  "legal.meta.aboutDescription":
    "UMTUBA is a platform for sharing ideas across borders.",
  "legal.meta.deleteTitle": "Delete Your Account",
  "legal.meta.deleteDescription":
    "You can request deletion of your UMTUBA account at any time.",
  "legal.meta.exportTitle": "Export Your Data",
  "legal.meta.exportDescription":
    "You have the right to receive a copy of the personal data we hold about you, in a structured, machine-readable format (GDPR Article 20).",

  "legal.privacy.title": "Privacy Policy",
  "legal.privacy.who.title": "Who we are",
  "legal.privacy.who.p1": PRIVACY_CONTROLLER_EN,
  "legal.privacy.who.office": REGISTERED_OFFICE_EN,
  "legal.privacy.who.email": "Privacy contact: privacy@umtuba.com",
  "legal.privacy.collect.title": "What we collect",
  "legal.privacy.collect.direct": "You give us directly:",
  "legal.privacy.collect.direct.account":
    "Account data: username, display name, email address, password (stored hashed, never in readable form)",
  "legal.privacy.collect.direct.profile":
    "Profile data: photo, cover image, biography, website link, and optionally city and country",
  "legal.privacy.collect.direct.content":
    "Content: videos, images, text posts, comments, live streams, messages",
  "legal.privacy.collect.direct.comms":
    "Communications: anything you send to our support addresses",
  "legal.privacy.collect.auto": "Collected automatically:",
  "legal.privacy.collect.auto.tech":
    "Technical data: IP address, browser type, device type, operating system, language",
  "legal.privacy.collect.auto.usage":
    "Usage data: pages viewed, videos watched, interactions, session timing",
  "legal.privacy.collect.auto.cookies":
    "Cookies and similar technologies (see our Cookie Policy)",
  "legal.privacy.collect.third": "From third parties:",
  "legal.privacy.collect.third.pay":
    "Payment status from our payment processors (we never receive your full card number)",
  "legal.privacy.collect.third.store":
    "App install and crash data from Google Play and the Apple App Store",
  "legal.privacy.basis.title": "Why we use it, and our legal basis",
  "legal.privacy.basis.hPurpose": "Purpose",
  "legal.privacy.basis.hLaw": "Legal basis (GDPR Art. 6)",
  "legal.privacy.basis.r1c1": "Providing the service you signed up for",
  "legal.privacy.basis.r1c2": "Contract",
  "legal.privacy.basis.r2c1":
    "Keeping the platform safe; preventing abuse and fraud",
  "legal.privacy.basis.r2c2": "Legitimate interests",
  "legal.privacy.basis.r3c1": "Responding to your support requests",
  "legal.privacy.basis.r3c2": "Contract / Legitimate interests",
  "legal.privacy.basis.r4c1": "Improving the product and fixing faults",
  "legal.privacy.basis.r4c2": "Legitimate interests",
  "legal.privacy.basis.r5c1": "Sending optional marketing messages",
  "legal.privacy.basis.r5c2": "Consent",
  "legal.privacy.basis.r6c1": "Non-essential cookies and analytics",
  "legal.privacy.basis.r6c2": "Consent",
  "legal.privacy.basis.r7c1": "Complying with legal obligations",
  "legal.privacy.basis.r7c2": "Legal obligation",
  "legal.privacy.basis.withdraw":
    "You may withdraw consent at any time. Withdrawal does not affect processing carried out before withdrawal.",
  "legal.privacy.analytics.title": "Product analytics (draft)",
  "legal.privacy.analytics.p1":
    "If you accept optional analytics, we send usage events to PostHog, a product-analytics service hosted in the European Union (eu.i.posthog.com). Analytics stays off until you accept. If your browser sends a Do Not Track signal, we do not turn analytics on.",
  "legal.privacy.analytics.p2":
    "We record page views and named actions such as sign-up, login, video view/like/share, comments posted, posts published, games started or finished, store product views, course opens, searches (whether results were empty — not the search text), and reports submitted. After you sign in we identify you only by your account id. We do not send your email, name, phone number, or the text of posts, comments, or messages.",
  "legal.privacy.analytics.p3":
    "We keep the first advertising tags from your first visit (utm_source, utm_medium, utm_campaign) and the referring website, so we can later see which campaigns bring people who return. This wording is a draft for review and is not legal advice.",
  "analytics.consent.body":
    "Optional analytics (PostHog, EU). Off until you accept.",
  "analytics.consent.accept": "Accept",
  "analytics.consent.decline": "Decline",
  "analytics.consent.privacy": "Privacy",
  "analytics.consent.aria": "Analytics consent",
  "legal.privacy.location.title": "Location data",
  "legal.privacy.location.p1":
    "Location is optional. We do not track you continuously.",
  "legal.privacy.location.p2":
    "Profile city and country are **private by default**. They become visible to others only if you choose to publish them in your privacy settings.",
  "legal.privacy.location.p3":
    "Location attached to a post is separate: you choose it when publishing, and it is shown with that post.",
  "legal.privacy.share.title": "Who we share with",
  "legal.privacy.share.p1": "We do not sell your personal data.",
  "legal.privacy.share.intro": "We share with:",
  "legal.privacy.share.providers":
    "**Service providers** who process data on our instructions: hosting, storage, content delivery, email delivery, payment processing, crash reporting",
  "legal.privacy.share.users":
    "**Other users**, where you have chosen to publish content or profile information",
  "legal.privacy.share.authorities":
    "**Authorities**, where we are legally required to disclose",
  "legal.privacy.share.p2":
    "All processors are bound by written agreements requiring confidentiality and security measures equivalent to our own.",
  "legal.privacy.transfers.title": "International transfers",
  "legal.privacy.transfers.p1":
    "Some providers operate outside the European Economic Area. Where that happens, we rely on the European Commission's Standard Contractual Clauses or an adequacy decision. You may request a copy of the safeguards by writing to privacy@umtuba.com.",
  "legal.privacy.retain.title": "How long we keep it",
  "legal.privacy.retain.hData": "Data",
  "legal.privacy.retain.hHow": "Retention",
  "legal.privacy.retain.r1c1": "Account and profile",
  "legal.privacy.retain.r1c2": "While your account is open",
  "legal.privacy.retain.r2c1": "Content you publish",
  "legal.privacy.retain.r2c2": "While published, or until you delete it",
  "legal.privacy.retain.r3c1": "Content you delete",
  "legal.privacy.retain.r3c2":
    "Up to 30 days in soft-deleted state, then permanently removed",
  "legal.privacy.retain.r4c1": "Deleted accounts",
  "legal.privacy.retain.r4c2":
    "Up to 30 days, then removed except where law requires longer",
  "legal.privacy.retain.r5c1": "Server and security logs",
  "legal.privacy.retain.r5c2": "Up to 12 months",
  "legal.privacy.retain.r6c1": "Records of legal complaints and safety reports",
  "legal.privacy.retain.r6c2": "Up to 24 months",
  "legal.privacy.retain.r7c1": "Transaction and tax records",
  "legal.privacy.retain.r7c2": "6 years, as required by Irish law",
  "legal.privacy.rights.title": "Your rights",
  "legal.privacy.rights.intro": "Under the GDPR you have the right to:",
  "legal.privacy.rights.access":
    "**Access** the personal data we hold about you",
  "legal.privacy.rights.rectify":
    "**Rectify** inaccurate or incomplete data",
  "legal.privacy.rights.erase":
    "**Erase** your data (\"right to be forgotten\")",
  "legal.privacy.rights.restrict": "**Restrict** how we process your data",
  "legal.privacy.rights.port":
    "**Portability** — receive your data in a machine-readable format",
  "legal.privacy.rights.object":
    "**Object** to processing based on legitimate interests",
  "legal.privacy.rights.withdraw": "**Withdraw consent** at any time",
  "legal.privacy.rights.auto":
    "**Not be subject** to a solely automated decision with legal or similarly significant effects",
  "legal.privacy.rights.p1":
    "To exercise any of these, use the request forms in your account settings, or email privacy@umtuba.com. We respond within one month. That period may be extended by two further months for complex requests; we will tell you if that happens.",
  "legal.privacy.rights.p2":
    "If you are unhappy with our response, you may lodge a complaint with the Irish Data Protection Commission (dataprotection.ie) or the supervisory authority in your country of residence.",
  "legal.privacy.security.title": "Security",
  "legal.privacy.security.p1":
    "We use encryption in transit (HTTPS), access controls, database-level row and column permissions, and regular review of who can reach production systems. No system is completely secure; we will notify you and the relevant authority of a personal data breach where the law requires it.",
  "legal.privacy.children.title": "Children",
  "legal.privacy.children.p1":
    "UMTUBA is not directed at children under 16. We do not knowingly collect personal data from children under 16. If you believe a child has provided us with personal data, write to privacy@umtuba.com and we will delete it.",
  "legal.privacy.changes.title": "Changes",
  "legal.privacy.changes.p1":
    "We will post any changes on this page and update the date above. For significant changes we will notify you in the app or by email before they take effect.",

  "legal.terms.title": "Terms of Service",
  "legal.terms.s1.title": "1. Agreement",
  "legal.terms.s1.p1": TERMS_BODY_EN,
  "legal.terms.s1.p2":
    "By creating an account or using UMTUBA you accept these terms. If you do not accept them, do not use the service.",
  "legal.terms.s2.title": "2. Eligibility",
  "legal.terms.s2.p1":
    "You must be at least 16 years old. If the law where you live sets a higher minimum age for consenting to data processing, that higher age applies.",
  "legal.terms.s2.p2":
    "You may not use UMTUBA if you have previously been banned from it.",
  "legal.terms.s3.title": "3. Your account",
  "legal.terms.s3.p1":
    "You are responsible for keeping your password secure and for activity under your account. Tell us immediately at support@umtuba.com if you believe your account has been compromised.",
  "legal.terms.s3.p2":
    "Usernames must not impersonate another person or organisation, and must not be offensive or misleading.",
  "legal.terms.s4.title": "4. Your content",
  "legal.terms.s4.p1": "You keep ownership of everything you post.",
  "legal.terms.s4.p2":
    "By posting, you grant UMTUBA Limited a worldwide, non-exclusive, royalty-free licence to host, store, reproduce, adapt for technical formats, distribute and display your content **for the purpose of operating and promoting the service**. This licence ends when you delete the content, except for copies already shared by others and copies in backups pending routine deletion.",
  "legal.terms.s4.p3":
    "You confirm that you own your content or have the rights to post it, and that it does not infringe anyone else's rights.",
  "legal.terms.s5.title": "5. What you may not do",
  "legal.terms.s5.intro": "You may not:",
  "legal.terms.s5.b1":
    "Post content that is illegal, violent, hateful, sexually explicit, or that harasses or endangers another person",
  "legal.terms.s5.b2":
    "Post content sexualising, endangering, or exploiting a minor — this results in immediate permanent removal and, where applicable, a report to the authorities",
  "legal.terms.s5.b3":
    "Infringe copyright, trademarks, or other intellectual property",
  "legal.terms.s5.b4":
    "Impersonate anyone, or misrepresent your affiliation with a person or organisation",
  "legal.terms.s5.b5":
    "Spam, run manipulation schemes, or artificially inflate engagement",
  "legal.terms.s5.b6":
    "Attempt to access accounts, data, or systems you are not authorised to access",
  "legal.terms.s5.b7":
    "Scrape, crawl, or extract data at scale without our written permission",
  "legal.terms.s5.b8":
    "Interfere with the operation or security of the service",
  "legal.terms.s6.title": "6. Moderation",
  "legal.terms.s6.p1":
    "We may remove content and suspend or terminate accounts that breach these terms or our Community Guidelines.",
  "legal.terms.s6.p2":
    "Where we take action against your account, we will tell you the reason unless doing so would be unlawful or would compromise an investigation. You may appeal by writing to legal@umtuba.com.",
  "legal.terms.s7.title": "7. Learning",
  "legal.terms.s7.p1":
    "Courses on UMTUBA Learning are provided either by us or by third-party instructors. Where an instructor provides a course, they are responsible for its content and accuracy. Certificates issued through UMTUBA are not accredited academic qualifications unless stated otherwise.",
  "legal.terms.s8.title": "8. Store",
  "legal.terms.s8.p1":
    "Purchases made through the UMTUBA Store are contracts between you and the seller unless we are identified as the seller. Prices shown are the live catalogue prices; tax and delivery are calculated at checkout.",
  "legal.terms.s8.p2":
    "Under EU consumer law you generally have 14 days to withdraw from a distance purchase. This right does not apply to digital content you have started to access once you have agreed that access begins immediately.",
  "legal.terms.s9.title": "9. Payments",
  "legal.terms.s9.p1":
    "Payments are processed by third-party providers. We do not store your full payment card details.",
  "legal.terms.s10.title": "10. Availability",
  "legal.terms.s10.p1":
    "We aim to keep UMTUBA available, but we do not guarantee uninterrupted service. We may change, suspend, or discontinue features. Where a change materially affects you, we will give reasonable notice.",
  "legal.terms.s11.title": "11. Liability",
  "legal.terms.s11.p1":
    "Nothing in these terms limits liability for death or personal injury caused by negligence, for fraud, or for anything that cannot be limited under Irish law.",
  "legal.terms.s11.p2":
    "Subject to that, UMTUBA Limited is not liable for indirect or consequential loss, loss of profits, loss of data, or loss of goodwill. Our total liability in any 12-month period is limited to the greater of €100 or the amount you paid us in that period.",
  "legal.terms.s11.p3":
    "Nothing in these terms affects your statutory rights as a consumer.",
  "legal.terms.s12.title": "12. Termination",
  "legal.terms.s12.p1":
    "You may close your account at any time from your account settings.",
  "legal.terms.s12.p2":
    "We may suspend or terminate your account if you materially breach these terms, or if we are required to do so by law.",
  "legal.terms.s13.title": "13. Governing law",
  "legal.terms.s13.p1":
    "These terms are governed by the laws of Ireland. Disputes fall under the jurisdiction of the Irish courts. If you are a consumer resident in another EU member state, you keep the protection of the mandatory consumer law of your country and may bring proceedings there.",
  "legal.terms.s13.p2":
    "You may also use the European Commission's Online Dispute Resolution platform.",
  "legal.terms.s14.title": "14. Contact",
  "legal.terms.s14.p1": "legal@umtuba.com",

  "legal.cookies.title": "Cookie Policy",
  "legal.cookies.what.title": "What cookies are",
  "legal.cookies.what.p1":
    "Cookies are small files stored on your device. We also use similar technologies such as local storage and device identifiers. This policy covers all of them.",
  "legal.cookies.use.title": "What we use",
  "legal.cookies.use.necessary":
    "**Strictly necessary** — required for the service to work. These do not need your consent.",
  "legal.cookies.use.necessary.b1": "Session and authentication",
  "legal.cookies.use.necessary.b2": "Security and fraud prevention",
  "legal.cookies.use.necessary.b3": "Load balancing",
  "legal.cookies.use.necessary.b4": "Remembering your cookie choices",
  "legal.cookies.use.functional":
    "**Functional** — remember your preferences. Requires consent.",
  "legal.cookies.use.functional.b1": "Language selection",
  "legal.cookies.use.functional.b2": "Display and playback preferences",
  "legal.cookies.use.analytics":
    "**Analytics** — help us understand how the service is used. Requires consent.",
  "legal.cookies.use.analytics.b1": "Page and video views",
  "legal.cookies.use.analytics.b2": "Feature usage",
  "legal.cookies.use.analytics.b3": "Error and performance measurement",
  "legal.cookies.use.ads":
    "**Advertising** — we do not currently use advertising cookies. If that changes, we will update this policy and ask for your consent before setting any.",
  "legal.cookies.choices.title": "Your choices",
  "legal.cookies.choices.p1":
    "When you first visit, you can accept or reject non-essential cookies. You can change your choice at any time from Settings → Privacy.",
  "legal.cookies.choices.p2":
    "You can also block or delete cookies in your browser settings, though some features may stop working.",
  "legal.cookies.third.title": "Third parties",
  "legal.cookies.third.p1":
    "Some cookies are set by providers acting for us, including our hosting and storage provider and our analytics provider. They may not use them for their own purposes.",
  "legal.cookies.contact.title": "Contact",
  "legal.cookies.contact.p1": "privacy@umtuba.com",

  "legal.community.title": "Community Guidelines",
  "legal.community.intro":
    "UMTUBA exists so ideas can cross borders. That only works if people are safe here.",
  "legal.community.not.title": "Not allowed",
  "legal.community.not.minors":
    "**Content involving minors.** Nothing that sexualises, endangers or exploits anyone under 18. No exceptions, no context that makes it acceptable. We remove it immediately, permanently ban the account, and report it to the relevant authorities.",
  "legal.community.not.violence":
    "**Violence and dangerous behaviour.** No threats, no glorification of violence, no content encouraging self-harm, eating disorders, or dangerous challenges.",
  "legal.community.not.hate":
    "**Hate.** No attacks on people based on race, ethnicity, national origin, religion, disability, disease, gender, gender identity, sexual orientation, caste, or immigration status.",
  "legal.community.not.harass":
    "**Harassment.** No targeted abuse, no doxxing, no sharing private images without consent, no coordinated pile-ons.",
  "legal.community.not.adult":
    "**Adult content.** No pornography or sexually explicit material.",
  "legal.community.not.deception":
    "**Deception.** No impersonation, no scams, no manipulated media presented as real, no coordinated inauthentic behaviour.",
  "legal.community.not.illegal":
    "**Illegal goods.** No sale of drugs, weapons, counterfeit goods, stolen data, or regulated items without proper authorisation.",
  "legal.community.not.spam":
    "**Spam.** No bulk unsolicited messaging, no engagement farming, no artificial amplification.",
  "legal.community.not.ip":
    "**Intellectual property.** Do not post content you do not have the right to post.",
  "legal.community.break.title": "What happens when you break these rules",
  "legal.community.break.intro": "Depending on severity and history:",
  "legal.community.break.hAction": "Action",
  "legal.community.break.hWhen": "When",
  "legal.community.break.r1c1": "Content removed",
  "legal.community.break.r1c2": "First or minor breach",
  "legal.community.break.r2c1": "Reduced distribution",
  "legal.community.break.r2c2": "Repeated borderline content",
  "legal.community.break.r3c1": "Temporary suspension",
  "legal.community.break.r3c2": "Repeated or serious breach",
  "legal.community.break.r4c1": "Permanent ban",
  "legal.community.break.r4c2": "Severe breach, or repeated suspensions",
  "legal.community.break.p1":
    "Content involving minors, credible threats of violence, and coordinated harm go straight to permanent ban.",
  "legal.community.report.title": "Reporting",
  "legal.community.report.p1":
    "Use the report button on any content or profile, or write to legal@umtuba.com. We review every report. Reporting is confidential — the person you report is not told who reported them.",
  "legal.community.appeal.title": "Appeals",
  "legal.community.appeal.p1":
    "If you believe we made a mistake, write to legal@umtuba.com within 30 days. Tell us your username and what was removed. A different reviewer will look at it.",

  "legal.copyright.title": "Copyright and DMCA Policy",
  "legal.copyright.intro":
    "UMTUBA Limited respects intellectual property and expects its users to do the same.",
  "legal.copyright.report.title": "Reporting infringement",
  "legal.copyright.report.intro":
    "Send a notice to **dmca@umtuba.com** containing:",
  "legal.copyright.report.b1": "Your physical or electronic signature",
  "legal.copyright.report.b2":
    "Identification of the copyrighted work you claim has been infringed",
  "legal.copyright.report.b3":
    "The URL or other specific location of the material on UMTUBA",
  "legal.copyright.report.b4":
    "Your name, address, telephone number and email address",
  "legal.copyright.report.b5":
    "A statement that you have a good-faith belief that the use is not authorised by the copyright owner, its agent, or the law",
  "legal.copyright.report.b6":
    "A statement, under penalty of perjury, that the information in your notice is accurate and that you are the copyright owner or authorised to act on their behalf",
  "legal.copyright.report.p1": "Incomplete notices may be rejected.",
  "legal.copyright.do.title": "What we do",
  "legal.copyright.do.p1":
    "We review valid notices, remove or disable access to the material, and notify the user who posted it, including a copy of your notice.",
  "legal.copyright.counter.title": "Counter-notice",
  "legal.copyright.counter.intro":
    "If your content was removed and you believe this was a mistake or misidentification, send a counter-notice to dmca@umtuba.com containing:",
  "legal.copyright.counter.b1": "Your signature",
  "legal.copyright.counter.b2":
    "Identification of the removed material and where it appeared",
  "legal.copyright.counter.b3":
    "A statement under penalty of perjury that you believe in good faith the material was removed as a result of mistake or misidentification",
  "legal.copyright.counter.b4": "Your name, address and telephone number",
  "legal.copyright.counter.b5":
    "Consent to the jurisdiction of the courts of Ireland, or of your district if you are in the United States",
  "legal.copyright.counter.p1":
    "We may restore the material after 10 to 14 business days unless the original complainant informs us they have started court proceedings.",
  "legal.copyright.repeat.title": "Repeat infringers",
  "legal.copyright.repeat.p1":
    "Accounts that repeatedly infringe are terminated.",
  "legal.copyright.misuse.title": "Misuse",
  "legal.copyright.misuse.p1":
    "Knowingly filing a false notice may make you liable for damages. Please be sure before you file.",

  "legal.contact.title": "Contact",
  "legal.contact.support":
    "**Support and general enquiries:** support@umtuba.com",
  "legal.contact.privacy":
    "**Privacy and data requests:** privacy@umtuba.com",
  "legal.contact.legal":
    "**Legal and moderation appeals:** legal@umtuba.com",
  "legal.contact.copyright": "**Copyright:** dmca@umtuba.com",
  "legal.contact.company": OPERATOR_STATEMENT_EN,
  "legal.contact.office": REGISTERED_OFFICE_EN,
  "legal.contact.p1":
    "We aim to respond within 3 working days. Data protection requests are answered within one month, as required by the GDPR.",

  "legal.about.title": "About UMTUBA",
  "legal.about.p1": "UMTUBA is a platform for sharing ideas across borders.",
  "legal.about.p2":
    "It brings together short video, live streaming, messaging, personal pages, place discovery, courses, and a marketplace — in 13 languages.",
  "legal.about.p3": OPERATOR_STATEMENT_EN,
  "legal.about.principle":
    "**Our principle:** every idea deserves a chance to reach the world.",
  "legal.about.contact": "Contact: support@umtuba.com",

  "legal.delete.title": "Delete Your Account",
  "legal.delete.intro":
    "You can request deletion of your UMTUBA account at any time.",
  "legal.delete.what.title": "What gets deleted",
  "legal.delete.what.b1":
    "Your profile, including name, biography, photos and links",
  "legal.delete.what.b2": "Your posts, videos, images and comments",
  "legal.delete.what.b3": "Your messages",
  "legal.delete.what.b4": "Your follow relationships",
  "legal.delete.what.b5": "Your activity history and preferences",
  "legal.delete.keep.title": "What we keep, and why",
  "legal.delete.keep.b1":
    "**Transaction and tax records** — 6 years, required by Irish law",
  "legal.delete.keep.b2":
    "**Safety and moderation records** — up to 24 months, where an account was actioned for a serious breach, to prevent the same person returning",
  "legal.delete.keep.b3":
    "**Server logs** — up to 12 months, then automatically removed",
  "legal.delete.keep.b4":
    "**Content others have shared** — copies already reposted by other users remain with those users",
  "legal.delete.how.title": "How to request it",
  "legal.delete.how.signedIn":
    "**If you are signed in:** Settings → Account → Delete account.",
  "legal.delete.how.signedOut":
    "**If you cannot sign in:** email privacy@umtuba.com from the address registered to the account, with the subject \"Account deletion request\". We will verify your identity before acting.",
  "legal.delete.next.title": "What happens next",
  "legal.delete.next.b1": "We confirm your request by email",
  "legal.delete.next.b2":
    "Your account is deactivated immediately and is no longer visible to others",
  "legal.delete.next.b3":
    "There is a 14-day grace period during which you can cancel by signing in",
  "legal.delete.next.b4":
    "After 14 days, deletion is permanent and cannot be reversed",
  "legal.delete.next.b5": "We email you when deletion is complete",
  "legal.delete.questions.title": "Questions",
  "legal.delete.questions.p1": "privacy@umtuba.com",

  "legal.export.title": "Export Your Data",
  "legal.export.intro":
    "You have the right to receive a copy of the personal data we hold about you, in a structured, machine-readable format (GDPR Article 20).",
  "legal.export.includes.title": "What the export includes",
  "legal.export.includes.b1": "Profile information",
  "legal.export.includes.b2": "Your posts, including captions and metadata",
  "legal.export.includes.b3": "Your comments",
  "legal.export.includes.b4": "Your messages",
  "legal.export.includes.b5": "Your follows and followers",
  "legal.export.includes.b6": "Your account settings and preferences",
  "legal.export.includes.b7": "Your activity history",
  "legal.export.includes.p1":
    "Videos and images are included as files alongside a JSON index.",
  "legal.export.how.title": "How to request it",
  "legal.export.how.signedIn":
    "**If you are signed in:** Settings → Account → Export my data.",
  "legal.export.how.signedOut":
    "**If you cannot sign in:** email privacy@umtuba.com from the registered address with the subject \"Data export request\".",
  "legal.export.next.title": "What happens next",
  "legal.export.next.b1": "We confirm your request",
  "legal.export.next.b2":
    "We prepare the export — this usually takes a few days and may take up to one month",
  "legal.export.next.b3": "We email you a secure download link",
  "legal.export.next.b4": "The link expires after 7 days",
  "legal.export.format.title": "Format",
  "legal.export.format.p1":
    "A ZIP archive containing JSON files and your media. JSON is readable by common tools and can be imported elsewhere.",
  "legal.export.questions.title": "Questions",
  "legal.export.questions.p1": "privacy@umtuba.com",

  "legal.request.deleteHeading": "Request deletion",
  "legal.request.exportHeading": "Request export",
  "legal.request.signInDelete": "Sign in to request deletion",
  "legal.request.signInExport": "Sign in to request an export",
  "legal.request.signedInAs": "Signed in as {email}. This request applies only to that account.",
  "legal.request.acknowledgeDelete":
    "I understand this queues a deletion request for this UMTUBA account.",
  "legal.request.acknowledgeExport":
    "I understand this queues a data export request for this UMTUBA account.",
  "legal.request.typeDelete": "Type {phrase} to confirm",
  "legal.request.submitDelete": "Request account deletion",
  "legal.request.submitExport": "Request data export",
  "legal.request.submitting": "Submitting request...",
  "legal.request.queuedDelete":
    "Your deletion request is queued (status: {status}). Submitted {when}.",
  "legal.request.queuedExport":
    "Your export request is queued (status: {status}). Submitted {when}.",
} as const;

export type LegalMessages = {
  [K in keyof typeof legalEnMessages]: string;
};

export const legalArMessages: LegalMessages = {
  "legal.draftBanner":
    "مسودة — بانتظار المراجعة القانونية. غير ملزمة بعد.",
  "legal.translationDisclaimer":
    "هذه ترجمة للراحة. في حال أي تعارض، تسري النسخة الإنجليزية.",
  "legal.lastUpdatedLabel": "آخر تحديث:",
  "legal.lastUpdatedValue": "١٣ سبتمبر ٢٠٢٦",
  "legal.effectiveLabel": "تسري:",
  "legal.effectiveValue": "عند الإطلاق العام",
  "legal.eyebrow": "قانوني",
  "legal.navAria": "الصفحات القانونية",

  "legal.footer.navAria": "القانوني والشركة",
  "legal.footer.privacy": "الخصوصية",
  "legal.footer.terms": "الشروط",
  "legal.footer.cookies": "الكوكيز",
  "legal.footer.community": "إرشادات المجتمع",
  "legal.footer.copyright": "حقوق النشر",
  "legal.footer.contact": "تواصل",
  "legal.footer.about": "عن UMTUBA",
  "legal.footer.delete": "حذف الحساب",
  "legal.footer.export": "تصدير البيانات",
  "legal.footer.operator": OPERATOR_STATEMENT_AR,

  "legal.meta.privacyTitle": "سياسة الخصوصية",
  "legal.meta.privacyDescription": PRIVACY_CONTROLLER_AR,
  "legal.meta.termsTitle": "شروط الاستخدام",
  "legal.meta.termsDescription": TERMS_AGREEMENT_AR,
  "legal.meta.cookiesTitle": "سياسة ملفات تعريف الارتباط",
  "legal.meta.cookiesDescription":
    "ملفات صغيرة تُخزّن على جهازك. نستخدم أيضاً تقنيات مشابهة مثل التخزين المحلي ومعرّفات الأجهزة.",
  "legal.meta.communityTitle": "إرشادات المجتمع",
  "legal.meta.communityDescription":
    "وُجدت UMTUBA لتعبر الأفكار الحدود. وهذا لا ينجح إلا إذا كان الناس بأمان هنا.",
  "legal.meta.copyrightTitle": "سياسة حقوق النشر (DMCA)",
  "legal.meta.copyrightDescription":
    "تحترم UMTUBA Limited الملكية الفكرية وتتوقع من مستخدميها الالتزام نفسه.",
  "legal.meta.contactTitle": "تواصل معنا",
  "legal.meta.contactDescription":
    "الدعم والاستفسارات العامة: support@umtuba.com. الخصوصية وطلبات البيانات: privacy@umtuba.com.",
  "legal.meta.aboutTitle": "عن UMTUBA",
  "legal.meta.aboutDescription": "UMTUBA منصة لمشاركة الأفكار عبر الحدود.",
  "legal.meta.deleteTitle": "حذف حسابك",
  "legal.meta.deleteDescription":
    "يمكنك طلب حذف حسابك على UMTUBA في أي وقت.",
  "legal.meta.exportTitle": "تصدير بياناتك",
  "legal.meta.exportDescription":
    "لك الحق في الحصول على نسخة من بياناتك الشخصية لدينا، بصيغة منظّمة قابلة للقراءة آلياً (المادة ٢٠ من GDPR).",

  "legal.privacy.title": "سياسة الخصوصية",
  "legal.privacy.who.title": "من نحن",
  "legal.privacy.who.p1": PRIVACY_CONTROLLER_AR,
  "legal.privacy.who.office": REGISTERED_OFFICE_AR,
  "legal.privacy.who.email": "جهة الاتصال للخصوصية: privacy@umtuba.com",
  "legal.privacy.collect.title": "ما الذي نجمعه",
  "legal.privacy.collect.direct": "ما تعطينا إياه مباشرة:",
  "legal.privacy.collect.direct.account":
    "بيانات الحساب: اسم المستخدم، الاسم المعروض، البريد الإلكتروني، كلمة المرور (مخزّنة مشفّرة، ولا تُحفظ بصيغة مقروءة أبداً)",
  "legal.privacy.collect.direct.profile":
    "بيانات الملف الشخصي: الصورة، صورة الغلاف، النبذة، رابط الموقع، واختيارياً المدينة والدولة",
  "legal.privacy.collect.direct.content":
    "المحتوى: الفيديوهات، الصور، المنشورات النصية، التعليقات، البث المباشر، الرسائل",
  "legal.privacy.collect.direct.comms":
    "المراسلات: أي شيء ترسله إلى عناوين الدعم لدينا",
  "legal.privacy.collect.auto": "ما يُجمع تلقائياً:",
  "legal.privacy.collect.auto.tech":
    "بيانات تقنية: عنوان IP، نوع المتصفح، نوع الجهاز، نظام التشغيل، اللغة",
  "legal.privacy.collect.auto.usage":
    "بيانات الاستخدام: الصفحات المعروضة، الفيديوهات المشاهدة، التفاعلات، توقيت الجلسة",
  "legal.privacy.collect.auto.cookies":
    "ملفات تعريف الارتباط والتقنيات المشابهة (راجع سياسة الكوكيز)",
  "legal.privacy.collect.third": "من أطراف ثالثة:",
  "legal.privacy.collect.third.pay":
    "حالة الدفع من معالجي المدفوعات (لا نستلم رقم بطاقتك كاملاً أبداً)",
  "legal.privacy.collect.third.store":
    "بيانات التثبيت والأعطال من Google Play و Apple App Store",
  "legal.privacy.basis.title": "لماذا نستخدمها، والأساس القانوني",
  "legal.privacy.basis.hPurpose": "الغرض",
  "legal.privacy.basis.hLaw": "الأساس القانوني (المادة ٦ من GDPR)",
  "legal.privacy.basis.r1c1": "تقديم الخدمة التي سجّلت فيها",
  "legal.privacy.basis.r1c2": "العقد",
  "legal.privacy.basis.r2c1": "حماية المنصة ومنع الإساءة والاحتيال",
  "legal.privacy.basis.r2c2": "المصلحة المشروعة",
  "legal.privacy.basis.r3c1": "الرد على طلبات الدعم",
  "legal.privacy.basis.r3c2": "العقد / المصلحة المشروعة",
  "legal.privacy.basis.r4c1": "تحسين المنتج وإصلاح الأعطال",
  "legal.privacy.basis.r4c2": "المصلحة المشروعة",
  "legal.privacy.basis.r5c1": "إرسال رسائل تسويقية اختيارية",
  "legal.privacy.basis.r5c2": "الموافقة",
  "legal.privacy.basis.r6c1": "الكوكيز غير الضرورية والتحليلات",
  "legal.privacy.basis.r6c2": "الموافقة",
  "legal.privacy.basis.r7c1": "الامتثال للالتزامات القانونية",
  "legal.privacy.basis.r7c2": "الالتزام القانوني",
  "legal.privacy.basis.withdraw":
    "يمكنك سحب موافقتك في أي وقت. السحب لا يؤثر على المعالجة التي تمّت قبله.",
  "legal.privacy.analytics.title": "تحليلات المنتج (مسودة)",
  "legal.privacy.analytics.p1":
    "إذا وافقت على التحليلات الاختيارية، نرسل أحداث الاستخدام إلى PostHog، وهي خدمة تحليلات للمنتج مستضافة في الاتحاد الأوروبي (eu.i.posthog.com). تبقى التحليلات متوقفة حتى توافق. وإذا أرسل متصفحك إشارة «عدم التتبع» (Do Not Track)، لا نُفعّل التحليلات.",
  "legal.privacy.analytics.p2":
    "نسجّل مشاهدات الصفحات وإجراءات مسمّاة مثل بدء/إتمام التسجيل، وتسجيل الدخول، ومشاهدة/إعجاب/مشاركة الفيديو، ونشر تعليق، ونشر منشور، وبدء/إنهاء لعبة، وعرض منتج في المتجر، وفتح دورة، وإجراء بحث (هل كانت النتائج فارغة فقط — دون نص البحث)، وإرسال بلاغ. بعد تسجيل الدخول نعرّفك بمعرّف الحساب فقط. لا نرسل بريدك أو اسمك أو هاتفك أو نص المنشورات أو التعليقات أو الرسائل.",
  "legal.privacy.analytics.p3":
    "نحتفظ بأول وسوم إعلانية من زيارتك الأولى (utm_source وutm_medium وutm_campaign) وبالموقع المُحيل، حتى نتمكن لاحقاً من معرفة أي الحملات تجلب أشخاصاً يعودون. هذه الصياغة مسودة للمراجعة وليست استشارة قانونية.",
  "analytics.consent.body":
    "تحليلات اختيارية (PostHog في الاتحاد الأوروبي). متوقفة حتى توافق.",
  "analytics.consent.accept": "قبول",
  "analytics.consent.decline": "رفض",
  "analytics.consent.privacy": "الخصوصية",
  "analytics.consent.aria": "موافقة التحليلات",
  "legal.privacy.location.title": "بيانات الموقع الجغرافي",
  "legal.privacy.location.p1":
    "الموقع اختياري. لا نتتبّعك بشكل مستمر.",
  "legal.privacy.location.p2":
    "مدينة ودولة الملف الشخصي **خاصة افتراضياً**. لا تظهر للآخرين إلا إذا اخترت نشرها من إعدادات الخصوصية.",
  "legal.privacy.location.p3":
    "الموقع المرفق بمنشور شيء منفصل: أنت تختاره عند النشر، ويُعرض مع ذلك المنشور.",
  "legal.privacy.share.title": "مع من نشارك",
  "legal.privacy.share.p1": "**لا نبيع بياناتك الشخصية.**",
  "legal.privacy.share.intro": "نشارك مع:",
  "legal.privacy.share.providers":
    "**مزوّدي الخدمة** الذين يعالجون البيانات بتعليماتنا: الاستضافة، التخزين، شبكة توصيل المحتوى، إرسال البريد، معالجة المدفوعات، تقارير الأعطال",
  "legal.privacy.share.users":
    "**المستخدمين الآخرين**، فيما اخترت نشره من محتوى أو معلومات",
  "legal.privacy.share.authorities":
    "**السلطات**، حيث يُلزمنا القانون بالإفصاح",
  "legal.privacy.share.p2":
    "جميع المعالجين ملتزمون باتفاقيات مكتوبة تفرض السرية وإجراءات أمنية مكافئة لإجراءاتنا.",
  "legal.privacy.transfers.title": "النقل الدولي",
  "legal.privacy.transfers.p1":
    "بعض المزوّدين يعملون خارج المنطقة الاقتصادية الأوروبية. في هذه الحالات نعتمد على البنود التعاقدية القياسية للمفوضية الأوروبية أو على قرار كفاية. يمكنك طلب نسخة من الضمانات عبر privacy@umtuba.com.",
  "legal.privacy.retain.title": "مدة الاحتفاظ",
  "legal.privacy.retain.hData": "البيانات",
  "legal.privacy.retain.hHow": "المدة",
  "legal.privacy.retain.r1c1": "الحساب والملف الشخصي",
  "legal.privacy.retain.r1c2": "طالما الحساب مفتوح",
  "legal.privacy.retain.r2c1": "المحتوى المنشور",
  "legal.privacy.retain.r2c2": "طالما منشور، أو حتى تحذفه",
  "legal.privacy.retain.r3c1": "المحتوى المحذوف",
  "legal.privacy.retain.r3c2":
    "حتى ٣٠ يوماً بحالة محذوف مؤقتاً، ثم يُزال نهائياً",
  "legal.privacy.retain.r4c1": "الحسابات المحذوفة",
  "legal.privacy.retain.r4c2":
    "حتى ٣٠ يوماً، ثم تُزال إلا ما يفرض القانون بقاءه",
  "legal.privacy.retain.r5c1": "سجلات الخادم والأمان",
  "legal.privacy.retain.r5c2": "حتى ١٢ شهراً",
  "legal.privacy.retain.r6c1": "سجلات الشكاوى وبلاغات السلامة",
  "legal.privacy.retain.r6c2": "حتى ٢٤ شهراً",
  "legal.privacy.retain.r7c1": "السجلات المالية والضريبية",
  "legal.privacy.retain.r7c2": "٦ سنوات، حسب القانون الأيرلندي",
  "legal.privacy.rights.title": "حقوقك",
  "legal.privacy.rights.intro":
    "بموجب اللائحة الأوروبية لحماية البيانات، لك الحق في:",
  "legal.privacy.rights.access":
    "**الاطّلاع** على بياناتك الشخصية لدينا",
  "legal.privacy.rights.rectify":
    "**التصحيح** للبيانات غير الدقيقة أو الناقصة",
  "legal.privacy.rights.erase": "**المحو** (\"الحق في النسيان\")",
  "legal.privacy.rights.restrict": "**تقييد** معالجة بياناتك",
  "legal.privacy.rights.port":
    "**النقل** — استلام بياناتك بصيغة قابلة للقراءة آلياً",
  "legal.privacy.rights.object":
    "**الاعتراض** على المعالجة القائمة على المصلحة المشروعة",
  "legal.privacy.rights.withdraw": "**سحب الموافقة** في أي وقت",
  "legal.privacy.rights.auto":
    "**عدم الخضوع** لقرار آلي بالكامل له أثر قانوني أو مماثل",
  "legal.privacy.rights.p1":
    "لممارسة أي من هذه الحقوق، استخدم نماذج الطلب في إعدادات حسابك، أو راسل privacy@umtuba.com. نرد خلال شهر واحد. قد تُمدّد المدة شهرين إضافيين للطلبات المعقّدة، وسنخبرك إن حدث ذلك.",
  "legal.privacy.rights.p2":
    "إذا لم تكن راضياً عن ردّنا، يمكنك تقديم شكوى إلى **مفوضية حماية البيانات الأيرلندية** (dataprotection.ie) أو إلى السلطة الرقابية في بلد إقامتك.",
  "legal.privacy.security.title": "الأمان",
  "legal.privacy.security.p1":
    "نستخدم التشفير أثناء النقل (HTTPS)، وضوابط الوصول، وصلاحيات على مستوى الصفوف والأعمدة في قاعدة البيانات، ومراجعة دورية لمن يملك الوصول لأنظمة الإنتاج. لا يوجد نظام آمن تماماً؛ وسنبلّغك وتبلّغ السلطة المختصة عن أي اختراق للبيانات الشخصية حيث يفرض القانون ذلك.",
  "legal.privacy.children.title": "الأطفال",
  "legal.privacy.children.p1":
    "UMTUBA غير موجّهة للأطفال دون سن ١٦. لا نجمع عن علم بيانات شخصية من أطفال دون ١٦. إذا كنت تعتقد أن طفلاً زوّدنا ببيانات شخصية، راسل privacy@umtuba.com وسنحذفها.",
  "legal.privacy.changes.title": "التعديلات",
  "legal.privacy.changes.p1":
    "سننشر أي تعديلات على هذه الصفحة ونحدّث التاريخ أعلاه. وللتغييرات الجوهرية سنخطرك داخل التطبيق أو بالبريد الإلكتروني قبل سريانها.",

  "legal.terms.title": "شروط الاستخدام",
  "legal.terms.s1.title": "١. الاتفاقية",
  "legal.terms.s1.p1": TERMS_BODY_AR,
  "legal.terms.s1.p2":
    "بإنشاء حساب أو استخدام UMTUBA فإنك تقبل هذه الشروط. إن لم تقبلها، لا تستخدم الخدمة.",
  "legal.terms.s2.title": "٢. الأهلية",
  "legal.terms.s2.p1":
    "يجب أن يكون عمرك ١٦ سنة على الأقل. وإذا كان القانون في بلدك يحدد سناً أعلى للموافقة على معالجة البيانات، فالسن الأعلى هو المعتمد.",
  "legal.terms.s2.p2":
    "لا يجوز لك استخدام UMTUBA إذا سبق حظرك منها.",
  "legal.terms.s3.title": "٣. حسابك",
  "legal.terms.s3.p1":
    "أنت مسؤول عن الحفاظ على سرية كلمة مرورك وعن النشاط الحاصل من حسابك. أبلغنا فوراً على support@umtuba.com إن اعتقدت أن حسابك اختُرق.",
  "legal.terms.s3.p2":
    "يجب ألا ينتحل اسم المستخدم شخصية شخص أو جهة أخرى، وألا يكون مسيئاً أو مضلّلاً.",
  "legal.terms.s4.title": "٤. المحتوى الخاص بك",
  "legal.terms.s4.p1": "تبقى ملكية كل ما تنشره لك.",
  "legal.terms.s4.p2":
    "بنشرك للمحتوى، تمنح UMTUBA Limited ترخيصاً عالمياً غير حصري وبدون مقابل لاستضافة محتواك وتخزينه ونسخه وتكييفه للصيغ التقنية وتوزيعه وعرضه **لغرض تشغيل الخدمة والترويج لها**. ينتهي هذا الترخيص عند حذفك للمحتوى، باستثناء النسخ التي شاركها آخرون والنسخ الموجودة في النسخ الاحتياطية بانتظار الحذف الدوري.",
  "legal.terms.s4.p3":
    "تؤكد أنك تملك محتواك أو تملك حقوق نشره، وأنه لا ينتهك حقوق أي طرف آخر.",
  "legal.terms.s5.title": "٥. ما لا يجوز",
  "legal.terms.s5.intro": "لا يجوز لك:",
  "legal.terms.s5.b1":
    "نشر محتوى غير قانوني أو عنيف أو كراهي أو جنسي صريح، أو يتحرش بشخص أو يعرّضه للخطر",
  "legal.terms.s5.b2":
    "نشر محتوى يُجنسن أو يعرّض للخطر أو يستغل قاصراً — وهذا يؤدي إلى الإزالة الفورية والحظر الدائم والإبلاغ للسلطات حيثما ينطبق",
  "legal.terms.s5.b3":
    "انتهاك حقوق النشر أو العلامات التجارية أو أي ملكية فكرية",
  "legal.terms.s5.b4":
    "انتحال شخصية أحد، أو تحريف علاقتك بشخص أو جهة",
  "legal.terms.s5.b5":
    "إرسال رسائل مزعجة، أو تشغيل مخططات تلاعب، أو تضخيم التفاعل اصطناعياً",
  "legal.terms.s5.b6":
    "محاولة الوصول لحسابات أو بيانات أو أنظمة غير مصرّح لك بها",
  "legal.terms.s5.b7":
    "سحب أو استخراج البيانات بكميات كبيرة دون إذن كتابي منا",
  "legal.terms.s5.b8": "التدخل في تشغيل الخدمة أو أمنها",
  "legal.terms.s6.title": "٦. الإشراف",
  "legal.terms.s6.p1":
    "يجوز لنا إزالة المحتوى وتعليق أو إنهاء الحسابات المخالفة لهذه الشروط أو لإرشادات المجتمع.",
  "legal.terms.s6.p2":
    "عند اتخاذ إجراء ضد حسابك، سنخبرك بالسبب ما لم يكن ذلك مخالفاً للقانون أو يضر بتحقيق جارٍ. ويمكنك التظلّم عبر legal@umtuba.com.",
  "legal.terms.s7.title": "٧. قسم التعلّم",
  "legal.terms.s7.p1":
    "الدورات على UMTUBA Learning مقدّمة إما منّا أو من مدرّبين خارجيين. وحيث يقدّم مدرّب دورة، فهو المسؤول عن محتواها ودقتها. الشهادات الصادرة عبر UMTUBA ليست مؤهلات أكاديمية معتمدة ما لم يُنص على خلاف ذلك.",
  "legal.terms.s8.title": "٨. المتجر",
  "legal.terms.s8.p1":
    "المشتريات عبر متجر UMTUBA هي عقود بينك وبين البائع، ما لم نُذكر نحن كبائع. الأسعار المعروضة هي أسعار الكتالوج الحيّة؛ وتُحتسب الضريبة والتوصيل عند الدفع.",
  "legal.terms.s8.p2":
    "بموجب قانون المستهلك الأوروبي، لديك عموماً ١٤ يوماً للانسحاب من شراء عن بُعد. لا ينطبق هذا الحق على المحتوى الرقمي الذي بدأت الوصول إليه بعد موافقتك على بدء الوصول فوراً.",
  "legal.terms.s9.title": "٩. المدفوعات",
  "legal.terms.s9.p1":
    "تُعالج المدفوعات عبر مزوّدين خارجيين. ولا نخزّن بيانات بطاقتك كاملة.",
  "legal.terms.s10.title": "١٠. التوفّر",
  "legal.terms.s10.p1":
    "نسعى لإبقاء UMTUBA متاحة، لكننا لا نضمن خدمة بلا انقطاع. وقد نغيّر أو نعلّق أو نوقف ميزات. وحيث يؤثر التغيير عليك جوهرياً، سنمنحك إشعاراً معقولاً.",
  "legal.terms.s11.title": "١١. المسؤولية",
  "legal.terms.s11.p1":
    "لا شيء في هذه الشروط يحدّ من المسؤولية عن الوفاة أو الإصابة الشخصية الناتجة عن الإهمال، أو عن الاحتيال، أو عن أي أمر لا يمكن تحديده بموجب القانون الأيرلندي.",
  "legal.terms.s11.p2":
    "ومع مراعاة ذلك، لا تتحمل UMTUBA Limited المسؤولية عن الخسائر غير المباشرة أو التبعية، أو خسارة الأرباح أو البيانات أو السمعة التجارية. وتقتصر مسؤوليتنا الإجمالية في أي فترة ١٢ شهراً على الأكبر من ١٠٠ يورو أو المبلغ الذي دفعته لنا في تلك الفترة.",
  "legal.terms.s11.p3":
    "لا شيء في هذه الشروط يمس حقوقك القانونية كمستهلك.",
  "legal.terms.s12.title": "١٢. الإنهاء",
  "legal.terms.s12.p1":
    "يمكنك إغلاق حسابك في أي وقت من إعدادات الحساب.",
  "legal.terms.s12.p2":
    "ويجوز لنا تعليق أو إنهاء حسابك إذا خالفت هذه الشروط مخالفة جوهرية، أو إذا ألزمنا القانون بذلك.",
  "legal.terms.s13.title": "١٣. القانون الحاكم",
  "legal.terms.s13.p1":
    "تخضع هذه الشروط لقوانين أيرلندا، وتختص المحاكم الأيرلندية بالنزاعات. وإذا كنت مستهلكاً مقيماً في دولة أخرى بالاتحاد الأوروبي، تحتفظ بحماية قانون المستهلك الإلزامي في بلدك ويمكنك رفع الدعوى هناك.",
  "legal.terms.s13.p2":
    "ويمكنك أيضاً استخدام منصة تسوية المنازعات عبر الإنترنت التابعة للمفوضية الأوروبية.",
  "legal.terms.s14.title": "١٤. التواصل",
  "legal.terms.s14.p1": "legal@umtuba.com",

  "legal.cookies.title": "سياسة ملفات تعريف الارتباط",
  "legal.cookies.what.title": "ما هي الكوكيز",
  "legal.cookies.what.p1":
    "ملفات صغيرة تُخزّن على جهازك. نستخدم أيضاً تقنيات مشابهة مثل التخزين المحلي ومعرّفات الأجهزة. وتغطي هذه السياسة جميعها.",
  "legal.cookies.use.title": "ما نستخدمه",
  "legal.cookies.use.necessary":
    "**ضرورية تماماً** — لازمة لعمل الخدمة، ولا تحتاج موافقتك.",
  "legal.cookies.use.necessary.b1": "الجلسة والمصادقة",
  "legal.cookies.use.necessary.b2": "الأمان ومنع الاحتيال",
  "legal.cookies.use.necessary.b3": "توزيع الأحمال",
  "legal.cookies.use.necessary.b4": "تذكّر اختياراتك بشأن الكوكيز",
  "legal.cookies.use.functional":
    "**وظيفية** — لتذكّر تفضيلاتك. تحتاج موافقة.",
  "legal.cookies.use.functional.b1": "اختيار اللغة",
  "legal.cookies.use.functional.b2": "تفضيلات العرض والتشغيل",
  "legal.cookies.use.analytics":
    "**تحليلية** — لفهم كيفية استخدام الخدمة. تحتاج موافقة.",
  "legal.cookies.use.analytics.b1": "مشاهدات الصفحات والفيديوهات",
  "legal.cookies.use.analytics.b2": "استخدام الميزات",
  "legal.cookies.use.analytics.b3": "قياس الأخطاء والأداء",
  "legal.cookies.use.ads":
    "**إعلانية** — لا نستخدم كوكيز إعلانية حالياً. وإن تغيّر ذلك، سنحدّث هذه السياسة ونطلب موافقتك قبل وضع أي منها.",
  "legal.cookies.choices.title": "خياراتك",
  "legal.cookies.choices.p1":
    "عند أول زيارة، يمكنك قبول أو رفض الكوكيز غير الضرورية. ويمكنك تغيير اختيارك في أي وقت من الإعدادات ← الخصوصية.",
  "legal.cookies.choices.p2":
    "كما يمكنك حظر أو حذف الكوكيز من إعدادات متصفحك، مع العلم أن بعض الميزات قد تتوقف.",
  "legal.cookies.third.title": "أطراف ثالثة",
  "legal.cookies.third.p1":
    "بعض الكوكيز يضعها مزوّدون يعملون لحسابنا، منهم مزوّد الاستضافة والتخزين ومزوّد التحليلات. ولا يجوز لهم استخدامها لأغراضهم الخاصة.",
  "legal.cookies.contact.title": "التواصل",
  "legal.cookies.contact.p1": "privacy@umtuba.com",

  "legal.community.title": "إرشادات المجتمع",
  "legal.community.intro":
    "وُجدت UMTUBA لتعبر الأفكار الحدود. وهذا لا ينجح إلا إذا كان الناس بأمان هنا.",
  "legal.community.not.title": "ممنوع",
  "legal.community.not.minors":
    "**المحتوى المتعلق بالقاصرين.** لا شيء يُجنسن أو يعرّض للخطر أو يستغل أي شخص دون ١٨. بلا استثناءات، وبلا سياق يجعله مقبولاً. نزيله فوراً، ونحظر الحساب نهائياً، ونبلّغ السلطات المختصة.",
  "legal.community.not.violence":
    "**العنف والسلوك الخطر.** لا تهديدات، ولا تمجيد للعنف، ولا محتوى يشجّع على إيذاء النفس أو اضطرابات الأكل أو التحديات الخطرة.",
  "legal.community.not.hate":
    "**الكراهية.** لا هجوم على الناس بسبب العِرق أو الإثنية أو الأصل القومي أو الدين أو الإعاقة أو المرض أو الجنس أو الهوية الجندرية أو الميل الجنسي أو الطائفة أو الوضع الهجري.",
  "legal.community.not.harass":
    "**التحرش.** لا إساءة موجّهة، ولا نشر بيانات شخصية، ولا مشاركة صور خاصة بدون موافقة، ولا هجمات منسّقة.",
  "legal.community.not.adult":
    "**محتوى البالغين.** لا مواد إباحية أو جنسية صريحة.",
  "legal.community.not.deception":
    "**الخداع.** لا انتحال شخصية، ولا احتيال، ولا وسائط معدّلة تُقدّم كحقيقية، ولا سلوك منسّق غير أصيل.",
  "legal.community.not.illegal":
    "**السلع غير القانونية.** لا بيع مخدرات أو أسلحة أو سلع مقلّدة أو بيانات مسروقة أو مواد منظّمة بدون ترخيص.",
  "legal.community.not.spam":
    "**الإزعاج.** لا رسائل جماعية غير مطلوبة، ولا زراعة تفاعل، ولا تضخيم اصطناعي.",
  "legal.community.not.ip":
    "**الملكية الفكرية.** لا تنشر محتوى لا تملك حق نشره.",
  "legal.community.break.title": "ماذا يحدث عند المخالفة",
  "legal.community.break.intro": "حسب الخطورة والسجل:",
  "legal.community.break.hAction": "الإجراء",
  "legal.community.break.hWhen": "متى",
  "legal.community.break.r1c1": "إزالة المحتوى",
  "legal.community.break.r1c2": "مخالفة أولى أو بسيطة",
  "legal.community.break.r2c1": "تقليل الانتشار",
  "legal.community.break.r2c2": "محتوى حدّي متكرر",
  "legal.community.break.r3c1": "تعليق مؤقت",
  "legal.community.break.r3c2": "مخالفة متكررة أو خطيرة",
  "legal.community.break.r4c1": "حظر دائم",
  "legal.community.break.r4c2": "مخالفة جسيمة، أو تعليقات متكررة",
  "legal.community.break.p1":
    "المحتوى المتعلق بالقاصرين، والتهديدات الجدّية بالعنف، والأذى المنسّق — كلها تذهب مباشرة للحظر الدائم.",
  "legal.community.report.title": "الإبلاغ",
  "legal.community.report.p1":
    "استخدم زر الإبلاغ على أي محتوى أو ملف شخصي، أو راسل legal@umtuba.com. نراجع كل بلاغ. والإبلاغ سرّي — لا يُخبَر الشخص المبلَّغ عنه بهوية المُبلِّغ.",
  "legal.community.appeal.title": "التظلّم",
  "legal.community.appeal.p1":
    "إن اعتقدت أننا أخطأنا، راسل legal@umtuba.com خلال ٣٠ يوماً. أخبرنا باسم المستخدم وما تمت إزالته. وسيراجعه شخص مختلف.",

  "legal.copyright.title": "سياسة حقوق النشر (DMCA)",
  "legal.copyright.intro":
    "تحترم UMTUBA Limited الملكية الفكرية وتتوقع من مستخدميها الالتزام نفسه.",
  "legal.copyright.report.title": "الإبلاغ عن انتهاك",
  "legal.copyright.report.intro":
    "أرسل إشعاراً إلى **dmca@umtuba.com** يتضمن:",
  "legal.copyright.report.b1": "توقيعك المادي أو الإلكتروني",
  "legal.copyright.report.b2": "تحديد العمل المحمي الذي تدّعي انتهاكه",
  "legal.copyright.report.b3":
    "الرابط أو الموقع الدقيق للمادة على UMTUBA",
  "legal.copyright.report.b4":
    "اسمك وعنوانك ورقم هاتفك وبريدك الإلكتروني",
  "legal.copyright.report.b5":
    "إفادة بأنك تعتقد بحسن نية أن الاستخدام غير مصرّح به من صاحب الحق أو وكيله أو القانون",
  "legal.copyright.report.b6":
    "إفادة، تحت طائلة عقوبة شهادة الزور، بأن المعلومات في إشعارك دقيقة وأنك صاحب الحق أو مفوّض بالتصرف نيابة عنه",
  "legal.copyright.report.p1": "قد تُرفض الإشعارات الناقصة.",
  "legal.copyright.do.title": "ما نفعله",
  "legal.copyright.do.p1":
    "نراجع الإشعارات الصحيحة، ونزيل المادة أو نعطّل الوصول إليها، ونُخطر ناشرها مع نسخة من إشعارك.",
  "legal.copyright.counter.title": "الإشعار المضاد",
  "legal.copyright.counter.intro":
    "إذا أُزيل محتواك وتعتقد أن ذلك خطأ أو سوء تحديد، أرسل إشعاراً مضاداً إلى dmca@umtuba.com يتضمن:",
  "legal.copyright.counter.b1": "توقيعك",
  "legal.copyright.counter.b2":
    "تحديد المادة المُزالة ومكان ظهورها",
  "legal.copyright.counter.b3":
    "إفادة تحت طائلة عقوبة شهادة الزور بأنك تعتقد بحسن نية أن الإزالة كانت نتيجة خطأ أو سوء تحديد",
  "legal.copyright.counter.b4": "اسمك وعنوانك ورقم هاتفك",
  "legal.copyright.counter.b5":
    "موافقتك على اختصاص المحاكم الأيرلندية، أو محاكم منطقتك إن كنت في الولايات المتحدة",
  "legal.copyright.counter.p1":
    "وقد نعيد المادة بعد ١٠ إلى ١٤ يوم عمل، ما لم يُخطرنا المُشتكي الأصلي ببدء إجراءات قضائية.",
  "legal.copyright.repeat.title": "المخالفون المتكررون",
  "legal.copyright.repeat.p1":
    "تُنهى الحسابات التي تنتهك الحقوق بشكل متكرر.",
  "legal.copyright.misuse.title": "إساءة الاستخدام",
  "legal.copyright.misuse.p1":
    "تقديم إشعار كاذب عن علم قد يعرّضك للمسؤولية عن الأضرار. تأكّد قبل التقديم.",

  "legal.contact.title": "تواصل معنا",
  "legal.contact.support":
    "**الدعم والاستفسارات العامة:** support@umtuba.com",
  "legal.contact.privacy":
    "**الخصوصية وطلبات البيانات:** privacy@umtuba.com",
  "legal.contact.legal":
    "**القانوني وتظلّمات الإشراف:** legal@umtuba.com",
  "legal.contact.copyright": "**حقوق النشر:** dmca@umtuba.com",
  "legal.contact.company": OPERATOR_STATEMENT_AR,
  "legal.contact.office": REGISTERED_OFFICE_AR,
  "legal.contact.p1":
    "نسعى للرد خلال ٣ أيام عمل. وتُجاب طلبات حماية البيانات خلال شهر واحد، حسب ما تفرضه اللائحة الأوروبية.",

  "legal.about.title": "عن UMTUBA",
  "legal.about.p1": "UMTUBA منصة لمشاركة الأفكار عبر الحدود.",
  "legal.about.p2":
    "تجمع الفيديو القصير والبث المباشر والمراسلة والصفحات الشخصية واكتشاف الأماكن والدورات التعليمية والمتجر — بـ ١٣ لغة.",
  "legal.about.p3": OPERATOR_STATEMENT_AR,
  "legal.about.principle":
    "**مبدؤنا:** كل فكرة تستحق فرصة للوصول إلى العالم.",
  "legal.about.contact": "للتواصل: support@umtuba.com",

  "legal.delete.title": "حذف حسابك",
  "legal.delete.intro":
    "يمكنك طلب حذف حسابك على UMTUBA في أي وقت.",
  "legal.delete.what.title": "ما يُحذف",
  "legal.delete.what.b1":
    "ملفك الشخصي، بما فيه الاسم والنبذة والصور والروابط",
  "legal.delete.what.b2": "منشوراتك وفيديوهاتك وصورك وتعليقاتك",
  "legal.delete.what.b3": "رسائلك",
  "legal.delete.what.b4": "علاقات المتابعة",
  "legal.delete.what.b5": "سجل نشاطك وتفضيلاتك",
  "legal.delete.keep.title": "ما نحتفظ به، ولماذا",
  "legal.delete.keep.b1":
    "**السجلات المالية والضريبية** — ٦ سنوات، يفرضها القانون الأيرلندي",
  "legal.delete.keep.b2":
    "**سجلات السلامة والإشراف** — حتى ٢٤ شهراً، حيث اتُّخذ إجراء ضد حساب لمخالفة جسيمة، لمنع عودة الشخص نفسه",
  "legal.delete.keep.b3":
    "**سجلات الخادم** — حتى ١٢ شهراً، ثم تُزال تلقائياً",
  "legal.delete.keep.b4":
    "**المحتوى الذي شاركه آخرون** — النسخ التي أعاد نشرها مستخدمون آخرون تبقى لديهم",
  "legal.delete.how.title": "كيف تطلبه",
  "legal.delete.how.signedIn":
    "**إن كنت مسجّل الدخول:** الإعدادات ← الحساب ← حذف الحساب.",
  "legal.delete.how.signedOut":
    "**إن لم تستطع الدخول:** راسل privacy@umtuba.com من البريد المسجّل على الحساب، بعنوان \"طلب حذف حساب\". وسنتحقق من هويتك قبل التنفيذ.",
  "legal.delete.next.title": "ماذا يحدث بعد ذلك",
  "legal.delete.next.b1": "نؤكد طلبك بالبريد الإلكتروني",
  "legal.delete.next.b2":
    "يُعطّل حسابك فوراً ولا يعود ظاهراً للآخرين",
  "legal.delete.next.b3":
    "هناك مهلة ١٤ يوماً يمكنك خلالها الإلغاء بتسجيل الدخول",
  "legal.delete.next.b4":
    "بعد ١٤ يوماً، الحذف نهائي ولا يمكن التراجع عنه",
  "legal.delete.next.b5": "نراسلك عند اكتمال الحذف",
  "legal.delete.questions.title": "استفسارات",
  "legal.delete.questions.p1": "privacy@umtuba.com",

  "legal.export.title": "تصدير بياناتك",
  "legal.export.intro":
    "لك الحق في الحصول على نسخة من بياناتك الشخصية لدينا، بصيغة منظّمة قابلة للقراءة آلياً (المادة ٢٠ من GDPR).",
  "legal.export.includes.title": "ما يشمله التصدير",
  "legal.export.includes.b1": "معلومات الملف الشخصي",
  "legal.export.includes.b2":
    "منشوراتك، بما فيها النصوص والبيانات الوصفية",
  "legal.export.includes.b3": "تعليقاتك",
  "legal.export.includes.b4": "رسائلك",
  "legal.export.includes.b5": "من تتابع ومن يتابعك",
  "legal.export.includes.b6": "إعدادات حسابك وتفضيلاتك",
  "legal.export.includes.b7": "سجل نشاطك",
  "legal.export.includes.p1":
    "وتُرفق الفيديوهات والصور كملفات مع فهرس بصيغة JSON.",
  "legal.export.how.title": "كيف تطلبه",
  "legal.export.how.signedIn":
    "**إن كنت مسجّل الدخول:** الإعدادات ← الحساب ← تصدير بياناتي.",
  "legal.export.how.signedOut":
    "**إن لم تستطع الدخول:** راسل privacy@umtuba.com من البريد المسجّل، بعنوان \"طلب تصدير بيانات\".",
  "legal.export.next.title": "ماذا يحدث بعد ذلك",
  "legal.export.next.b1": "نؤكد طلبك",
  "legal.export.next.b2":
    "نجهّز التصدير — عادة بضعة أيام، وقد يستغرق حتى شهر",
  "legal.export.next.b3": "نرسل لك رابط تحميل آمن بالبريد",
  "legal.export.next.b4": "ينتهي الرابط بعد ٧ أيام",
  "legal.export.format.title": "الصيغة",
  "legal.export.format.p1":
    "أرشيف ZIP يحتوي ملفات JSON ووسائطك. وصيغة JSON مقروءة بالأدوات الشائعة ويمكن استيرادها في مكان آخر.",
  "legal.export.questions.title": "استفسارات",
  "legal.export.questions.p1": "privacy@umtuba.com",

  "legal.request.deleteHeading": "طلب الحذف",
  "legal.request.exportHeading": "طلب التصدير",
  "legal.request.signInDelete": "سجّل الدخول لطلب الحذف",
  "legal.request.signInExport": "سجّل الدخول لطلب التصدير",
  "legal.request.signedInAs":
    "مسجّل الدخول باسم {email}. ينطبق هذا الطلب على ذلك الحساب فقط.",
  "legal.request.acknowledgeDelete":
    "أفهم أن هذا يضع طلب حذف لهذا الحساب في قائمة الانتظار.",
  "legal.request.acknowledgeExport":
    "أفهم أن هذا يضع طلب تصدير بيانات لهذا الحساب في قائمة الانتظار.",
  "legal.request.typeDelete": "اكتب {phrase} للتأكيد",
  "legal.request.submitDelete": "طلب حذف الحساب",
  "legal.request.submitExport": "طلب تصدير البيانات",
  "legal.request.submitting": "جارٍ إرسال الطلب...",
  "legal.request.queuedDelete":
    "طلب الحذف في قائمة الانتظار (الحالة: {status}). أُرسل في {when}.",
  "legal.request.queuedExport":
    "طلب التصدير في قائمة الانتظار (الحالة: {status}). أُرسل في {when}.",
};
