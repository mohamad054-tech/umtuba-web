import type { SandboxCourse, SandboxLesson, SandboxModule } from "./types";

function lesson(
  id: string,
  title: string,
  kind: SandboxLesson["kind"],
  minutes: number,
  body: string,
  quiz: SandboxLesson["quiz"] = []
): SandboxLesson {
  return { id, title, kind, estimatedMinutes: minutes, body, quiz };
}

function moduleOf(
  id: string,
  title: string,
  summary: string,
  lessons: SandboxLesson[]
): SandboxModule {
  return { id, title, summary, lessons };
}

const ORIGINAL_BASE = {
  kind: "UMTUBA_ORIGINAL" as const,
  status: "DRAFT" as const,
  publishState: "DRAFT" as const,
  publicCatalog: false as const,
  synthetic: true as const,
  enrollmentMode: "HOSTED" as const,
  listPriceMinor: 0,
  revenueSharePercent: null,
  contentOwner: "UMTUBA",
  certificateOwner: "UMTUBA",
  aiTutorAllowed: true,
  providerId: "umtuba-originals",
};

export const PLATFORM_ESSENTIALS: SandboxCourse = {
  ...ORIGINAL_BASE,
  id: "sandbox-original-platform-essentials",
  slug: "umtuba-platform-essentials",
  title: "UMTUBA Platform Essentials",
  shortDescription:
    "First-party draft: account, Home/Watch, Create, Messages, Learning, Store, World, and privacy. Not in the public catalog.",
  instructorId: "demo-instructor-07",
  exercises: [
    {
      id: "pe-ex-1",
      title: "Walk three real surfaces",
      prompt:
        "Open Home or Watch, Create or Messages, and Store or Learning. Write one sentence for each: what the page is for, and one thing it does not do.",
    },
    {
      id: "pe-ex-2",
      title: "Rights default deny",
      prompt:
        "Pick one Store right and one Learning right. Explain what happens when the grant is missing.",
    },
  ],
  modules: [
    moduleOf("pe-m1", "Account, profile, and the product map", "The account is the boundary.", [
      lesson(
        "pe-m1-l1",
        "Account, profile, and Settings",
        "text",
        8,
        "Your UMTUBA account is the security boundary. Settings holds the profile you control. Platform administrators are determined by the platform_admins table, not a JWT or environment variable. Do not paste secrets into Learning, Messages, or tickets."
      ),
      lesson(
        "pe-m1-l2",
        "The honest product map",
        "text",
        8,
        "Member surfaces this draft walks: account, Home/Watch, Create, Messages, Learning, Store, World, and privacy/Support. Demo and Mock labels are intentional. Unknown rights are denied."
      ),
      lesson("pe-m1-q", "Check: account and product map", "quiz", 5, "Answer from this module.", [
        {
          id: "pe-m1-q1",
          prompt: "How is a platform administrator determined?",
          choices: [
            { id: "a", text: "A JWT claim alone." },
            { id: "b", text: "A local environment variable alone." },
            { id: "c", text: "The platform_admins database table." },
            { id: "d", text: "Whoever can open /admin in the browser." },
          ],
          correctChoiceId: "c",
          explanation: "Database authorization in platform_admins is the source of truth.",
        },
      ]),
    ]),
    moduleOf("pe-m2", "Watch, Home, Create, and Messages", "Media, publishing, and conversation.", [
      lesson(
        "pe-m2-l1",
        "Home, Watch, Following, and Saved",
        "text",
        8,
        "Home is the Discovery Layer. /discover is a forever alias. Watch is video viewing. These pages do not complete a commercial purchase or mark a partnership ACTIVE."
      ),
      lesson(
        "pe-m2-l2",
        "Create publishing and Messages",
        "text",
        8,
        "Create supports Video, Write Post, Image, and Article. Messages is 1:1 conversation, not a partnership inbox and not a place for passwords."
      ),
      lesson("pe-m2-q", "Check: Watch, Create, and Messages", "quiz", 4, "Answer from this module.", [
        {
          id: "pe-m2-q1",
          prompt: "What is Messages for on UMTUBA web today?",
          choices: [
            { id: "a", text: "1:1 conversation, not a place to send passwords." },
            { id: "b", text: "The official outbound partnership mailbox." },
            { id: "c", text: "A live Store checkout." },
            { id: "d", text: "A second Discover primary destination." },
          ],
          correctChoiceId: "a",
          explanation: "Messages is 1:1 conversation.",
        },
      ]),
    ]),
    moduleOf("pe-m3", "Learning, Store, and World", "Three products, one account.", [
      lesson(
        "pe-m3-l1",
        "Learning without inventing partners",
        "text",
        8,
        "UMTUBA Originals stay draft until an explicit publish. AI Tutor may use owned text only when allowed. Partner content defaults AI_USAGE_ALLOWED to false."
      ),
      lesson(
        "pe-m3-l2",
        "Store sandbox and World places",
        "text",
        8,
        "Demo products carry SOURCE_TYPE=DEMO, PURCHASABLE=NO, REAL_PROVIDER=NONE. Checkout must not complete a real purchase. World is places, not a shop."
      ),
      lesson("pe-m3-q", "Check: Learning, Store, and World", "quiz", 5, "Answer from this module.", [
        {
          id: "pe-m3-q1",
          prompt: "Which combination is correct for a demo Store product?",
          choices: [
            { id: "a", text: "SOURCE_TYPE=DEMO, PURCHASABLE=NO, REAL_PROVIDER=NONE." },
            { id: "b", text: "SOURCE_TYPE=PARTNER, PURCHASABLE=YES." },
            { id: "c", text: "SOURCE_TYPE=DEMO, PURCHASABLE=YES after import." },
            { id: "d", text: "CHECKOUT_ALLOWED=true by default." },
          ],
          correctChoiceId: "a",
          explanation: "Demo products are explicitly non-purchasable.",
        },
      ]),
    ]),
    moduleOf("pe-m4", "Privacy, safety, and responsible use", "Use the pages that exist.", [
      lesson(
        "pe-m4-l1",
        "Privacy, Support, report, and block",
        "text",
        7,
        "Privacy, Terms, Support, and Account deletion are the policy pages that exist. Do not invent inventory or partners to fill empty states."
      ),
      lesson(
        "pe-m4-r1",
        "First-session checklist",
        "resource",
        5,
        "Confirm demo items are labeled, checkout is denied, this original stays draft, and no outbound partner mail was sent."
      ),
      lesson("pe-m4-q", "Check: privacy and responsible use", "quiz", 4, "Answer from this module.", [
        {
          id: "pe-m4-q1",
          prompt: "Which action belongs in a safe first session?",
          choices: [
            { id: "a", text: "Email a marketplace brand to ask for a live feed." },
            { id: "b", text: "Confirm demo items are labeled and checkout is denied." },
            { id: "c", text: "Apply SQL 20260929 to production." },
            { id: "d", text: "Auto-publish this course." },
          ],
          correctChoiceId: "b",
          explanation: "The first session verifies labels and denied checkout.",
        },
      ]),
    ]),
  ],
};

