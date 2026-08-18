import type { UmtubaOriginalPilotCourse } from "./types";
import {
  PILOT_PASS_THRESHOLD_PERCENT,
  PILOT_PROGRESS_RULES,
  UMTUBA_CERTIFICATE_STATEMENT,
  UMTUBA_PILOT_AUTHOR,
} from "./types";

export const UMTUBA_PLATFORM_ESSENTIALS: UmtubaOriginalPilotCourse = {
  id: "c1e11111-1111-4111-8111-111111111111",
  slug: "umtuba-platform-essentials",
  title: "UMTUBA Platform Essentials",
  shortDescription:
    "A first-party map of the UMTUBA surfaces that exist today: account, Home/Watch, Create, Messages, Learning, Store, World, and privacy/safety.",
  fullDescription:
    "This UMTUBA Original teaches the product as it is shipped on web today. You will walk account and profile, Home and Watch, Create publishing, Messages, Learning, Store, and World. You will also learn the privacy pages, Support, and how to treat report/block and responsible use without inventing features that are not on the page. Store demo items stay non-purchasable. These originals stay draft until an explicit publish. The course does not document seller admin, ads admin, or live partner catalogs as available member tools.",
  targetAudience: "New UMTUBA members, staff testers, and anyone who needs a first-party orientation to the product.",
  level: "beginner",
  language: "en",
  category: "platform-orientation",
  prerequisites: [
    "A personal UMTUBA account you control.",
    "Ability to open the web app and sign in on a device you trust.",
    "No prior Store or Learning experience required.",
  ],
  learningObjectives: [
    "Name the supported member surfaces and what each is for, without claiming features that are not on those pages.",
    "Use account, profile, Settings, and sign-out as the security boundary.",
    "Publish only through Create (Video, Write Post, Image, Article) and treat Messages as 1:1 conversation.",
    "Use Learning, Store, and World as separate products that share one account.",
    "Apply privacy, Support, and responsible-use rules, including default-deny rights and non-purchasable demo Store items.",
  ],
  estimatedDurationMinutes: 85,
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
      id: "pe-m1",
      title: "Account, profile, and the product map",
      summary: "Your account is the boundary. The map lists only surfaces that exist on web today.",
      lessons: [
        {
          id: "pe-m1-l1",
          kind: "text",
          title: "Account, profile, and Settings",
          estimatedMinutes: 8,
          resource: null,
          quiz: [],
          body: `Your UMTUBA account is the security boundary for almost every action. Sign in at the login page with your own credentials. If you forgot the password, use the product forgot-password and update-password flows. Do not share a password, a recovery code, or a signed-in session. UMTUBA staff will not ask you to paste a password or a one-time code into chat.

After sign-in, Settings is the place to maintain the profile you control: display name, username, avatar, bio, city, country, notification preferences, language, and the account section that includes sign-out. Your public profile lives at /profile and at /profile/[username] for a creator handle. Treat those pages as identity and public presence, not as an admin console.

Legal and account-lifecycle pages that exist today are Privacy, Terms, Support, and Account deletion. Use those URLs when you need the policy text or to start deletion. Platform administrators are determined by the platform_admins table, not by a browser claim or a local environment variable. If a screen looks like an admin tool and you are not a platform admin, treat that as a bug to report through Support — not as permission you already have.

Do not paste partner API keys, service-role keys, or .env contents into Learning, Messages, Settings, or tickets. This course will not document seller dashboards, advertise consoles, or admin ads tools as everyday member surfaces. Those routes exist for specific roles. If you do not have that role, they are not available to you.`,
        },
        {
          id: "pe-m1-l2",
          kind: "text",
          title: "The honest product map",
          estimatedMinutes: 8,
          resource: null,
          quiz: [],
          body: `UMTUBA is one account shared across several products. The member surfaces this course will actually walk are: account and profile; Home (the Discovery Layer) and Watch; Create publishing; Messages; Learning; Store; World; and the privacy/Support pages. Desktop primary chrome lists Home, World, Learning, Live, and Messages. Home is the Discovery Layer. The /discover path is a forever alias of Home, not a second primary destination.

Treat each area as its own product with its own empty, loading, and error states. An empty grid is an honest state. Filling it with unauthorized inventory or invented partners is a rights problem.

This course is an UMTUBA Original. UMTUBA owns the text, quizzes, and certificate policy. It does not copy an external catalog and it does not name a live commerce or learning partner as if that partner were already contracted. If a surface shows Mock or Demo, that label is intentional: the item exists so the product can be tested.

Store and Learning are being built before company registration is complete. That decision does not authorize real partner inventory, real payouts, or outbound partnership messages. When you see a catalog item, ask who owns it, what rights were granted, and whether it is purchasable. Unknown rights are denied. Demo and mock items cannot become production-purchasable.

UMTUBA-owned originals can later use an UMTUBA AI Tutor and an UMTUBA certificate. Partner or external content cannot, unless a later rights grant says so. Today those grants default to deny. Live, Games, Following, Saved, Search, and Notifications exist as routes; this course mentions them so you do not confuse them with Store or Learning, and it will not invent extra tools on those pages.`,
        },
        {
          id: "pe-m1-q",
          kind: "quiz",
          title: "Check: account and product map",
          estimatedMinutes: 5,
          resource: null,
          body: "Answer from the two lessons in this module.",
          quiz: [
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
            {
              id: "pe-m1-q2",
              prompt: "What is Home on UMTUBA web today?",
              choices: [
                { id: "a", text: "A second app that replaces Watch." },
                { id: "b", text: "The Discovery Layer; /discover is a forever alias, not a separate primary destination." },
                { id: "c", text: "The only place Store checkout can complete a live partner purchase." },
                { id: "d", text: "An ads admin console for every member." },
              ],
              correctChoiceId: "b",
              explanation: "Home is the Discovery Layer. /discover aliases Home and is not a second primary nav item.",
            },
            {
              id: "pe-m1-q3",
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
          ],
        },
      ],
    },
    {
      id: "pe-m2",
      title: "Watch, Home, Create, and Messages",
      summary: "Media, publishing, and conversation as they ship on web today.",
      lessons: [
        {
          id: "pe-m2-l1",
          kind: "text",
          title: "Home, Watch, Following, and Saved",
          estimatedMinutes: 8,
          resource: null,
          quiz: [],
          body: `Home at / is the Discovery Layer: a feed of public posts. /discover is the same destination with a forever alias, so notifications that deep-link to /discover?post= still land on Home. Watch at /watch is the video viewing surface. A Watch URL can focus a public post. If a video is missing, Watch can show an empty or hold state. That is not a license to invent a partner catalog inside the player.

Following and Saved are separate lists: people you follow, and items you saved. Search at /search looks across the social surface. Notifications at /notifications carry in-product alerts. Live at /live is a live-room route. This course does not treat Live, Following, Saved, or Search as Store checkout or as Learning enrollment.

What these pages do not do: they do not complete a real commercial purchase, they do not publish a course, and they do not mark a partnership ACTIVE. If a Watch or Home card looks like a shoppable partner brand that UMTUBA has not authorized, treat it as a defect. Do not “complete the look” by scraping an external marketplace.`,
        },
        {
          id: "pe-m2-l2",
          kind: "text",
          title: "Create publishing and Messages",
          estimatedMinutes: 8,
          resource: null,
          quiz: [],
          body: `Create at /create is a chooser, not a video-only dead end. The supported publish types on web today are Video (/create/video), Write Post (/create/post), Image (Write Post with the image emphasis), and Article (/create/article). You must be signed in. Publish only content you have the right to share. Do not upload someone else’s photos, a partner catalog dump, or a file you cannot explain.

After you publish, the post can appear on Home and, for video, on Watch. An article has a public article page and can be linked from a profile. Create is not a Store listing form and it is not a Learning authoring console. Instructor Learning tools live under /learning/instructor for people who have that role. If you do not, those pages are not a member essential.

Messages at /messages is 1:1 conversation. You can open an existing conversation or start a DM from a profile when that control is present. Messages is not a partnership inbox and not a place to paste passwords, one-time codes, or .env contents. A chat that asks you to “activate a live marketplace feed” or to forward a login code is not an official UMTUBA recovery flow.`,
        },
        {
          id: "pe-m2-q",
          kind: "quiz",
          title: "Check: Watch, Create, and Messages",
          estimatedMinutes: 4,
          resource: null,
          body: "Answer from this module.",
          quiz: [
            {
              id: "pe-m2-q1",
              prompt: "Which Create types are supported on web today?",
              choices: [
                { id: "a", text: "Video only." },
                { id: "b", text: "Video, Write Post, Image, and Article." },
                { id: "c", text: "Live partner catalog import." },
                { id: "d", text: "Accredited university certificates." },
              ],
              correctChoiceId: "b",
              explanation: "The Create chooser lists Video, Write Post, Image, and Article.",
            },
            {
              id: "pe-m2-q2",
              prompt: "What is Messages for on UMTUBA web today?",
              choices: [
                { id: "a", text: "1:1 conversation, not a place to send passwords or partner secrets." },
                { id: "b", text: "The official outbound partnership mailbox." },
                { id: "c", text: "A live Store checkout." },
                { id: "d", text: "A second Discover primary destination." },
              ],
              correctChoiceId: "a",
              explanation: "Messages is 1:1 conversation. Secrets and partnership mail do not belong there.",
            },
          ],
        },
      ],
    },
    {
      id: "pe-m3",
      title: "Learning, Store, and World",
      summary: "Courses, commerce sandbox, and places — three products, one account.",
      lessons: [
        {
          id: "pe-m3-l1",
          kind: "text",
          title: "Learning without inventing partners",
          estimatedMinutes: 8,
          resource: null,
          quiz: [],
          body: `Learning at /learning is the member entry for courses. You can open a catalog, a course page, lessons, progress, and — when the course allows it — an AI Tutor page on a lesson. Instructor tools under /learning/instructor are for people with that role. This course does not treat every member as an instructor.

UMTUBA Originals are authored as drafts. A draft can contain modules, lessons, resources, quizzes, exercises, and a final assessment. Drafts are enough to test overview, next/previous lessons, progress, and quiz grading. They are not automatically published to Production and they must not appear in the public catalog until an explicit publish.

AI Tutor may prepare context from UMTUBA-owned text when AI_TUTOR_ALLOWED is yes. Ingest still requires a published original. Partner and external courses default AI_USAGE_ALLOWED to false. Certificates for these originals represent UMTUBA only. They are not a university degree and not an accredited license. Mock partner courses keep certificate ownership off UMTUBA, so UMTUBA issuance is denied.`,
        },
        {
          id: "pe-m3-l2",
          kind: "text",
          title: "Store sandbox and World places",
          estimatedMinutes: 8,
          resource: null,
          quiz: [],
          body: `Store at /store already has catalog, search, filters, product detail, variants, favorites/wishlist, cart, orders, and checkout routing. Those surfaces can be exercised with UMTUBA-owned demo concepts and with mock provider imports. They cannot be exercised with unauthorized third-party product data.

A demo product carries SOURCE_TYPE=DEMO, RIGHTS_STATUS=DEMO_ONLY, PURCHASABLE=NO, PRODUCTION_SELLABLE=NO, and REAL_PROVIDER=NONE. Images are UMTUBA or neutral placeholders, not scraped marketplace photos. Checkout may describe a sandbox path, but it must not complete a real commercial purchase. If a demo product offers a live paid checkout, stop and report it through Support.

World at /world is the places product: city and place pages and World search. On desktop, World is a primary nav item. It is not in the mobile bottom nav. World is not a Store shelf and not a Learning catalog. If a city page is empty, that can be an honest empty state while Discovery stays gated. Do not fill World with invented partner shops.

If a Store category is empty, show empty. If a filter returns nothing, show that. If an image right is missing, do not publish the image. These are successful tests, not failed merchandising.`,
        },
        {
          id: "pe-m3-q",
          kind: "quiz",
          title: "Check: Learning, Store, and World",
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
      title: "Privacy, safety, and responsible use",
      summary: "Use the pages that exist. Do not invent report tools or partner claims.",
      lessons: [
        {
          id: "pe-m4-l1",
          kind: "text",
          title: "Privacy, Support, report, and block",
          estimatedMinutes: 7,
          resource: null,
          quiz: [],
          body: `Privacy at /privacy, Terms at /terms, Support at /support, and Account deletion at /account-deletion are the policy and help pages that exist on web today. Read them when you need the actual rule. This course will not invent a second privacy policy.

If a post, profile, or conversation offers a Report or Block control, use that control for abuse, harassment, or content that should not stay in your feed. Blocking is a user-to-user safety action: it is not a Store takedown and not a way to mark a partnership ACTIVE. If those controls are not visible on the surface you are using, do not invent a workaround such as posting the material elsewhere or emailing a company that is not a partner. Use Support. Testers on this foundation branch should also write the finding in the internal task report.

When something looks wrong — a product that claims to be a real marketplace brand, a course that names a fabricated instructor, a checkout that offers to take money for a demo SKU — stop. Do not “fix” it by publishing the item. Do not scrape third-party catalogs to fill empty shelves. Empty, loading, and error states are first-class product states.`,
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

1. Confirm you are signed in on your own account, that Settings profile is yours, and that you can sign out.
2. Open Home or Watch. Confirm you did not treat them as a live partner shop.
3. Open Create. Confirm only Video, Write Post, Image, and Article are the publish types you used.
4. Open Messages only for 1:1 conversation. Confirm you did not paste secrets.
5. Open Store. Find at least one demo or mock item. Confirm the non-purchasable label and that checkout is denied.
6. Open Learning. Confirm UMTUBA Platform Essentials is still a draft unless a later GO published it.
7. Open World or Privacy/Support if you need places or policy text. Confirm you did not invent a report tool or a public partner claim.
8. Confirm you did not send an outbound partnership message and did not claim a real partnership is ACTIVE.

If any row fails, stop and use Support (and the internal task report if you are a tester). Do not invent inventory or partners to make the checklist pass.`,
        },
        {
          id: "pe-m4-q",
          kind: "quiz",
          title: "Check: privacy and responsible use",
          estimatedMinutes: 4,
          resource: null,
          body: "Answer from the privacy and checklist lessons.",
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
      title: "Walk three real surfaces",
      prompt:
        "Open Home or Watch, Create or Messages, and Store or Learning. Write one sentence for each: what the page is for, and one thing it does not do.",
      successCriteria: [
        "Each sentence names a surface that exists on web today.",
        "No sentence claims a live partner catalog, a second Discover primary dest, or a feature that was not on the page.",
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
