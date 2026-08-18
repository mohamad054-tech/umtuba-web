import type { UmtubaOriginalPilotCourse } from "./types";
import { UMTUBA_CERTIFICATE_STATEMENT, UMTUBA_PILOT_AUTHOR } from "./types";

export const AI_FUNDAMENTALS_FOR_EVERYONE: UmtubaOriginalPilotCourse = {
  id: "c1e33333-3333-4333-8333-333333333333",
  slug: "ai-fundamentals-for-everyone",
  title: "AI Fundamentals for Everyone",
  shortDescription:
    "What general-purpose AI can and cannot do, how to prompt without leaking secrets, and how UMTUBA’s AI Tutor is allowed to use first-party course text.",
  targetAudience: "Non-technical UMTUBA members who will meet AI Tutor on owned originals.",
  level: "beginner",
  language: "en",
  category: "ai-literacy",
  learningObjectives: [
    "Describe AI as a pattern-predicting tool, not a source of guaranteed facts.",
    "Spot hallucinations and verify claims against the lesson you were assigned.",
    "Write prompts that stay inside the course context and omit secrets.",
    "Explain why AI_USAGE_ALLOWED defaults to false on partner and external content.",
    "Use UMTUBA AI Tutor only on UMTUBA-owned published originals.",
  ],
  estimatedDurationMinutes: 70,
  authors: [UMTUBA_PILOT_AUTHOR],
  contentOwner: "UMTUBA",
  contentRights: "OWNED",
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
          title: "A predictor, not an authority",
          estimatedMinutes: 8,
          resource: null,
          quiz: [],
          body: `When people say “AI” in a product like UMTUBA, they usually mean a system that predicts the next useful span of text from a prompt and from allowed context. It can summarize a lesson you already have, suggest a practice question, or restate a definition in simpler words. It does not become an eyewitness, a lawyer, or a doctor because the sentences sound confident.

This course will not invent a benchmark score, a parameter count, or a university study. You do not need those numbers to use the tool safely. You need a working rule: if a statement matters, check it against a source you already trust. In this course, that source is the lesson text. On the wider web, that source might be a primary document you opened yourself.

AI is also not a search engine with a citation guarantee. It may blend patterns from training with the text you pasted. If you paste nothing and ask about a private UMTUBA policy that is not in the allowed context, a fluent answer can still be wrong.

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
          title: "A verification habit",
          estimatedMinutes: 6,
          resource: null,
          quiz: [],
          body: `Before you reuse a tutor sentence, ask two questions. First: is this claim in the lesson I was assigned? Second: if it is not, do I have another source I already trust? If both answers are no, keep the sentence in the “unverified” bucket.

This habit is enough for this course. It does not require a published accuracy percentage. This course does not invent one.

When you finish the final assessment, you may receive an UMTUBA certificate after an explicit publish and a passing score. That certificate says you completed an UMTUBA Original about AI fundamentals. It does not say you are a licensed engineer, and it does not say UMTUBA has live AI partnerships.`,
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