export const DIGITAL_SAFETY: SandboxCourse = {
  ...ORIGINAL_BASE,
  id: "sandbox-original-digital-safety",
  slug: "digital-safety-privacy-fundamentals",
  title: "Digital Safety & Privacy Fundamentals",
  shortDescription:
    "First-party draft: passwords, MFA concepts, phishing, minimization, and reporting. Educational only.",
  instructorId: "demo-instructor-04",
  exercises: [
    { id: "ds-ex-1", title: "Unique password check", prompt: "Describe how you keep a unique secret per account without writing it in chat." },
    { id: "ds-ex-2", title: "Phishing rewrite", prompt: "Rewrite a fake admin request as a Support-only response." },
  ],
  modules: [
    moduleOf("ds-m1", "Passwords and recovery", "Unique secrets you control.", [
      lesson("ds-m1-l1", "One account, one secret", "text", 8, "Use a unique password. Staff will not ask you to paste a password or one-time code into chat."),
      lesson("ds-m1-l2", "MFA concepts and recovery", "text", 8, "Prefer an authenticator or hardware key when the product offers it. Official recovery stays on account pages."),
      lesson("ds-m1-q", "Check: passwords and recovery", "quiz", 4, "Answer from this module.", [
        {
          id: "ds-m1-q1",
          prompt: "Where does official account recovery happen?",
          choices: [
            { id: "a", text: "On the product account pages." },
            { id: "b", text: "In a Messages thread that asks for a code." },
            { id: "c", text: "By emailing a prospective partner." },
            { id: "d", text: "By sharing the password with a demo instructor." },
          ],
          correctChoiceId: "a",
          explanation: "Official recovery stays on product account pages.",
        },
      ]),
    ]),
    moduleOf("ds-m2", "Phishing and impersonation", "Fake admin and partner requests.", [
      lesson("ds-m2-l1", "Phishing, scams, and social engineering", "text", 8, "A message that asks you to activate a live marketplace feed or forward a login code is not official recovery."),
      lesson("ds-m2-l2", "Verify out of band", "text", 7, "Open Support or Settings yourself. Do not follow a link that claims to be UMTUBA admin."),
      lesson("ds-m2-q", "Check: phishing", "quiz", 4, "Answer from this module.", [
        {
          id: "ds-m2-q1",
          prompt: "A chat asks you to paste a one-time code. What do you do?",
          choices: [
            { id: "a", text: "Paste it so the session continues." },
            { id: "b", text: "Refuse and use official account pages / Support." },
            { id: "c", text: "Forward it to a prospective partner." },
            { id: "d", text: "Post it in a course discussion." },
          ],
          correctChoiceId: "b",
          explanation: "Never paste recovery codes into chat.",
        },
      ]),
    ]),
    moduleOf("ds-m3", "Permissions and data minimization", "Share the least data a task needs.", [
      lesson("ds-m3-l1", "Least privilege for apps and browsers", "text", 8, "Grant only the permission the task needs. Revoke unused access."),
      lesson("ds-m3-l2", "Public vs private info, safe sharing, and devices", "text", 8, "Usernames can be public. Passwords, recovery codes, and .env contents are never public."),
      lesson("ds-m3-q", "Check: permissions and minimization", "quiz", 4, "Answer from this module.", [
        {
          id: "ds-m3-q1",
          prompt: "Which item may appear on a public profile?",
          choices: [
            { id: "a", text: "A recovery code." },
            { id: "b", text: "A display name you chose." },
            { id: "c", text: "A service-role key." },
            { id: "d", text: "A real card number." },
          ],
          correctChoiceId: "b",
          explanation: "Public presence is identity you chose, not secrets.",
        },
      ]),
    ]),
    moduleOf("ds-m4", "Practice and close", "Report abuse through existing tools.", [
      lesson("ds-m4-l1", "Reporting abuse and a monthly pass", "text", 7, "Use in-product Report/Block when present, otherwise Support. Reporting is not a Store takedown."),
      lesson("ds-m4-r1", "Privacy pass worksheet", "resource", 5, "Monthly pass: unique passwords, MFA where offered, no secrets in chat, review app permissions."),
      lesson("ds-m4-q", "Check: monthly pass", "quiz", 3, "Answer from this module.", [
        {
          id: "ds-m4-q1",
          prompt: "Reporting abuse is…",
          choices: [
            { id: "a", text: "A way to mark a partnership ACTIVE." },
            { id: "b", text: "A safety action through existing product controls or Support." },
            { id: "c", text: "An outbound email to a marketplace brand." },
            { id: "d", text: "A live payment capture." },
          ],
          correctChoiceId: "b",
          explanation: "Use existing controls or Support.",
        },
      ]),
    ]),
  ],
};

