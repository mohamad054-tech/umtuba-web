import type { UmtubaOriginalPilotCourse } from "./types";
import {
  PILOT_PASS_THRESHOLD_PERCENT,
  PILOT_PROGRESS_RULES,
  UMTUBA_CERTIFICATE_STATEMENT,
  UMTUBA_PILOT_AUTHOR,
} from "./types";

export const AI_FUNDAMENTALS_FOR_EVERYONE: UmtubaOriginalPilotCourse = {
  id: "c1e33333-3333-4333-8333-333333333333",
  slug: "ai-fundamentals-for-everyone",
  title: "AI Fundamentals for Everyone",
  shortDescription:
    "What AI and machine learning are, how generative language models work in practice, and how to use UMTUBA AI Tutor only on owned originals.",
  fullDescription:
    "This UMTUBA Original explains AI in everyday language: what it is, a basic machine-learning picture, generative AI and language models, prompts, strengths and limits, hallucinations, verification, privacy, responsible use, everyday applications, and AI at work and in learning. It names no live AI vendor as an UMTUBA partner and makes no unsupported claims about a specific provider’s scores or safety. UMTUBA AI Tutor may use this owned text after an explicit publish. Partner content stays AI_USAGE_ALLOWED=false.",
  targetAudience: "Non-technical UMTUBA members who will meet AI Tutor on owned originals.",
  level: "beginner",
  language: "en",
  category: "ai-literacy",
  prerequisites: [
    "Comfort reading short lessons in English.",
    "A personal UMTUBA account if you will try AI Tutor later.",
    "Digital Safety & Privacy Fundamentals is helpful for prompt hygiene but not required.",
  ],
  learningObjectives: [
    "Describe AI and machine learning as pattern tools, not sources of guaranteed facts.",
    "Explain generative AI and language models at a practical level, including prompts, strengths, and limits.",
    "Spot hallucinations and verify claims against the assigned lesson or another source you already trust.",
    "Use everyday and work/learning examples without leaking secrets or inventing vendor partnerships.",
    "Explain why AI_USAGE_ALLOWED defaults to false on partner content and when UMTUBA AI Tutor may ingest owned originals.",
  ],
  estimatedDurationMinutes: 90,
  passThresholdPercent: PILOT_PASS_THRESHOLD_PERCENT,
  progressRules: PILOT_PROGRESS_RULES,
  authors: [UMTUBA_PILOT_AUTHOR],
  contentOwner: "UMTUBA",
  contentRights: "OWNED",
  providerType: "UMTUBA_ORIGINAL",
  publishState: "DRAFT",
  aiTutorAllowed: true,
  status: "draft",
  modules: [
    {
      id: "ai-m1",
      title: "What AI is and is not",
      summary: "A practical model of the tool without invented research claims.",
      lessons: [
        {
          id: "ai-m1-l1",
          kind: "text",
          title: "What AI is, and a machine-learning picture",
          estimatedMinutes: 9,
          resource: null,
          quiz: [],
          body: `When people say “AI” in a product like UMTUBA, they usually mean software that predicts a useful next step from examples and from the prompt you just gave it. Machine learning is the usual way those systems are built: instead of a person writing a rule for every sentence, the system adjusts internal weights by seeing many examples. You do not need the math. You need the picture: the system is a pattern tool. It is not an eyewitness, a lawyer, or a doctor because the sentences sound confident.

This course will not invent a benchmark score, a parameter count, or a university study. It will not name a specific AI vendor as an UMTUBA partner and it will not claim that one named provider is “the safest” or “the most accurate.” You do not need those claims to use a tutor safely. You need a working rule: if a statement matters, check it against a source you already trust. In this course, that source is the lesson text.

Generative AI is the family of tools that produce new text, images, or audio that look like the examples they learned from. A language model is a generative system specialized for text: it predicts likely next words given a prompt and any allowed context. Strengths include summarizing a lesson you already have, suggesting a practice question, and restating a definition in simpler words. Limits include invented citations, outdated or blended facts, and fluent answers about topics that were never in context.

Treat the tutor as a study aid for UMTUBA-owned material. Treat it as untrusted for medical, legal, financial, or partnership advice. UMTUBA is not using this course to authorize real partnerships or real medical guidance.`,
        },
        {
          id: "ai-m1-l2",
          kind: "text",
          title: "Hallucinations are normal failure, not rare theater",
          estimatedMinutes: 8,
          resource: null,
          quiz: [],
          body: `A hallucination, in this course, is a confident statement that is not supported by the allowed source. The system is not “lying” in the human sense. It is completing a pattern. The completion can include a fake book title, a fake legal clause, or a fake UMTUBA partner.

Your job is to notice when a claim is checkable and then check it. If the tutor says this course has twelve modules, open the overview. It has four. If the tutor names an instructor at a university, reject it. UMTUBA Originals do not fabricate external instructors.

If you cannot check a claim, do not repeat it as fact. Say “the tutor suggested X; I have not verified it.” That sentence is more honest than deleting the uncertainty to sound finished.

Quizzes in this program are written from the lessons. If the tutor and the lesson disagree, the lesson wins for this course. That is an assessment rule, not a claim about all of science.`,
        },
        {
          id: "ai-m1-q",
          kind: "quiz",
          title: "Check: what AI is",
          estimatedMinutes: 5,
          resource: null,
          body: "Answer from this module.",
          quiz: [
            {
              id: "ai-m1-q1",
              prompt: "In this course, general-purpose AI is best described as:",
              choices: [
                { id: "a", text: "A predictor of useful text, not an automatic authority." },
                { id: "b", text: "A replacement for platform_admins." },
                { id: "c", text: "A live partner contract desk." },
                { id: "d", text: "A guaranteed citation engine." },
              ],
              correctChoiceId: "a",
              explanation: "The working model is pattern prediction plus verification against a trusted source.",
            },
            {
              id: "ai-m1-q2",
              prompt: "If the tutor and the lesson disagree on a quiz fact, what wins?",
              choices: [
                { id: "a", text: "The tutor, because it is newer." },
                { id: "b", text: "The lesson assigned in this course." },
                { id: "c", text: "A third-party marketplace FAQ." },
                { id: "d", text: "The first search result you see." },
              ],
              correctChoiceId: "b",
              explanation: "Assessments are written from the lessons. The lesson is the source of truth here.",
            },
            {
              id: "ai-m1-q3",
              prompt: "A fluent answer about a private policy that was not in context should be treated as:",
              choices: [
                { id: "a", text: "Verified UMTUBA policy." },
                { id: "b", text: "Untrusted until you check a source you already have." },
                { id: "c", text: "A signed partner contract." },
                { id: "d", text: "Enough to mark REAL_PARTNER_DATA ACTIVE." },
              ],
              correctChoiceId: "b",
              explanation: "Fluency is not verification.",
            },
          ],
        },
      ],
    },
    {
      id: "ai-m2",
      title: "Prompts and privacy",
      summary: "Ask for help without handing over secrets or other people’s data.",
      lessons: [
        {
          id: "ai-m2-l1",
          kind: "text",
          title: "A prompt is a context packet",
          estimatedMinutes: 8,
          resource: null,
          quiz: [],
          body: `A useful prompt names the task, the allowed material, and the format you want back. Example: “Explain the difference between draft and published UMTUBA originals in three bullets, using only this lesson.” That prompt is better than “tell me everything about AI.”

Include constraints that prevent the model from inventing partners or instructors: “Do not name companies as live UMTUBA partners. Do not invent instructors.” If you need a practice quiz, ask it to use only the lesson you paste or that the tutor is already allowed to read.

Do not ask the tutor to complete a real legal filing, a medical diagnosis, or a live payout change. Those tasks need humans and official product flows. The tutor can help you rehearse a definition. It cannot authorize a partnership.

When the answer is long, ask for the part you will actually use. “Give me two quiz-style questions about hallucinations, with answers from this lesson” is a complete request.`,
        },
        {
          id: "ai-m2-l2",
          kind: "text",
          title: "Nothing secret goes in the packet",
          estimatedMinutes: 7,
          resource: null,
          quiz: [],
          body: `The prompt is stored and processed. Treat it as a message you might have to show a reviewer later. Do not put passwords, one-time codes, card numbers, government identifiers, API keys, or .env contents into it.

Do not paste another learner’s essay or a coworker’s personnel note to “get feedback.” You do not have the right to put that person into the tutor context. Use a short invented example instead.

UMTUBA’s partner credential model stores a vault_ref and a status, never a plaintext secret. If you are writing a prompt about that model, describe the rule. Do not demonstrate it with a real key.

If you accidentally paste a secret, stop. Change the secret in the official product or vault. Do not ask the tutor to “forget it.” Forgetting is not a control you can verify from the chat window.`,
        },
        {
          id: "ai-m2-q",
          kind: "quiz",
          title: "Check: prompts",
          estimatedMinutes: 4,
          resource: null,
          body: "Answer from this module.",
          quiz: [
            {
              id: "ai-m2-q1",
              prompt: "Which prompt is better for this course?",
              choices: [
                { id: "a", text: "Tell me everything about AI." },
                { id: "b", text: "Explain draft versus published originals in three bullets, using only this lesson." },
                { id: "c", text: "Here is our production service-role key; check if it is valid." },
                { id: "d", text: "List live UMTUBA shopping partners and their commission rates." },
              ],
              correctChoiceId: "b",
              explanation: "A good prompt names the task, the source, and the format, and it omits secrets and fake partners.",
            },
            {
              id: "ai-m2-q2",
              prompt: "You pasted a live API key into a prompt. What next?",
              choices: [
                { id: "a", text: "Ask the tutor to forget it and continue." },
                { id: "b", text: "Rotate or revoke the secret in the official vault or product, then stop using that prompt." },
                { id: "c", text: "Post the key in Learning so staff can reset it." },
                { id: "d", text: "Email it to a marketplace for confirmation." },
              ],
              correctChoiceId: "b",
              explanation: "Chat forget is not a verified control. Rotate the secret in the real system.",
            },
          ],
        },
      ],
    },
    {
      id: "ai-m3",
      title: "UMTUBA AI Tutor rules",
      summary: "Owned content may use the tutor. Partner and external content default deny.",
      lessons: [
        {
          id: "ai-m3-l1",
          kind: "text",
          title: "AI_USAGE_ALLOWED is deny by default",
          estimatedMinutes: 8,
          resource: null,
          quiz: [],
          body: `On UMTUBA Learning, AI_USAGE_ALLOWED defaults to false. That is a rights decision, not a model-quality decision. Partner and external courses may be useful and still be illegal or contractual to ingest. Unknown rights deny ingest.

UMTUBA Originals in this pilot set AI_TUTOR_ALLOWED to yes because UMTUBA owns the text. Even then, ingest waits for an explicit publish. A draft can prepare context — titles and lesson bodies — so testers can see what the tutor would be allowed to read. Preparing context is not the same as publishing a corpus to Production.

If a mock partner course arrives with AI_USAGE_ALLOWED false, the tutor must refuse ingest. Do not “help” by pasting the partner lesson into an owned-course prompt. That is a side-channel ingest and it violates the same rule.

Certificates are a separate right. The tutor must not tell a learner they have an accredited external diploma. An UMTUBA certificate represents UMTUBA only.`,
        },
        {
          id: "ai-m3-l2",
          kind: "text",
          title: "What the tutor may use from this pilot",
          estimatedMinutes: 8,
          resource: null,
          quiz: [],
          body: `When this original is published, the tutor may use the overview, module summaries, lesson bodies, resource text, quiz stems, and the certificate policy statement. It may help you rehearse. It may not change a grade by itself. Grading stays in the assessment path: you submit answers, the course scores them, completion requires passed quizzes and a passed final.

The tutor may not fetch a third-party course to “fill in gaps.” If a topic is outside these lessons, the honest answer is that this course does not cover it. Inventing a citation does not fix the gap.

The tutor may not mark a Store demo item as purchasable or a partnership as ACTIVE. Those gates live in Store and partner admin, not in a chat completion.

If you are testing as staff, use the prepared context list from the draft. Confirm each excerpt is UMTUBA-owned. Confirm no partner brand token is present. Then stop. Do not publish this course to Production unless a later GO says to publish.`,
        },
        {
          id: "ai-m3-q",
          kind: "quiz",
          title: "Check: tutor rights",
          estimatedMinutes: 5,
          resource: null,
          body: "Answer from this module.",
          quiz: [
            {
              id: "ai-m3-q1",
              prompt: "AI_USAGE_ALLOWED defaults to:",
              choices: [
                { id: "a", text: "False, including on partner and external content." },
                { id: "b", text: "True for every imported title." },
                { id: "c", text: "True when a certificate policy exists." },
                { id: "d", text: "True for demo Store products." },
              ],
              correctChoiceId: "a",
              explanation: "Default false. Owned originals in this pilot opt in explicitly.",
            },
            {
              id: "ai-m3-q2",
              prompt: "Pasting a mock partner lesson into an owned-course tutor prompt is:",
              choices: [
                { id: "a", text: "Allowed because the partner course is already in the database." },
                { id: "b", text: "A side-channel ingest and is not allowed." },
                { id: "c", text: "Required for certificate issuance." },
                { id: "d", text: "How REAL_PARTNER_DATA becomes ACTIVE." },
              ],
              correctChoiceId: "b",
              explanation: "Rights gates apply to the content, not only to the official import button.",
            },
          ],
        },
      ],
    },
    {
      id: "ai-m4",
      title: "Practice and close",
      summary: "A prompt worksheet and the limits of this certificate.",
      lessons: [
        {
          id: "ai-m4-l1",
          kind: "text",
          title: "Everyday use, work, learning, and safe tools",
          estimatedMinutes: 8,
          resource: null,
          quiz: [],
          body: `Everyday applications that stay honest: ask a tutor to restate a definition from this lesson, draft a practice quiz from a module you already read, or turn a long paragraph into three bullets you will still check. Applications that leave this course: medical diagnosis, legal filings, live payout changes, and “list UMTUBA’s shopping partners.” Those need humans and official product flows.

At work and in learning, AI can speed a first draft. It cannot own the grade, the rights decision, or the publish. On UMTUBA, grading stays in the assessment path. Certificate issuance stays on the UMTUBA-only policy after an explicit publish. A workplace that pastes customer data or a teammate’s personnel note into a prompt is doing a privacy failure, not a productivity trick.

Safe tools, in this course, means: use the UMTUBA AI Tutor only on UMTUBA-owned published originals; do not paste partner lessons into an owned prompt; do not paste secrets; do not treat a third-party chatbot as an UMTUBA policy desk. This course will not rank or endorse a named external AI provider. If you use another tool on your own, apply the same verification and privacy rules — and do not put UMTUBA secrets there either.

Before you reuse a tutor sentence, ask two questions. First: is this claim in the lesson I was assigned? Second: if it is not, do I have another source I already trust? If both answers are no, keep the sentence unverified. When you finish the final assessment, you may receive an UMTUBA certificate after an explicit publish and a passing score. That certificate says you completed an UMTUBA Original about AI fundamentals. It does not say you are a licensed engineer, and it does not say UMTUBA has live AI partnerships.`,
        },
        {
          id: "ai-m4-r1",
          kind: "resource",
          title: "Prompt worksheet",
          estimatedMinutes: 5,
          quiz: [],
          resource: {
            title: "Owned-content prompt worksheet",
            kind: "worksheet",
            body: "Task:\nAllowed source:\nFormat:\nForbidden: secrets, live partners, fabricated instructors\nVerification step:",
          },
          body: `Use this worksheet when you draft a tutor prompt for an UMTUBA original.

- Task: what you want back
- Allowed source: this lesson or this module
- Format: bullets, a short quiz, or a restated definition
- Forbidden: secrets, live partner names, fabricated instructors
- Verification: which sentence you will check against the lesson

If you cannot fill Allowed source, do not send the prompt.`,
        },
        {
          id: "ai-m4-q",
          kind: "quiz",
          title: "Check: verification habit",
          estimatedMinutes: 3,
          resource: null,
          body: "Answer from this module.",
          quiz: [
            {
              id: "ai-m4-q1",
              prompt: "An UMTUBA certificate for this course states that you:",
              choices: [
                { id: "a", text: "Completed an UMTUBA Original; it represents UMTUBA only." },
                { id: "b", text: "Hold an accredited engineering license." },
                { id: "c", text: "May mark real partnerships ACTIVE." },
                { id: "d", text: "May ingest any partner course into the tutor." },
              ],
              correctChoiceId: "a",
              explanation: "The certificate is UMTUBA-only completion evidence.",
            },
          ],
        },
      ],
    },
  ],
  exercises: [
    {
      id: "ai-ex-1",
      title: "Write a constrained prompt",
      prompt:
        "Write one tutor prompt that asks for a two-question practice quiz from this course’s hallucination lesson. Include a constraint that forbids invented partners and instructors.",
      successCriteria: [
        "The prompt names the allowed lesson.",
        "The prompt forbids invented partners and instructors.",
        "The prompt contains no secrets.",
      ],
    },
    {
      id: "ai-ex-2",
      title: "Mark verified versus unverified",
      prompt:
        "Take one sentence a tutor might say about UMTUBA certificates and mark it verified or unverified against this course. Quote the lesson line you used.",
      successCriteria: [
        "The sentence is classified verified or unverified.",
        "A lesson line is quoted for verified claims.",
        "Unverified claims are not restated as policy.",
      ],
    },
    {
      id: "ai-ex-3",
      title: "Everyday versus unsafe ask",
      prompt:
        "Write one everyday learning prompt that stays inside this course, and one ask you would refuse (medical, legal, secret, or invented partner). Say why the second is refused.",
      successCriteria: [
        "The allowed prompt names this course or lesson as the source.",
        "The refused ask is medical, legal, secret, or a fake partnership.",
        "No specific AI vendor is claimed as an UMTUBA partner.",
      ],
    },
  ],
  finalAssessment: [
    {
      id: "ai-fa-1",
      prompt: "This course treats general-purpose AI as:",
      choices: [
        { id: "a", text: "A predictor you must verify, not an automatic authority." },
        { id: "b", text: "A replacement for rights gates." },
        { id: "c", text: "A source of live partner contracts." },
        { id: "d", text: "A guaranteed search index." },
      ],
      correctChoiceId: "a",
      explanation: "Verification against a trusted source is required.",
    },
    {
      id: "ai-fa-2",
      prompt: "A hallucination in this course is:",
      choices: [
        { id: "a", text: "Any long answer." },
        { id: "b", text: "A confident statement not supported by the allowed source." },
        { id: "c", text: "A passed quiz." },
        { id: "d", text: "A draft course." },
      ],
      correctChoiceId: "b",
      explanation: "Confidence without support is the failure mode to watch.",
    },
    {
      id: "ai-fa-3",
      prompt: "AI_USAGE_ALLOWED on partner content defaults to:",
      choices: [
        { id: "a", text: "False." },
        { id: "b", text: "True." },
        { id: "c", text: "True if the title contains UMTUBA." },
        { id: "d", text: "True after a quiz pass." },
      ],
      correctChoiceId: "a",
      explanation: "Unknown and default AI usage is deny.",
    },
    {
      id: "ai-fa-4",
      prompt: "UMTUBA AI Tutor ingest for originals requires:",
      choices: [
        { id: "a", text: "A saved draft only." },
        { id: "b", text: "UMTUBA-owned content with AI allowed and an explicit publish." },
        { id: "c", text: "Any imported partner course." },
        { id: "d", text: "A Store checkout." },
      ],
      correctChoiceId: "b",
      explanation: "Owned + allowed + published. Drafts may prepare context only.",
    },
    {
      id: "ai-fa-5",
      prompt: "Which item may go in a tutor prompt?",
      choices: [
        { id: "a", text: "A service-role key." },
        { id: "b", text: "A question about the assigned lesson." },
        { id: "c", text: "Another person’s identification number." },
        { id: "d", text: "A production .env file." },
      ],
      correctChoiceId: "b",
      explanation: "Lesson questions are in scope. Secrets and other people’s data are not.",
    },
    {
      id: "ai-fa-6",
      prompt: "If the tutor invents an external instructor for an UMTUBA original, you should:",
      choices: [
        { id: "a", text: "Add that instructor to the course authors." },
        { id: "b", text: "Reject it; originals do not fabricate external instructors." },
        { id: "c", text: "Publish the course so the name becomes official." },
        { id: "d", text: "Issue a certificate in that instructor’s university name." },
      ],
      correctChoiceId: "b",
      explanation: "No fabricated external instructors.",
    },
    {
      id: "ai-fa-7",
      prompt: "Pasting a partner lesson into an owned tutor chat is:",
      choices: [
        { id: "a", text: "A side-channel ingest and is denied." },
        { id: "b", text: "The approved way to grant AI_USAGE_ALLOWED." },
        { id: "c", text: "Required for UMTUBA certificates." },
        { id: "d", text: "How demo products become purchasable." },
      ],
      correctChoiceId: "a",
      explanation: "Rights apply to the content, including paste.",
    },
    {
      id: "ai-fa-8",
      prompt: "An UMTUBA certificate for this course represents:",
      choices: [
        { id: "a", text: "UMTUBA only." },
        { id: "b", text: "An accredited university." },
        { id: "c", text: "A government AI license." },
        { id: "d", text: "A live commerce partner." },
      ],
      correctChoiceId: "a",
      explanation: "Certificates represent UMTUBA only.",
    },
  ],
  certificatePolicy: {
    issuer: "UMTUBA",
    represents: "UMTUBA_ONLY",
    requiresFinalAssessmentPass: true,
    passingScorePercent: 70,
    notAnAccreditedCredential: true,
    statement: UMTUBA_CERTIFICATE_STATEMENT,
  },
};
