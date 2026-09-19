import type { TranslationKey } from "../i18n/messages/types";

export type LegalTableSpec = {
  headers: [TranslationKey, TranslationKey];
  rows: Array<[TranslationKey, TranslationKey]>;
};

export type LegalBlock =
  | { type: "h2"; id: string; key: TranslationKey }
  | { type: "p"; key: TranslationKey }
  | { type: "lead"; key: TranslationKey }
  | { type: "list"; keys: TranslationKey[] }
  | { type: "table"; table: LegalTableSpec };

export type LegalPageSpec = {
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  path: string;
  showDraftBanner: boolean;
  showEffective: boolean;
  blocks: LegalBlock[];
};

export const PRIVACY_PAGE: LegalPageSpec = {
  titleKey: "legal.privacy.title",
  descriptionKey: "legal.meta.privacyDescription",
  path: "/privacy",
  showDraftBanner: true,
  showEffective: true,
  blocks: [
    { type: "h2", id: "who-we-are", key: "legal.privacy.who.title" },
    { type: "p", key: "legal.privacy.who.p1" },
    {
      type: "list",
      keys: [
        "legal.privacy.who.office",
        "legal.privacy.who.crn",
        "legal.privacy.who.email",
      ],
    },
    { type: "h2", id: "what-we-collect", key: "legal.privacy.collect.title" },
    { type: "lead", key: "legal.privacy.collect.direct" },
    {
      type: "list",
      keys: [
        "legal.privacy.collect.direct.account",
        "legal.privacy.collect.direct.profile",
        "legal.privacy.collect.direct.content",
        "legal.privacy.collect.direct.comms",
      ],
    },
    { type: "lead", key: "legal.privacy.collect.auto" },
    {
      type: "list",
      keys: [
        "legal.privacy.collect.auto.tech",
        "legal.privacy.collect.auto.usage",
        "legal.privacy.collect.auto.cookies",
      ],
    },
    { type: "lead", key: "legal.privacy.collect.third" },
    {
      type: "list",
      keys: [
        "legal.privacy.collect.third.pay",
        "legal.privacy.collect.third.store",
      ],
    },
    { type: "h2", id: "legal-basis", key: "legal.privacy.basis.title" },
    {
      type: "table",
      table: {
        headers: ["legal.privacy.basis.hPurpose", "legal.privacy.basis.hLaw"],
        rows: [
          ["legal.privacy.basis.r1c1", "legal.privacy.basis.r1c2"],
          ["legal.privacy.basis.r2c1", "legal.privacy.basis.r2c2"],
          ["legal.privacy.basis.r3c1", "legal.privacy.basis.r3c2"],
          ["legal.privacy.basis.r4c1", "legal.privacy.basis.r4c2"],
          ["legal.privacy.basis.r5c1", "legal.privacy.basis.r5c2"],
          ["legal.privacy.basis.r6c1", "legal.privacy.basis.r6c2"],
          ["legal.privacy.basis.r7c1", "legal.privacy.basis.r7c2"],
        ],
      },
    },
    { type: "p", key: "legal.privacy.basis.withdraw" },
    { type: "h2", id: "analytics", key: "legal.privacy.analytics.title" },
    { type: "p", key: "legal.privacy.analytics.p1" },
    { type: "p", key: "legal.privacy.analytics.p2" },
    { type: "p", key: "legal.privacy.analytics.p3" },
    { type: "h2", id: "location", key: "legal.privacy.location.title" },
    { type: "p", key: "legal.privacy.location.p1" },
    { type: "p", key: "legal.privacy.location.p2" },
    { type: "p", key: "legal.privacy.location.p3" },
    { type: "h2", id: "sharing", key: "legal.privacy.share.title" },
    { type: "p", key: "legal.privacy.share.p1" },
    { type: "lead", key: "legal.privacy.share.intro" },
    {
      type: "list",
      keys: [
        "legal.privacy.share.providers",
        "legal.privacy.share.users",
        "legal.privacy.share.authorities",
      ],
    },
    { type: "p", key: "legal.privacy.share.p2" },
    { type: "h2", id: "transfers", key: "legal.privacy.transfers.title" },
    { type: "p", key: "legal.privacy.transfers.p1" },
    { type: "h2", id: "retention", key: "legal.privacy.retain.title" },
    {
      type: "table",
      table: {
        headers: ["legal.privacy.retain.hData", "legal.privacy.retain.hHow"],
        rows: [
          ["legal.privacy.retain.r1c1", "legal.privacy.retain.r1c2"],
          ["legal.privacy.retain.r2c1", "legal.privacy.retain.r2c2"],
          ["legal.privacy.retain.r3c1", "legal.privacy.retain.r3c2"],
          ["legal.privacy.retain.r4c1", "legal.privacy.retain.r4c2"],
          ["legal.privacy.retain.r5c1", "legal.privacy.retain.r5c2"],
          ["legal.privacy.retain.r6c1", "legal.privacy.retain.r6c2"],
          ["legal.privacy.retain.r7c1", "legal.privacy.retain.r7c2"],
        ],
      },
    },
    { type: "h2", id: "your-rights", key: "legal.privacy.rights.title" },
    { type: "lead", key: "legal.privacy.rights.intro" },
    {
      type: "list",
      keys: [
        "legal.privacy.rights.access",
        "legal.privacy.rights.rectify",
        "legal.privacy.rights.erase",
        "legal.privacy.rights.restrict",
        "legal.privacy.rights.port",
        "legal.privacy.rights.object",
        "legal.privacy.rights.withdraw",
        "legal.privacy.rights.auto",
      ],
    },
    { type: "p", key: "legal.privacy.rights.p1" },
    { type: "p", key: "legal.privacy.rights.p2" },
    { type: "h2", id: "security", key: "legal.privacy.security.title" },
    { type: "p", key: "legal.privacy.security.p1" },
    { type: "h2", id: "children", key: "legal.privacy.children.title" },
    { type: "p", key: "legal.privacy.children.p1" },
    { type: "h2", id: "changes", key: "legal.privacy.changes.title" },
    { type: "p", key: "legal.privacy.changes.p1" },
  ],
};