export const AI_FUNDAMENTALS: SandboxCourse = {
  ...ORIGINAL_BASE,
  id: "sandbox-original-ai-fundamentals",
  slug: "ai-fundamentals-for-everyone",
  title: "AI Fundamentals for Everyone",
  shortDescription:
    "First-party draft: what AI is, prompts, hallucinations, and AI Tutor only on owned originals.",
  instructorId: "demo-instructor-01",
  exercises: [
    { id: "ai-ex-1", title: "Write a constrained prompt", prompt: "Write a prompt that names the lesson source and asks for a short answer." },
    { id: "ai-ex-2", title: "Mark verified versus unverified", prompt: "Take one AI sentence and mark what you verified against this lesson." },
  ],
  modules: [
    moduleOf("ai-m1", "What AI is and is not", "Pattern tools, not guaranteed facts.", [
      lesson("ai-m1-l1", "What AI is, and a machine-learning picture", "text", 8, "AI here means pattern tools trained on examples. It is not a source of guaranteed facts and not a live vendor partnership."),
      lesson("ai-m1-l2", "Hallucinations are normal failure, not rare theater", "text", 8, "A fluent answer can still be wrong. Verify against the lesson or another source you already trust."),
      lesson("ai-m1-q", "Check: what AI is", "quiz", 4, "Answer from this module.", [
        {
          id: "ai-m1-q1",
          prompt: "A fluent AI answer is…",
          choices: [
            { id: "a", text: "Always a verified fact." },
            { id: "b", text: "A pattern completion that still needs verification." },
            { id: "c", text: "A signed partnership contract." },
            { id: "d", text: "A live payment authorization." },
          ],
          correctChoiceId: "b",
          explanation: "Fluency is not verification.",
        },
      ]),
    ]),
    moduleOf("ai-m2", "Prompts and privacy", "Nothing secret goes in the packet.", [
      lesson("ai-m2-l1", "A prompt is a context packet", "text", 7, "A prompt is the text you send. Include the task and the allowed source. Do not include secrets."),
      lesson("ai-m2-l2", "Nothing secret goes in the packet", "text", 8, "Passwords, recovery codes, card numbers, and .env contents never belong in a prompt."),
      lesson("ai-m2-q", "Check: prompts", "quiz", 4, "Answer from this module.", [
        {
          id: "ai-m2-q1",
          prompt: "Which prompt is acceptable?",
          choices: [
            { id: "a", text: "Here is my password, summarize Settings." },
            { id: "b", text: "Using this lesson only, list two verification habits." },
            { id: "c", text: "Charge this card and enroll me." },
            { id: "d", text: "Import a third-party catalog." },
          ],
          correctChoiceId: "b",
          explanation: "Keep prompts constrained and secret-free.",
        },
      ]),
    ]),
    moduleOf("ai-m3", "UMTUBA AI Tutor rules", "Deny by default on partner content.", [
      lesson("ai-m3-l1", "AI_USAGE_ALLOWED is deny by default", "text", 8, "Partner and external courses default AI_USAGE_ALLOWED to UNKNOWN/DENY. Unknown is deny."),
      lesson("ai-m3-l2", "What the tutor may use from this pilot", "text", 8, "UMTUBA AI Tutor may use this owned draft for sandbox preview. Ingest into production still requires an explicit publish."),
      lesson("ai-m3-q", "Check: tutor rights", "quiz", 4, "Answer from this module.", [
        {
          id: "ai-m3-q1",
          prompt: "If AI_USAGE_ALLOWED is UNKNOWN, the effective grant is…",
          choices: [
            { id: "a", text: "ALLOW." },
            { id: "b", text: "DENY." },
            { id: "c", text: "ALLOW for sandbox only automatically in production." },
            { id: "d", text: "ALLOW after a quiz pass." },
          ],
          correctChoiceId: "b",
          explanation: "UNKNOWN equals DENY.",
        },
      ]),
    ]),
    moduleOf("ai-m4", "Practice and close", "Everyday use without vendor claims.", [
      lesson("ai-m4-l1", "Everyday use, work, learning, and safe tools", "text", 7, "Use AI to outline or quiz yourself on owned lessons. Do not treat it as a partner contract or a grade authority."),
      lesson("ai-m4-r1", "Prompt worksheet", "resource", 5, "Owned-content prompt: name the lesson, ask for a short answer, require uncertainty to be stated."),
      lesson("ai-m4-q", "Check: verification habit", "quiz", 3, "Answer from this module.", [
        {
          id: "ai-m4-q1",
          prompt: "After an AI Tutor answer you should…",
          choices: [
            { id: "a", text: "Publish it as a live partner claim." },
            { id: "b", text: "Verify against the assigned lesson." },
            { id: "c", text: "Paste a card number to unlock more." },
            { id: "d", text: "Mark a prospective partner ACTIVE." },
          ],
          correctChoiceId: "b",
          explanation: "Verify against the lesson.",
        },
      ]),
    ]),
  ],
};

export const UMTUBA_ORIGINAL_SANDBOX_COURSES: readonly SandboxCourse[] = [
  PLATFORM_ESSENTIALS,
  DIGITAL_SAFETY,
  AI_FUNDAMENTALS,
];
