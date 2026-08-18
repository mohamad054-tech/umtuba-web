/**
 * Honest Product Owner judgments. These are not marketing scores.
 */

export type Judgment = {
  key: string;
  verdict: "YES" | "PARTIAL" | "NO";
  note: string;
};

export function learningSandboxJudgments(): Judgment[] {
  return [
    {
      key: "DOES_LEARNING_FEEL_PREMIUM",
      verdict: "PARTIAL",
      note: "Chrome, course outline, and Originals copy are intentional. This is a private sandbox, not the production Learning visual system end-to-end.",
    },
    {
      key: "DOES_LEARNING_FEEL_TRUSTWORTHY",
      verdict: "YES",
      note: "Labels, rights, enrollment WHY/WHAT NEXT, and certificate ownership are explicit. Prospective brands stay non-partners.",
    },
    {
      key: "IS_STUDENT_DASHBOARD_WORLD_CLASS",
      verdict: "PARTIAL",
      note: "Clickable roster, progress, and next actions exist. It is not a production-scale personalized dashboard.",
    },
    {
      key: "IS_COURSE_EXPERIENCE_WORLD_CLASS",
      verdict: "PARTIAL",
      note: "Hosted Originals and partner previews are executable. External courses correctly refuse hosted lessons.",
    },
    {
      key: "IS_LESSON_EXPERIENCE_WORLD_CLASS",
      verdict: "PARTIAL",
      note: "Lessons are readable and completable. Missing bodies stay marked missing. No video player in this slice.",
    },
    {
      key: "IS_AI_TUTOR_USEFUL",
      verdict: "PARTIAL",
      note: "Useful as a rights-correct local explainer on owned Originals. It is not a live model and never sees partner content.",
    },
    {
      key: "IS_CERTIFICATE_FLOW_CLEAR",
      verdict: "YES",
      note: "Issuer, owner, accreditation=NONE, and forbidden real-brand issuers are shown before issue.",
    },
    {
      key: "IS_INSTRUCTOR_DASHBOARD_USABLE",
      verdict: "YES",
      note: "Roster, create lifecycle, analytics, and financial demo (payout off) are walkable.",
    },
    {
      key: "IS_PARTNER_MODEL_CLEAR",
      verdict: "YES",
      note: "Partner vs external vs prospective is labeled. Prospective cannot become ACTIVE.",
    },
    {
      key: "IS_PAID_LEARNING_CLEAR",
      verdict: "YES",
      note: "Paid partner previews require mock SUCCESS. Cards are not collected. REAL_CHARGE_POSSIBLE=NO.",
    },
  ];
}