export const TERMS_PAGE: LegalPageSpec = {
  titleKey: "legal.terms.title",
  descriptionKey: "legal.meta.termsDescription",
  path: "/terms",
  showDraftBanner: true,
  showEffective: false,
  blocks: [
    { type: "h2", id: "agreement", key: "legal.terms.s1.title" },
    { type: "p", key: "legal.terms.s1.p1" },
    { type: "p", key: "legal.terms.s1.p2" },
    { type: "h2", id: "eligibility", key: "legal.terms.s2.title" },
    { type: "p", key: "legal.terms.s2.p1" },
    { type: "p", key: "legal.terms.s2.p2" },
    { type: "h2", id: "account", key: "legal.terms.s3.title" },
    { type: "p", key: "legal.terms.s3.p1" },
    { type: "p", key: "legal.terms.s3.p2" },
    { type: "h2", id: "content", key: "legal.terms.s4.title" },
    { type: "p", key: "legal.terms.s4.p1" },
    { type: "p", key: "legal.terms.s4.p2" },
    { type: "p", key: "legal.terms.s4.p3" },
    { type: "h2", id: "prohibited", key: "legal.terms.s5.title" },
    { type: "lead", key: "legal.terms.s5.intro" },
    {
      type: "list",
      keys: [
        "legal.terms.s5.b1",
        "legal.terms.s5.b2",
        "legal.terms.s5.b3",
        "legal.terms.s5.b4",
        "legal.terms.s5.b5",
        "legal.terms.s5.b6",
        "legal.terms.s5.b7",
        "legal.terms.s5.b8",
      ],
    },
    { type: "h2", id: "moderation", key: "legal.terms.s6.title" },
    { type: "p", key: "legal.terms.s6.p1" },
    { type: "p", key: "legal.terms.s6.p2" },
    { type: "h2", id: "learning", key: "legal.terms.s7.title" },
    { type: "p", key: "legal.terms.s7.p1" },
    { type: "h2", id: "store", key: "legal.terms.s8.title" },
    { type: "p", key: "legal.terms.s8.p1" },
    { type: "p", key: "legal.terms.s8.p2" },
    { type: "h2", id: "payments", key: "legal.terms.s9.title" },
    { type: "p", key: "legal.terms.s9.p1" },
    { type: "h2", id: "availability", key: "legal.terms.s10.title" },
    { type: "p", key: "legal.terms.s10.p1" },
    { type: "h2", id: "liability", key: "legal.terms.s11.title" },
    { type: "p", key: "legal.terms.s11.p1" },
    { type: "p", key: "legal.terms.s11.p2" },
    { type: "p", key: "legal.terms.s11.p3" },
    { type: "h2", id: "termination", key: "legal.terms.s12.title" },
    { type: "p", key: "legal.terms.s12.p1" },
    { type: "p", key: "legal.terms.s12.p2" },
    { type: "h2", id: "governing-law", key: "legal.terms.s13.title" },
    { type: "p", key: "legal.terms.s13.p1" },
    { type: "p", key: "legal.terms.s13.p2" },
    { type: "h2", id: "contact", key: "legal.terms.s14.title" },
    { type: "p", key: "legal.terms.s14.p1" },
  ],
};

