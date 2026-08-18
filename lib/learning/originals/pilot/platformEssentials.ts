import type { UmtubaOriginalPilotCourse } from "./types";
import { UMTUBA_CERTIFICATE_STATEMENT, UMTUBA_PILOT_AUTHOR } from "./types";

export const UMTUBA_PLATFORM_ESSENTIALS: UmtubaOriginalPilotCourse = {
  id: "c1e11111-1111-4111-8111-111111111111",
  slug: "umtuba-platform-essentials",
  title: "UMTUBA Platform Essentials",
  shortDescription:
    "Learn how UMTUBA is organized, how Store and Learning differ, and how to use the platform safely before any real partner commerce is live.",
  targetAudience: "New UMTUBA members, staff testers, and anyone who needs a first-party orientation to the product.",
  level: "beginner",
  language: "en",
  category: "platform-orientation",
  learningObjectives: [
    "Identify the main UMTUBA product areas and what each is for.",
    "Distinguish UMTUBA-owned content from mock or future partner content.",
    "Use account, privacy, and reporting controls that exist on the platform today.",
    "Explain why demo Store items are not purchasable and why originals stay draft until publish.",
    "Complete a first-party assessment that only certifies UMTUBA knowledge.",
  ],
  estimatedDurationMinutes: 70,
  authors: [UMTUBA_PILOT_AUTHOR],
  contentOwner: "UMTUBA",
  contentRights: "OWNED",
  aiTutorAllowed: true,
  status: "draft",
  modules: [
    {
      id: "pe-m1",
      title: "What UMTUBA is",
      summary: "A first-party map of the product, without claiming live partnerships or company-registration status.",
      lessons: [
        {
          id: "pe-m1-l1",
          kind: "text",
          title: "The product map",
          estimatedMinutes: 8,
          resource: null,
          quiz: [],
          body: `UMTUBA is a multi-product platform. The areas you will meet first are Home and Watch for media, Messages for conversation, Store for commerce, Learning for courses, and World for places. Each area has its own objects, permissions, and empty or loading states. Treat them as separate products that share an account, not as one undifferentiated feed.

This course is an UMTUBA Original. UMTUBA owns the text, quizzes, and certificate policy. It does not copy an external catalog and it does not name a live commerce or learning partner as if that partner were already contracted. If a surface shows the word Mock or Demo, that label is intentional. It means the item exists so the product can be tested, not so a customer can buy a real partner SKU.

Store and Learning are being built before company registration is complete. That decision does not authorize real partner inventory, real payouts, or outbound partnership messages. When you see a catalog item, ask three questions: who owns it, what rights were granted, and whether it is purchasable. Unknown rights are denied. Demo and mock items cannot become production-purchasable.

World, Create, and Collaboration are outside the scope of this course. You only need to know they exist so you do not assume every button on the shell is a Store or Learning action. If a feature is empty, that can be an honest empty state rather than a broken page. Honest empty is preferred to fake inventory.

Keep this map in mind for the rest of the course: UMTUBA-owned originals can later use an UMTUBA AI Tutor and an UMTUBA certificate. Partner or external content cannot, unless a later rights grant says so. Today, those grants default to deny.`,
        },
        {
          id: "pe-m1-l2",
          kind: "text",
          title: "Owned, mock, and future partner content",
          estimatedMinutes: 8,
          resource: null,
          quiz: [],
          body: `UMTUBA uses three content classes you should be able to name.

UMTUBA-owned originals are written by UMTUBA staff, stay in draft until someone explicitly publishes them, and may allow an UMTUBA AI Tutor after publish. A certificate for these courses represents UMTUBA only. It is not a university degree and it is not an accredited license.

Mock and demo Store items exist to exercise catalog, search, filters, product detail, variants, favorites, cart, and checkout sandbox states. They use SOURCE_TYPE=DEMO or MOCK_PROVIDER, rights DEMO_ONLY, and PURCHASABLE=NO. They must not look like a real marketplace listing from an unauthorized brand. They cannot be turned into a live checkout by flipping a flag.

Future partner content is a later event. A provider registry, import pipeline, and rights gate already exist so a real catalog can be reviewed when legal and contract work allow it. REAL_PARTNER_DATA cannot become ACTIVE in this pre-company foundation. If you are asked to import a partner feed today, the correct action is to refuse unless the item is mock-labeled and rights are granted.

If you cannot prove ownership or a grant, deny display, hosting, AI ingest, and checkout. That rule is older than this course and this course will not weaken it.`,
        },
        {
          id: "pe-m1-q",
          kind: "quiz",
          title: "Check: product map and ownership",
          estimatedMinutes: 5,
          resource: null,
          body: "Answer from the two lessons in this module.",
          quiz: [
            {
              id: "pe-m1-q1",
              prompt: "What does a Demo or Mock Store label mean on UMTUBA today?",
              choices: [
                { id: "a", text: "The item is live partner inventory and can be purchased." },
                { id: "b", text: "The item exists for product testing and is not a real partner SKU." },
                { id: "c", text: "The item is an accredited external course." },
                { id: "d", text: "The item automatically becomes purchasable after import." },
              ],
              correctChoiceId: "b",
              explanation: "Demo and mock labels mark test inventory. They are not real partner SKUs and cannot become production-purchasable.",
            },
            {
              id: "pe-m1-q2",
              prompt: "If ownership or a rights grant cannot be proven, what is the default?",
              choices: [
                { id: "a", text: "Allow display and deny checkout only." },
                { id: "b", text: "Allow AI ingest because the model is internal." },
                { id: "c", text: "Deny the unknown right." },
                { id: "d", text: "Publish first and review later." },
              ],
              correctChoiceId: "c",
              explanation: "Unknown rights default to DENY, including display, hosting, AI, and checkout.",
            },
            {
              id: "pe-m1-q3",
              prompt: "An UMTUBA Originals certificate represents which issuer?",
              choices: [
                { id: "a", text: "UMTUBA only." },
                { id: "b", text: "A named university partner." },
                { id: "c", text: "A government licensing board." },
                { id: "d", text: "Any provider that sent a course title." },
              ],
              correctChoiceId: "a",
              explanation: "UMTUBA certificates represent UMTUBA only. They are not accredited external credentials.",
            },
          ],
        },
      ],
    },
    {
      id: "pe-m2",
      title: "Accounts and on-platform safety",
      summary: "How to treat your UMTUBA account, sessions, and reporting tools.",
      lessons: [
        {
          id: "pe-m2-l1",
          kind: "text",
          title: "Your account is the security boundary",
          estimatedMinutes: 8,
          resource: null,
          quiz: [],
          body: `Your UMTUBA account is the boundary for almost every action on the platform. Do not share a password, a recovery code, or a session with another person, including a colleague who wants to “just check one screen.” If someone needs access, they need their own account and an explicit role.

Sign in only on devices you control. When you finish on a shared computer, sign out. If you see a session you do not recognize, revoke it from account settings if that control is available, and change the password. UMTUBA staff will not ask you to paste a password or a one-time code into chat.

Platform administrators are determined by the database table platform_admins, not by a claim in the browser or a local environment variable. If a screen looks like an admin tool but your account is not a platform admin, treat that as a bug to report, not as permission you already have.

Do not paste partner API keys, service-role keys, or .env contents into Learning, Messages, or tickets. Credential placeholders in the partner foundation store a vault reference and a presence flag only. Plaintext secrets are rejected.`,
        },
        {
          id: "pe-m2-l2",
          kind: "text",
          title: "Report, do not improvise",
          estimatedMinutes: 7,
          resource: null,
          quiz: [],
          body: `When something looks wrong — a product that claims to be a real marketplace brand, a course that names a fabricated instructor, a checkout that offers to take money for a demo SKU — stop and report it. Do not “fix” it by publishing the item or by marking a partnership ACTIVE.

Use in-product reporting when it exists. If you are a tester on this foundation branch, write the finding in the task report rather than sending an outbound message to a company that is not a partner.

Do not scrape third-party catalogs to fill empty Store shelves. Empty, loading, and error states are first-class product states. Filling them with unauthorized inventory creates a rights problem that is harder to undo than an empty grid.

If you are unsure whether a right is granted, the answer is no until a recorded grant exists. That is true for catalog display, image use, resale, content hosting, AI ingest, and certificates.`,
        },
        {
          id: "pe-m2-q",
          kind: "quiz",
          title: "Check: account and reporting",
          estimatedMinutes: 4,
          resource: null,
          body: "Answer from this module.",
          quiz: [
            {
              id: "pe-m2-q1",
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
            {
              id: "pe-m2-q2",
              prompt: "What should you do if a demo product offers a live paid checkout?",
              choices: [
                { id: "a", text: "Complete the purchase to test the bank." },
                { id: "b", text: "Stop and report it; demo items must not be purchasable." },
                { id: "c", text: "Import a real brand catalog so the price looks authentic." },
                { id: "d", text: "Mark a partnership ACTIVE so checkout can proceed." },
              ],
              correctChoiceId: "b",
              explanation: "Demo items are not purchasable. A live checkout on demo inventory is a defect to report.",
            },
          ],
        },
      ],
    },
    {
      id: "pe-m3",
      title: "Store and Learning today",
      summary: "What you can safely do in Store and Learning on this foundation.",
      lessons: [
        {
          id: "pe-m3-l1",
          kind: "text",
          title: "Store without a live partner checkout",
          estimatedMinutes: 8,
          resource: null,
          quiz: [],
          body: `Store already has catalog, search, filters, product detail, variants, favorites, cart, and checkout-mode routing. Those surfaces can be exercised with UMTUBA-owned demo concepts and with mock provider imports. They cannot be exercised with unauthorized third-party product data.

A demo product carries SOURCE_TYPE=DEMO, RIGHTS_STATUS=DEMO_ONLY, PURCHASABLE=NO, and REAL_PROVIDER=NONE. A mock import carries MOCK_PROVIDER provenance and stays isolated from the production-purchasable catalog. Checkout routing may describe affiliate redirect, wholesale quote, or reseller paths, but the rights gate returns not allowed for mock and demo items.

Do not bind a mock item into a live store_products row that customers can buy. The import pipeline may stage items and map SKUs. Publishing into the production catalog is denied for MOCK_DATA and for REAL_PARTNER_DATA in this foundation.

If a category is empty, show the empty state. If a filter returns nothing, show that. If an image right is missing, do not publish the image. These are successful tests, not failed merchandising.`,
        },
        {
          id: "pe-m3-l2",
          kind: "text",
          title: "Learning originals stay draft until publish",
          estimatedMinutes: 8,
          resource: null,
          quiz: [],
          body: `Learning originals are authored as drafts. A draft can contain modules, lessons, resources, quizzes, exercises, and a final assessment. Drafts are enough to test overview, progress, and quiz grading on this branch. They are not automatically published to Production.

AI Tutor may prepare context from UMTUBA-owned text when AI_TUTOR_ALLOWED is yes. Ingest into the tutor still requires a published original. That split lets testers confirm permissions without shipping a live tutor corpus by accident.

Certificates follow the same split. The policy is defined on the draft: issuer UMTUBA, represents UMTUBA only, passing score required, not an accredited credential. Issuance is denied until the original is explicitly published and the learner has passed the final assessment.

Partner and external courses, even mock ones, default AI_USAGE_ALLOWED to false and cannot receive an UMTUBA certificate unless certificate ownership is UMTUBA and the grant exists. Mock partner courses in this foundation keep certificate ownership on the provider and therefore deny UMTUBA issuance.`,
        },
        {
          id: "pe-m3-q",
          kind: "quiz",
          title: "Check: Store and Learning gates",
          estimatedMinutes: 5,
          resource: null,
          body: "Answer from this module.",
          quiz: [
            {
              id: "pe-m3-q1",
              prompt: "Which combination is correct for a demo Store product?",
              choices: [
                { id: "a", text: "SOURCE_TYPE=DEMO, PURCHASABLE=NO, REAL_PROVIDER=NONE." },
                { id: "b", text: "SOURCE_TYPE=PARTNER, PURCHASABLE=YES, REAL_PROVIDER=ACTIVE." },
                { id: "c", text: "SOURCE_TYPE=DEMO, PURCHASABLE=YES after import." },
                { id: "d", text: "SOURCE_TYPE=EXTERNAL, CHECKOUT_ALLOWED=true by default." },
              ],
              correctChoiceId: "a",
              explanation: "Demo products are explicitly non-purchasable and have no real provider.",
            },
            {
              id: "pe-m3-q2",
              prompt: "When may an UMTUBA Original use AI Tutor ingest?",
              choices: [
                { id: "a", text: "As soon as the draft is saved." },
                { id: "b", text: "After an explicit publish of UMTUBA-owned content with AI usage allowed." },
                { id: "c", text: "For any imported partner course." },
                { id: "d", text: "Whenever a quiz exists." },
              ],
              correctChoiceId: "b",
              explanation: "Context can be prepared on owned drafts; ingest requires a published UMTUBA original with AI allowed.",
            },
          ],
        },
      ],
    },
    {
      id: "pe-m4",
      title: "Practice and close",
      summary: "A checklist and a short practice for testers.",
      lessons: [
        {
          id: "pe-m4-l1",
          kind: "text",
          title: "A safe first session",
          estimatedMinutes: 6,
          resource: null,
          quiz: [],
          body: `A safe first session on UMTUBA looks like this. Sign in with your own account. Open Store and confirm that demo or mock items are labeled and that checkout is blocked. Open Learning and confirm this course is still a draft unless a later publish GO says otherwise. Do not send partnership email. Do not apply remote SQL for the pre-company foundation unless a later GO says to apply it.

If you are testing import, use mock provider A for Store and mock provider B for Learning. Expect negative rights cases to reject catalog display, images, resale, hosting, AI usage, or certificates. Keep the import audit even when items are unpublished.

When you finish, you should be able to explain the product map, the three content classes, and the permissions that stay denied by default. That is the outcome this original is designed to certify — UMTUBA platform knowledge, nothing else.`,
        },
        {
          id: "pe-m4-r1",
          kind: "resource",
          title: "First-session checklist",
          estimatedMinutes: 5,
          quiz: [],
          resource: {
            title: "UMTUBA first-session checklist",
            kind: "checklist",
            body: "1. Confirm you are on your own account.\n2. Confirm Store demo/mock items show a non-purchasable label.\n3. Confirm this original is draft unless a publish GO exists.\n4. Confirm you did not send outbound partner mail.\n5. Confirm you did not paste secrets into a ticket or chat.",
          },
          body: `Use this checklist at the end of a first session. It is an UMTUBA-owned resource, not a partner document.

1. Confirm you are signed in on your own account and that you can sign out.
2. Open Store. Find at least one demo or mock item. Confirm the non-purchasable label and that checkout is denied.
3. Open Learning. Confirm UMTUBA Platform Essentials is still a draft unless a later GO published it.
4. Confirm you did not send an outbound partnership message and did not claim a real partnership is ACTIVE.
5. Confirm you did not paste API keys, service-role keys, or .env contents into any surface.

If any row fails, stop and report. Do not invent inventory or partners to make the checklist pass.`,
        },
        {
          id: "pe-m4-q",
          kind: "quiz",
          title: "Check: safe first session",
          estimatedMinutes: 4,
          resource: null,
          body: "Answer from the checklist lesson.",
          quiz: [
            {
              id: "pe-m4-q1",
              prompt: "Which action belongs in a safe first session?",
              choices: [
                { id: "a", text: "Email a marketplace brand to ask for a live feed." },
                { id: "b", text: "Confirm demo items are labeled and checkout is denied." },
                { id: "c", text: "Apply SQL 20260929 to production so imports persist." },
                { id: "d", text: "Publish this course to Production automatically after the quiz." },
              ],
              correctChoiceId: "b",
              explanation: "The first session verifies labels and denied checkout. It does not outreach, apply remote SQL, or auto-publish.",
            },
          ],
        },
      ],
    },
  ],
  exercises: [
    {
      id: "pe-ex-1",
      title: "Label three surfaces",
      prompt:
        "Open Store, Learning, and one other product area. Write one sentence for each: what the area is for, and whether you saw owned, mock/demo, or empty content.",
      successCriteria: [
        "Each sentence names the product area correctly.",
        "Mock or demo content is not described as a live partner catalog.",
        "Empty is allowed and is not replaced with invented inventory.",
      ],
    },
    {
      id: "pe-ex-2",
      title: "Rights default deny",
      prompt:
        "Pick one Store right and one Learning right. Explain what happens when the grant is missing, using the default-deny rule.",
      successCriteria: [
        "The Store example denies display, image, resale, or checkout without a grant.",
        "The Learning example denies hosting, AI usage, or certificate issuance without a grant.",
        "No example treats unknown as allow.",
      ],
    },
  ],
  finalAssessment: [
    {
      id: "pe-fa-1",
      prompt: "UMTUBA Store and Learning before company registration may use which catalogs?",
      choices: [
        { id: "a", text: "Unauthorized third-party marketplace dumps." },
        { id: "b", text: "UMTUBA-owned demo items and mock provider imports only." },
        { id: "c", text: "Any public web scrape with prices removed." },
        { id: "d", text: "Live partner feeds marked REAL_PARTNER_DATA and ACTIVE." },
      ],
      correctChoiceId: "b",
      explanation: "Only UMTUBA-owned demo items and mock imports are in scope. Real partner ACTIVE is impossible in this foundation.",
    },
    {
      id: "pe-fa-2",
      prompt: "Unknown rights on this platform default to:",
      choices: [
        { id: "a", text: "Allow, then audit." },
        { id: "b", text: "Allow for metadata only." },
        { id: "c", text: "Deny." },
        { id: "d", text: "Allow for UMTUBA staff browsers." },
      ],
      correctChoiceId: "c",
      explanation: "Unknown rights DENY.",
    },
    {
      id: "pe-fa-3",
      prompt: "An UMTUBA Originals certificate:",
      choices: [
        { id: "a", text: "Represents UMTUBA only and is not an accredited external credential." },
        { id: "b", text: "Is a government license." },
        { id: "c", text: "Is issued in the name of a university partner." },
        { id: "d", text: "Can be issued for any imported partner course by default." },
      ],
      correctChoiceId: "a",
      explanation: "The certificate policy is UMTUBA-only and explicitly not accredited.",
    },
    {
      id: "pe-fa-4",
      prompt: "AI_USAGE_ALLOWED defaults to:",
      choices: [
        { id: "a", text: "True for every imported course." },
        { id: "b", text: "False, except UMTUBA-owned originals that set AI_TUTOR_ALLOWED." },
        { id: "c", text: "True when a course has a quiz." },
        { id: "d", text: "True for mock partner providers." },
      ],
      correctChoiceId: "b",
      explanation: "AI usage defaults false. UMTUBA-owned originals in this pilot set AI_TUTOR_ALLOWED=YES.",
    },
    {
      id: "pe-fa-5",
      prompt: "REAL_PARTNER_DATA in this foundation:",
      choices: [
        { id: "a", text: "Can be marked ACTIVE if a tester needs checkout." },
        { id: "b", text: "Cannot become ACTIVE." },
        { id: "c", text: "Is the default data class for mock imports." },
        { id: "d", text: "Unlocks production publish automatically." },
      ],
      correctChoiceId: "b",
      explanation: "SQL and TypeScript both block REAL_PARTNER_DATA + ACTIVE.",
    },
    {
      id: "pe-fa-6",
      prompt: "Platform administrators are determined by:",
      choices: [
        { id: "a", text: "platform_admins in the database." },
        { id: "b", text: "A cookie named admin=1." },
        { id: "c", text: "The machine hostname." },
        { id: "d", text: "Whoever deployed the last branch." },
      ],
      correctChoiceId: "a",
      explanation: "The workflow names platform_admins as the source of truth.",
    },
    {
      id: "pe-fa-7",
      prompt: "Original courses in this content start:",
      choices: [
        { id: "a", text: "Publish to Production automatically after the final quiz." },
        { id: "b", text: "Remain draft until an explicit publish." },
        { id: "c", text: "Are imported from an external university." },
        { id: "d", text: "Must be deleted after QA." },
      ],
      correctChoiceId: "b",
      explanation: "Draft first. No automatic Production publish.",
    },
    {
      id: "pe-fa-8",
      prompt: "If a Store image right is missing, the correct result is:",
      choices: [
        { id: "a", text: "Publish the image anyway for layout QA." },
        { id: "b", text: "Deny image publish." },
        { id: "c", text: "Hotlink a third-party marketplace CDN." },
        { id: "d", text: "Mark CHECKOUT_ALLOWED so the image can ship with the order." },
      ],
      correctChoiceId: "b",
      explanation: "IMAGE_USAGE_ALLOWED must be granted. Unknown is deny.",
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
