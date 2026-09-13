import type { UmtubaOriginalCourse } from "./types";
import {
  ORIGINALS_CERTIFICATE_DISCLAIMER,
  ORIGINALS_COMPLETION_RELATIONSHIP,
  lesson,
  moduleOf,
  quizQuestion,
} from "./originalsShared";

const ORIGINAL_BASE = {
  kind: "UMTUBA_ORIGINAL" as const,
  status: "DRAFT" as const,
  publishState: "DRAFT" as const,
  publicCatalog: false as const,
  synthetic: true as const,
  enrollmentMode: "HOSTED" as const,
  revenueSharePercent: null,
  contentOwner: "UMTUBA",
  certificateOwner: "UMTUBA",
  aiTutorAllowed: true,
  providerId: "umtuba-originals",
};

export const AI_FUNDAMENTALS: UmtubaOriginalCourse = {
  ...ORIGINAL_BASE,
  id: "sandbox-original-ai-fundamentals",
  slug: "ai-fundamentals-for-everyone",
  title: "AI Fundamentals for Everyone",
  shortDescription:
    "First-party draft: what AI is and is not, prompts, hallucinations, and AI Tutor only on owned Originals. Not a claim that AI knows the truth.",
  instructorId: "demo-instructor-01",
  exercises: [
    {
      id: "ai-ex-1",
      title: "Write a constrained prompt",
      prompt:
        "Write a prompt that names this lesson as the only source and asks for a short answer. Do not include passwords, codes, card numbers, or private documents.",
    },
    {
      id: "ai-ex-2",
      title: "Mark verified versus unverified",
      prompt:
        "Take one AI-style sentence about this course and mark what you verified against the lesson versus what you did not verify.",
    },
  ],
  certificateCopy: {
    courseName: "AI Fundamentals for Everyone",
    learnerNamePlaceholder: "{{LEARNER_NAME}}",
    completionStatement:
      "This certifies that {{LEARNER_NAME}} completed AI Fundamentals for Everyone.",
    issuer: "UMTUBA",
    completionDatePlaceholder: "{{COMPLETION_DATE}}",
    certificateIdPlaceholder: "{{CERTIFICATE_ID}}",
    disclaimer: ORIGINALS_CERTIFICATE_DISCLAIMER,
  },
  finalAssessment: {
    id: "ai-final",
    title: "AI Fundamentals — course check",
    objective:
      "Apply what AI is, hallucinations, prompt privacy, UMTUBA tutor rights, and everyday verification across the four modules.",
    body: "Answer from this course only. AI does not always know the truth, does not understand like a human, and does not replace professional judgment. Passing is 4 of 5 points. You may start a new attempt if you do not pass.",
    estimatedMinutes: 12,
    maxScore: 5,
    passingScore: 4,
    maxAttempts: null,
    completionMode: "score",
    completionRelationship: ORIGINALS_COMPLETION_RELATIONSHIP,
    quiz: [
      quizQuestion(
        "ai-final-q1",
        "In this course, AI means…",
        [
          "A guaranteed source of facts that always knows the truth.",
          "Pattern tools trained on examples. Fluent answers still need verification.",
          "A live vendor partnership contract.",
          "A replacement for licensed professional judgment.",
        ],
        1,
        "Pattern completion is not guaranteed truth and not human understanding."
      ),
      quizQuestion(
        "ai-final-q2",
        "A fluent AI answer that names a date you cannot find in the lesson is…",
        [
          "Automatically true because it sounds confident.",
          "A possible hallucination — verify or treat as unverified.",
          "A signed legal citation.",
          "Permission to paste confidential files into the next prompt.",
        ],
        1,
        "Hallucinations are a normal failure mode, not rare theater."
      ),
      quizQuestion(
        "ai-final-q3",
        "Which prompt is acceptable?",
        [
          "Here is my password; summarize Settings.",
          "Using this lesson only, list two verification habits.",
          "Charge this card and enroll me.",
          "Here is a confidential medical file; diagnose me.",
        ],
        1,
        "Keep prompts constrained and secret-free. Confidential info is not for default AI use."
      ),
      quizQuestion(
        "ai-final-q4",
        "If AI_USAGE_ALLOWED is UNKNOWN for partner content, the effective grant is…",
        [
          "ALLOW.",
          "DENY.",
          "ALLOW in production automatically.",
          "ALLOW after any quiz pass.",
        ],
        1,
        "Unknown equals deny. Tutor may use owned Originals only when allowed."
      ),
      quizQuestion(
        "ai-final-q5",
        "After an AI Tutor answer you should…",
        [
          "Publish it as a live partner claim.",
          "Verify against the assigned lesson. Do not treat it as professional advice.",
          "Paste a card number to unlock more.",
          "Assume it understands you the way a human teacher does.",
        ],
        1,
        "Verify against the lesson. AI does not replace professional judgment."
      ),
    ],
  },
  modules: [
    moduleOf(
      "ai-m1",
      "What AI is and is not",
      "Pattern tools, not guaranteed facts, not human understanding.",
      [
        lesson({
          id: "ai-m1-l1",
          title: "What AI is, and a machine-learning picture",
          kind: "text",
          minutes: 13,
          objective:
            "Describe AI in this course as pattern tools trained on examples — not a mind and not a guaranteed encyclopedia.",
          body: "AI here means software that predicts likely next words, labels, or actions from patterns in examples it was trained on. Machine learning is the usual name for 'improve those predictions from examples.' This course does not claim a specific vendor is inside UMTUBA, and it is not a live vendor partnership.\n\nAI does not always know the truth. It does not understand like a human. It does not replace a doctor's, lawyer's, or other professional's judgment. Treat outputs as drafts to check.\n\nA useful picture: the system has seen many examples of text or other data. It produces a fluent continuation. Fluency is not the same as a source you already trust.\n\nUMTUBA AI Tutor, when allowed, is a lesson helper on owned Originals — not a general oracle.",
          examples: [
            "A model completes 'The capital of…' with a common pattern. You still check a source you trust if it matters.",
            "A tutor summary of this paragraph is a draft, not a citation.",
            "Asking AI to 'be my lawyer' does not create professional advice.",
          ],
          keyTakeaways: [
            "AI here = pattern tools trained on examples.",
            "Not guaranteed facts. Not human understanding.",
            "Not a replacement for professional judgment.",
            "Not automatically a vendor partnership.",
          ],
          exercise: {
            title: "Finish the definition",
            prompt:
              "Write two sentences: what AI is in this course, and one thing it is not (truth machine, human mind, or professional stand-in).",
          },
          aiTutorContext:
            "Define AI as pattern tools / ML from examples. Must not claim AI always knows truth, understands like a human, or replaces professional judgment. No vendor partnership claims.",
        }),
        lesson({
          id: "ai-m1-l2",
          title: "Hallucinations are normal failure, not rare theater",
          kind: "text",
          minutes: 12,
          objective:
            "Treat fluent but unsupported answers as a normal failure mode and verify against the lesson.",
          body: "A hallucination in this course means a confident, fluent answer that is wrong, made-up, or not supported by the source you asked it to use. It is a normal failure mode, not a rare glitch you can ignore.\n\nVerify against the assigned lesson or another source you already trust. If you cannot verify, mark the claim unverified. Do not publish an unverified AI sentence as a partner fact, a legal citation, or a medical result.\n\nAsking the model to 'sound sure' does not make it true. Asking it to list sources can still produce invented titles.\n\nThis lesson does not quote made-up error rates.",
          examples: [
            "AI invents a lesson title that is not in this course. Unverified.",
            "AI restates a takeaway you can find in the previous lesson. You can mark that verified.",
            "A fabricated court case name is not a citation.",
          ],
          keyTakeaways: [
            "Fluency is not verification.",
            "Hallucinations are normal, not rare theater.",
            "Verify or label unverified.",
            "Do not invent statistics about how often it happens.",
          ],
          exercise: {
            title: "Verified / unverified",
            prompt:
              "Write one sentence an AI might say about this lesson, then label each part VERIFIED (found in the lesson) or UNVERIFIED.",
          },
          aiTutorContext:
            "Hallucinations = fluent unsupported or false answers; normal failure. Verify against the lesson. No fabricated rates. Do not present AI as always true.",
        }),
        lesson({
          id: "ai-m1-q",
          title: "Check: what AI is",
          kind: "quiz",
          minutes: 7,
          objective:
            "Reject 'AI always knows' and treat fluency as unverified until checked.",
          body: "Answer from this module only. Prefer the option that treats AI as a pattern tool to verify.",
          aiTutorContext:
            "Quiz: pattern tools, hallucinations normal, not professional replacement, fluency ≠ fact.",
          quiz: [
            quizQuestion(
              "ai-m1-q1",
              "A fluent AI answer is…",
              [
                "Always a verified fact.",
                "A pattern completion that still needs verification.",
                "A signed partnership contract.",
                "A live payment authorization.",
              ],
              1,
              "Fluency is not verification."
            ),
            quizQuestion(
              "ai-m1-q2",
              "This course says AI understands like a human.",
              [
                "Yes — that is the definition.",
                "No. It does not understand like a human.",
                "Only after you pass this quiz.",
                "Only when AI_USAGE_ALLOWED is UNKNOWN.",
              ],
              1,
              "Pattern tools are not human understanding."
            ),
            quizQuestion(
              "ai-m1-q3",
              "You should use an AI answer as…",
              [
                "A replacement for professional judgment.",
                "A draft to check against the lesson or another source you trust.",
                "Automatic legal advice.",
                "Proof that a vendor partnership is live.",
              ],
              1,
              "AI does not replace professional judgment."
            ),
            quizQuestion(
              "ai-m1-q4",
              "Hallucinations are…",
              [
                "So rare you can ignore them.",
                "A normal failure mode: fluent and still wrong or unsupported.",
                "Impossible if the sentence is long.",
                "The same as a Learning certificate.",
              ],
              1,
              "Treat hallucinations as normal, not theater."
            ),
          ],
        }),
      ]
    ),
    moduleOf(
      "ai-m2",
      "Prompts and privacy",
      "A prompt is a context packet. Confidential information is not for default AI use.",
      [
        lesson({
          id: "ai-m2-l1",
          title: "A prompt is a context packet",
          kind: "text",
          minutes: 11,
          objective:
            "Write short prompts that name the task and the allowed source — without stuffing secrets.",
          body: "A prompt is the text (and any files) you send. It is a context packet: task, constraints, and the source the model is allowed to use. Better packets are specific and small.\n\nName the lesson or paragraph you want used. Ask for a short answer. Ask the model to say when it is unsure. You do not need clever 'jailbreak' wording, and this course will not teach that.\n\nA good packet still does not make the answer true. It only reduces some confusion.\n\nGeneral password and phishing habits are in Digital Safety. This lesson is about what you put in the packet.",
          examples: [
            "Using the 'Hallucinations' lesson only, list two verification habits in one sentence each.",
            "Bad: 'Tell me everything about AI and also here is my inbox export.'",
            "Ask: 'If the lesson does not say, answer I do not know.'",
          ],
          keyTakeaways: [
            "A prompt is a context packet.",
            "Name the task and the allowed source.",
            "Ask for uncertainty to be stated.",
            "A better prompt is not guaranteed truth.",
          ],
          exercise: {
            title: "Write one constrained prompt",
            prompt:
              "Write one prompt that names this lesson, asks for two bullets, and tells the model to say when the lesson does not say. No secrets.",
          },
          aiTutorContext:
            "Prompts as context packets: task + allowed source + short answer + uncertainty. No jailbreak coaching. Better prompt ≠ truth. Defer general security to Digital Safety.",
        }),
        lesson({
          id: "ai-m2-l2",
          title: "Nothing secret goes in the packet",
          kind: "text",
          minutes: 12,
          objective:
            "Keep passwords, recovery codes, payment data, and other confidential information out of prompts by default.",
          body: "Passwords, recovery codes, card numbers, government ID numbers, health or school records that are not yours to share, and .env or service-role keys never belong in a prompt. Confidential information should not go to AI by default — including UMTUBA AI Tutor.\n\nIf you would not paste it into a public forum, do not paste it into a tutor box. Minimizing data in apps and browsers is Digital Safety; this lesson is the AI-specific rule.\n\nThere is no exercise that requires a real secret. If a prompt asks for one, the prompt is wrong.\n\nUMTUBA staff and this course will not ask you to upload confidential files to 'unlock' a better answer.",
          examples: [
            "Acceptable: 'Using this lesson, what is a hallucination?'",
            "Never: 'Here is my password / card / patient file.'",
            "A .env paste is a secret leak, not a better packet.",
          ],
          keyTakeaways: [
            "Confidential information is not for default AI use.",
            "No passwords, codes, cards, keys, or others' private records.",
            "Tutor boxes are not a vault.",
            "A request for secrets is a bad prompt.",
          ],
          exercise: {
            title: "Red-team your prompt (no real secrets)",
            prompt:
              "Rewrite a sloppy prompt that mentions 'my password' into a secret-free prompt that still asks a lesson question.",
          },
          aiTutorContext:
            "Hard rule: no confidential info in prompts by default. No passwords/codes/cards/keys/PII. Do not ask the learner for secrets. Point general minimization to Digital Safety.",
        }),
        lesson({
          id: "ai-m2-q",
          title: "Check: prompts",
          kind: "quiz",
          minutes: 7,
          objective:
            "Pick constrained, secret-free prompts.",
          body: "Answer from this module only. Prefer the option that treats AI as a pattern tool to verify.",
          aiTutorContext:
            "Quiz: constrained lesson-only prompts; reject secrets, cards, confidential files.",
          quiz: [
            quizQuestion(
              "ai-m2-q1",
              "Which prompt is acceptable?",
              [
                "Here is my password, summarize Settings.",
                "Using this lesson only, list two verification habits.",
                "Charge this card and enroll me.",
                "Import a third-party catalog.",
              ],
              1,
              "Keep prompts constrained and secret-free."
            ),
            quizQuestion(
              "ai-m2-q2",
              "Confidential records should go into AI…",
              [
                "By default, so the model can 'understand you.'",
                "Not by default. Do not paste them into a tutor.",
                "Whenever the answer sounds fluent.",
                "If AI_USAGE_ALLOWED is UNKNOWN.",
              ],
              1,
              "Confidential information is not for default AI use."
            ),
            quizQuestion(
              "ai-m2-q3",
              "A more specific prompt means…",
              [
                "The answer is guaranteed true.",
                "You reduced some confusion. You still verify.",
                "You may now include backup codes.",
                "The tutor becomes a human teacher.",
              ],
              1,
              "Better packets help; they do not guarantee truth."
            ),
            quizQuestion(
              "ai-m2-q4",
              "This course teaches jailbreak tricks to bypass safety.",
              [
                "Yes, that is the main skill.",
                "No. This course does not teach that.",
                "Only in the final assessment.",
                "Only for partner catalogs.",
              ],
              1,
              "No jailbreak coaching."
            ),
          ],
        }),
      ]
    ),
    moduleOf(
      "ai-m3",
      "UMTUBA AI Tutor rules",
      "Deny by default on partner content. Owned Originals only when allowed.",
      [
        lesson({
          id: "ai-m3-l1",
          title: "AI_USAGE_ALLOWED is deny by default",
          kind: "text",
          minutes: 12,
          objective:
            "State that unknown AI usage rights are deny, especially on partner and external courses.",
          body: "Partner and external courses default AI_USAGE_ALLOWED to UNKNOWN or DENY. Unknown is deny. A quiz pass, a sandbox preview, or a prospective partner name does not flip that grant.\n\nDo not paste third-party course text into the tutor to 'make up for' a deny. That would copy content this program does not own.\n\nPlatform Essentials states the same rights default from the product-map side. This lesson is the AI-rights side: the tutor must not treat partner corpora as allowed.\n\nThere is no hidden override in a JWT or a URL.",
          examples: [
            "UNKNOWN on a prospective partner course → effective DENY.",
            "Passing this quiz does not allow AI on a partner catalog.",
            "Pasting a third-party lesson into the tutor is not a rights grant.",
          ],
          keyTakeaways: [
            "Unknown AI usage = deny.",
            "Partner/external default is deny.",
            "A quiz does not grant AI rights.",
            "Do not copy third-party course text into the tutor.",
          ],
          exercise: {
            title: "Rights sentence",
            prompt:
              "Write one sentence you could reuse: what happens when AI_USAGE_ALLOWED is UNKNOWN, and one thing that does not change that result.",
          },
          aiTutorContext:
            "AI_USAGE_ALLOWED unknown=deny on partner/external. Quiz/sandbox/prospective name do not grant. No third-party course paste. Overlap with Platform Essentials is rights-only, not a product-map clone.",
        }),
        lesson({
          id: "ai-m3-l2",
          title: "What the tutor may use from this pilot",
          kind: "text",
          minutes: 11,
          objective:
            "Limit AI Tutor to owned UMTUBA Originals text when allowed, and keep production ingest behind an explicit publish.",
          body: "UMTUBA AI Tutor may use this owned draft for sandbox preview when aiTutorAllowed is true. That is not a license to ingest the draft into a production corpus without an explicit publish.\n\nThe tutor may help you reread this course. It still does not always know the truth, still does not understand like a human, and still must not receive confidential information by default.\n\nLearning stores tutor threads in the product when that feature is enabled; this course does not claim a live external model brand.\n\nCertificates for completing this course are UMTUBA completion records, not an AI professional credential.",
          examples: [
            "Allowed source: this Original's lesson text.",
            "Not allowed: a partner PDF you uploaded to 'help the tutor.'",
            "Sandbox preview ≠ production publish.",
          ],
          keyTakeaways: [
            "Owned Originals only when allowed.",
            "Sandbox use is not production ingest.",
            "Tutor limits still apply: no truth machine, no secrets.",
            "Completion is not an AI license.",
          ],
          exercise: {
            title: "Allowed source list",
            prompt:
              "List two sources the tutor may use for this course and two it must not use (partner catalog, your password, a confidential file).",
          },
          aiTutorContext:
            "Tutor may use this owned Original when allowed. No production ingest without publish. Still not truth/human/professional. No confidential default. No vendor brand claims.",
        }),
        lesson({
          id: "ai-m3-q",
          title: "Check: tutor rights",
          kind: "quiz",
          minutes: 7,
          objective:
            "Apply deny-by-default and owned-only tutor rules.",
          body: "Answer from this module only. Prefer the option that treats AI as a pattern tool to verify.",
          aiTutorContext:
            "Quiz: UNKNOWN=DENY, owned draft only, quiz does not grant, no production ingest.",
          quiz: [
            quizQuestion(
              "ai-m3-q1",
              "If AI_USAGE_ALLOWED is UNKNOWN, the effective grant is…",
              [
                "ALLOW.",
                "DENY.",
                "ALLOW for sandbox only automatically in production.",
                "ALLOW after a quiz pass.",
              ],
              1,
              "UNKNOWN equals DENY."
            ),
            quizQuestion(
              "ai-m3-q2",
              "UMTUBA AI Tutor on this pilot may use…",
              [
                "Any partner catalog you name.",
                "This owned Original's text when allowed — not production ingest without publish.",
                "Your password, to personalize.",
                "A confidential workplace file, by default.",
              ],
              1,
              "Owned Originals only when allowed; publish is separate."
            ),
            quizQuestion(
              "ai-m3-q3",
              "Pasting a third-party course chapter into the tutor…",
              [
                "Is the approved way to unlock partner AI.",
                "Copies content this program does not own and does not grant rights.",
                "Issues a third-party certificate.",
                "Marks a partner ACTIVE.",
              ],
              1,
              "Do not copy third-party course text into the tutor."
            ),
            quizQuestion(
              "ai-m3-q4",
              "Sandbox tutor access means…",
              [
                "The course is in the public catalog.",
                "Preview on owned text is not the same as a production publish.",
                "AI now replaces professional judgment.",
                "Unknown partner rights flipped to ALLOW.",
              ],
              1,
              "Sandbox preview ≠ production publish."
            ),
          ],
        }),
      ]
    ),
    moduleOf(
      "ai-m4",
      "Practice and close",
      "Everyday use without vendor claims or professional substitution.",
      [
        lesson({
          id: "ai-m4-l1",
          title: "Everyday use, work, learning, and safe tools",
          kind: "text",
          minutes: 11,
          objective:
            "Use AI to outline or self-quiz on owned lessons, then verify — never as a partner contract or grade authority.",
          body: "Everyday use that fits this course: outline a lesson you already opened, ask for a practice question, or request a shorter wording of a takeaway you can check. Then verify against the lesson.\n\nDo not treat AI as a partner contract, a gradebook, a medical or legal advisor, or a reason to skip professional help. Do not treat a tutor reply as the official score for a Learning activity.\n\nWork and school files that are confidential stay out of the packet. Public, non-sensitive notes you already posted in the lesson are the safer side.\n\nNo vendor is endorsed. No claim is made that AI will replace your job or always help.",
          examples: [
            "Good: 'Quiz me on the four takeaways in this lesson.' Then check the lesson.",
            "Bad: 'Grade my official attempt and change my transcript.'",
            "Bad: 'Here is a confidential workplace dump; decide for my team.'",
          ],
          keyTakeaways: [
            "Outline and self-quiz, then verify.",
            "Not a contract, grade authority, or professional stand-in.",
            "Confidential work/school files stay out.",
            "No vendor hype and no job-replacement claim.",
          ],
          exercise: {
            title: "Everyday prompt + check",
            prompt:
              "Write one everyday tutor prompt for this course and one sentence you will check in the lesson afterward. No confidential files.",
          },
          aiTutorContext:
            "Everyday: outline/self-quiz on owned lessons + verify. Not grade authority, not professional advice, not partner contract. No vendor/job hype. No confidential defaults.",
        }),
        lesson({
          id: "ai-m4-r1",
          title: "Prompt worksheet",
          kind: "resource",
          minutes: 8,
          objective:
            "Fill a reusable owned-content prompt worksheet that requires uncertainty to be stated.",
          body: "Owned-content prompt worksheet:\n\n1. Lesson name I will allow as the only source: ________\n2. Task (outline / two bullets / one practice question): ________\n3. Length limit: ________\n4. Instruction if the lesson does not say: answer that it does not say.\n5. Secrets included? Must be NO.\n6. After the reply I will verify against: this lesson / I will mark unverified.\n\nDo not fill this worksheet with passwords, codes, cards, or other people's private records.",
          examples: [
            "Source: 'What AI is' lesson. Task: two bullets. Secrets: NO.",
            "If line 5 would be YES, stop and rewrite the prompt.",
          ],
          keyTakeaways: [
            "Name the allowed lesson.",
            "Require uncertainty.",
            "Secrets stay NO.",
            "Verification is part of the worksheet.",
          ],
          exercise: {
            title: "Complete the worksheet",
            prompt:
              "Fill lines 1–6 for one lesson in this course. Line 5 must be NO. Do not include confidential information.",
          },
          aiTutorContext:
            "Worksheet: owned lesson source, short task, uncertainty, secrets=NO, verify after. Not a dump of the whole course.",
        }),
        lesson({
          id: "ai-m4-q",
          title: "Check: verification habit",
          kind: "quiz",
          minutes: 6,
          objective:
            "Choose verification over publishing or professional substitution.",
          body: "Answer from this module only. Prefer the option that treats AI as a pattern tool to verify.",
          aiTutorContext:
            "Quiz: verify against lesson; not partner claim; not grade authority; not confidential unlock.",
          quiz: [
            quizQuestion(
              "ai-m4-q1",
              "After an AI Tutor answer you should…",
              [
                "Publish it as a live partner claim.",
                "Verify against the assigned lesson.",
                "Paste a card number to unlock more.",
                "Mark a prospective partner ACTIVE.",
              ],
              1,
              "Verify against the lesson."
            ),
            quizQuestion(
              "ai-m4-q2",
              "AI Tutor may officially change your Learning grade.",
              [
                "Yes, always.",
                "No. It is not the grade authority.",
                "Yes, if the answer is fluent.",
                "Yes, if you include a password.",
              ],
              1,
              "Tutor replies are not the official score path."
            ),
            quizQuestion(
              "ai-m4-q3",
              "Everyday AI use in this course includes…",
              [
                "Replacing a licensed professional without checking.",
                "Self-quiz on an owned lesson, then verify.",
                "Uploading confidential work files by default.",
                "Copying a third-party catalog into the tutor.",
              ],
              1,
              "Outline or self-quiz, then verify. No professional substitution."
            ),
          ],
        }),
      ]
    ),
  ],
};