export const COOKIES_PAGE: LegalPageSpec = {
  titleKey: "legal.cookies.title",
  descriptionKey: "legal.meta.cookiesDescription",
  path: "/cookies",
  showDraftBanner: true,
  showEffective: false,
  blocks: [
    { type: "h2", id: "what-cookies-are", key: "legal.cookies.what.title" },
    { type: "p", key: "legal.cookies.what.p1" },
    { type: "h2", id: "what-we-use", key: "legal.cookies.use.title" },
    { type: "lead", key: "legal.cookies.use.necessary" },
    {
      type: "list",
      keys: [
        "legal.cookies.use.necessary.b1",
        "legal.cookies.use.necessary.b2",
        "legal.cookies.use.necessary.b3",
        "legal.cookies.use.necessary.b4",
      ],
    },
    { type: "lead", key: "legal.cookies.use.functional" },
    {
      type: "list",
      keys: [
        "legal.cookies.use.functional.b1",
        "legal.cookies.use.functional.b2",
      ],
    },
    { type: "lead", key: "legal.cookies.use.analytics" },
    {
      type: "list",
      keys: [
        "legal.cookies.use.analytics.b1",
        "legal.cookies.use.analytics.b2",
        "legal.cookies.use.analytics.b3",
      ],
    },
    { type: "p", key: "legal.cookies.use.ads" },
    { type: "h2", id: "your-choices", key: "legal.cookies.choices.title" },
    { type: "p", key: "legal.cookies.choices.p1" },
    { type: "p", key: "legal.cookies.choices.p2" },
    { type: "h2", id: "third-parties", key: "legal.cookies.third.title" },
    { type: "p", key: "legal.cookies.third.p1" },
    { type: "h2", id: "contact", key: "legal.cookies.contact.title" },
    { type: "p", key: "legal.cookies.contact.p1" },
  ],
};

export const COMMUNITY_PAGE: LegalPageSpec = {
  titleKey: "legal.community.title",
  descriptionKey: "legal.meta.communityDescription",
  path: "/community-guidelines",
  showDraftBanner: true,
  showEffective: false,
  blocks: [
    { type: "p", key: "legal.community.intro" },
    { type: "h2", id: "not-allowed", key: "legal.community.not.title" },
    { type: "p", key: "legal.community.not.minors" },
    { type: "p", key: "legal.community.not.violence" },
    { type: "p", key: "legal.community.not.hate" },
    { type: "p", key: "legal.community.not.harass" },
    { type: "p", key: "legal.community.not.adult" },
    { type: "p", key: "legal.community.not.deception" },
    { type: "p", key: "legal.community.not.illegal" },
    { type: "p", key: "legal.community.not.spam" },
    { type: "p", key: "legal.community.not.ip" },
    { type: "h2", id: "consequences", key: "legal.community.break.title" },
    { type: "lead", key: "legal.community.break.intro" },
    {
      type: "table",
      table: {
        headers: [
          "legal.community.break.hAction",
          "legal.community.break.hWhen",
        ],
        rows: [
          ["legal.community.break.r1c1", "legal.community.break.r1c2"],
          ["legal.community.break.r2c1", "legal.community.break.r2c2"],
          ["legal.community.break.r3c1", "legal.community.break.r3c2"],
          ["legal.community.break.r4c1", "legal.community.break.r4c2"],
        ],
      },
    },
    { type: "p", key: "legal.community.break.p1" },
    { type: "h2", id: "reporting", key: "legal.community.report.title" },
    { type: "p", key: "legal.community.report.p1" },
    { type: "h2", id: "appeals", key: "legal.community.appeal.title" },
    { type: "p", key: "legal.community.appeal.p1" },
  ],
};

export const COPYRIGHT_PAGE: LegalPageSpec = {
  titleKey: "legal.copyright.title",
  descriptionKey: "legal.meta.copyrightDescription",
  path: "/copyright",
  showDraftBanner: true,
  showEffective: false,
  blocks: [
    { type: "p", key: "legal.copyright.intro" },
    { type: "h2", id: "reporting", key: "legal.copyright.report.title" },
    { type: "lead", key: "legal.copyright.report.intro" },
    {
      type: "list",
      keys: [
        "legal.copyright.report.b1",
        "legal.copyright.report.b2",
        "legal.copyright.report.b3",
        "legal.copyright.report.b4",
        "legal.copyright.report.b5",
        "legal.copyright.report.b6",
      ],
    },
    { type: "p", key: "legal.copyright.report.p1" },
    { type: "h2", id: "what-we-do", key: "legal.copyright.do.title" },
    { type: "p", key: "legal.copyright.do.p1" },
    { type: "h2", id: "counter-notice", key: "legal.copyright.counter.title" },
    { type: "lead", key: "legal.copyright.counter.intro" },
    {
      type: "list",
      keys: [
        "legal.copyright.counter.b1",
        "legal.copyright.counter.b2",
        "legal.copyright.counter.b3",
        "legal.copyright.counter.b4",
        "legal.copyright.counter.b5",
      ],
    },
    { type: "p", key: "legal.copyright.counter.p1" },
    { type: "h2", id: "repeat", key: "legal.copyright.repeat.title" },
    { type: "p", key: "legal.copyright.repeat.p1" },
    { type: "h2", id: "misuse", key: "legal.copyright.misuse.title" },
    { type: "p", key: "legal.copyright.misuse.p1" },
  ],
};

export const CONTACT_PAGE: LegalPageSpec = {
  titleKey: "legal.contact.title",
  descriptionKey: "legal.meta.contactDescription",
  path: "/support",
  showDraftBanner: false,
  showEffective: false,
  blocks: [
    { type: "p", key: "legal.contact.support" },
    { type: "p", key: "legal.contact.privacy" },
    { type: "p", key: "legal.contact.legal" },
    { type: "p", key: "legal.contact.copyright" },
    { type: "p", key: "legal.contact.company" },
    { type: "p", key: "legal.contact.office" },
    { type: "p", key: "legal.contact.crn" },
    { type: "p", key: "legal.contact.p1" },
  ],
};

export const ABOUT_PAGE: LegalPageSpec = {
  titleKey: "legal.about.title",
  descriptionKey: "legal.meta.aboutDescription",
  path: "/about",
  showDraftBanner: false,
  showEffective: false,
  blocks: [
    { type: "p", key: "legal.about.p1" },
    { type: "p", key: "legal.about.p2" },
    { type: "p", key: "legal.about.p3" },
    { type: "p", key: "legal.about.principle" },
    { type: "p", key: "legal.about.contact" },
  ],
};

export const DELETE_PAGE: LegalPageSpec = {
  titleKey: "legal.delete.title",
  descriptionKey: "legal.meta.deleteDescription",
  path: "/account-deletion",
  showDraftBanner: false,
  showEffective: false,
  blocks: [
    { type: "p", key: "legal.delete.intro" },
    { type: "h2", id: "what-gets-deleted", key: "legal.delete.what.title" },
    {
      type: "list",
      keys: [
        "legal.delete.what.b1",
        "legal.delete.what.b2",
        "legal.delete.what.b3",
        "legal.delete.what.b4",
        "legal.delete.what.b5",
      ],
    },
    { type: "h2", id: "what-we-keep", key: "legal.delete.keep.title" },
    {
      type: "list",
      keys: [
        "legal.delete.keep.b1",
        "legal.delete.keep.b2",
        "legal.delete.keep.b3",
        "legal.delete.keep.b4",
      ],
    },
    { type: "h2", id: "how-to-request", key: "legal.delete.how.title" },
    { type: "p", key: "legal.delete.how.signedIn" },
    { type: "p", key: "legal.delete.how.signedOut" },
    { type: "h2", id: "what-happens-next", key: "legal.delete.next.title" },
    {
      type: "list",
      keys: [
        "legal.delete.next.b1",
        "legal.delete.next.b2",
        "legal.delete.next.b3",
        "legal.delete.next.b4",
        "legal.delete.next.b5",
      ],
    },
    { type: "h2", id: "questions", key: "legal.delete.questions.title" },
    { type: "p", key: "legal.delete.questions.p1" },
  ],
};

export const EXPORT_PAGE: LegalPageSpec = {
  titleKey: "legal.export.title",
  descriptionKey: "legal.meta.exportDescription",
  path: "/data-export",
  showDraftBanner: false,
  showEffective: false,
  blocks: [
    { type: "p", key: "legal.export.intro" },
    { type: "h2", id: "what-export-includes", key: "legal.export.includes.title" },
    {
      type: "list",
      keys: [
        "legal.export.includes.b1",
        "legal.export.includes.b2",
        "legal.export.includes.b3",
        "legal.export.includes.b4",
        "legal.export.includes.b5",
        "legal.export.includes.b6",
        "legal.export.includes.b7",
      ],
    },
    { type: "p", key: "legal.export.includes.p1" },
    { type: "h2", id: "how-to-request", key: "legal.export.how.title" },
    { type: "p", key: "legal.export.how.signedIn" },
    { type: "p", key: "legal.export.how.signedOut" },
    { type: "h2", id: "what-happens-next", key: "legal.export.next.title" },
    {
      type: "list",
      keys: [
        "legal.export.next.b1",
        "legal.export.next.b2",
        "legal.export.next.b3",
        "legal.export.next.b4",
      ],
    },
    { type: "h2", id: "format", key: "legal.export.format.title" },
    { type: "p", key: "legal.export.format.p1" },
    { type: "h2", id: "questions", key: "legal.export.questions.title" },
    { type: "p", key: "legal.export.questions.p1" },
  ],
};
