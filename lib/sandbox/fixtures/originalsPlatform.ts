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

export const PLATFORM_ESSENTIALS: UmtubaOriginalCourse = {
  ...ORIGINAL_BASE,
  id: "sandbox-original-platform-essentials",
  slug: "umtuba-platform-essentials",
  title: "UMTUBA Platform Essentials",
  shortDescription:
    "First-party draft: your account, Home/Watch, Create, Messages, Learning, Store, World, and in-product privacy pages. Not in the public catalog.",
  instructorId: "demo-instructor-07",
  exercises: [
    {
      id: "pe-ex-1",
      title: "Walk three real surfaces",
      prompt:
        "Open Home or Watch, Create or Messages, and Store or Learning. Write one sentence for each: what the page is for, and one thing it does not do. Do not enter a real payment method and do not paste any password.",
    },
    {
      id: "pe-ex-2",
      title: "Rights default deny",
      prompt:
        "Pick one Store right and one Learning right from this course. Explain what happens when the grant is missing. Do not contact a prospective partner.",
    },
  ],
  certificateCopy: {
    courseName: "UMTUBA Platform Essentials",
    learnerNamePlaceholder: "{{LEARNER_NAME}}",
    completionStatement:
      "This certifies that {{LEARNER_NAME}} completed UMTUBA Platform Essentials.",
    issuer: "UMTUBA",
    completionDatePlaceholder: "{{COMPLETION_DATE}}",
    certificateIdPlaceholder: "{{CERTIFICATE_ID}}",
    disclaimer: ORIGINALS_CERTIFICATE_DISCLAIMER,
  },
  finalAssessment: {
    id: "pe-final",
    title: "Platform Essentials — course check",
    objective:
      "Apply the four modules: account boundary, media/create/messages, Learning/Store/World, and responsible first-session use.",
    body: "Answer from this course only. This maps to one score-mode Learning activity. Passing is 4 of 5 points. You may start a new attempt if you do not pass. Completing lessons alone does not issue a certificate until course progress is completed and this score-mode activity has a progress application.",
    estimatedMinutes: 12,
    maxScore: 5,
    passingScore: 4,
    maxAttempts: null,
    completionMode: "score",
    completionRelationship: ORIGINALS_COMPLETION_RELATIONSHIP,
    quiz: [
      quizQuestion(
        "pe-final-q1",
        "Someone says they are a platform administrator because their login token lists an admin role. What is the product rule?",
        [
          "A JWT claim or environment variable is enough.",
          "Anyone who can open an /admin URL is an administrator.",
          "Platform administrators are determined by the platform_admins table.",
          "A completed Learning quiz grants admin rights.",
        ],
        2,
        "Administrator status is database-backed in platform_admins, not a token claim or a URL."
      ),
      quizQuestion(
        "pe-final-q2",
        "A Messages thread asks you to paste a login code so Create can 'finish publishing.' What do you do?",
        [
          "Paste the code so publishing continues.",
          "Refuse. Messages is 1:1 conversation, not official recovery or a place for secrets.",
          "Forward the code to Store checkout.",
          "Post the code in a Learning discussion.",
        ],
        1,
        "Messages is conversation. Official account recovery stays on account pages."
      ),
      quizQuestion(
        "pe-final-q3",
        "You open a Store item labeled DEMO. Which combination is correct?",
        [
          "SOURCE_TYPE=DEMO, PURCHASABLE=NO, REAL_PROVIDER=NONE.",
          "DEMO items become purchasable after you import a catalog.",
          "Checkout is allowed by default for DEMO items.",
          "DEMO means a live partner feed is already connected.",
        ],
        0,
        "Demo listings are explicitly non-purchasable and are not a real provider."
      ),
      quizQuestion(
        "pe-final-q4",
        "This Original is still DRAFT. What does that mean for the public catalog and AI Tutor?",
        [
          "It is already in the public catalog and auto-published.",
          "It stays out of the public catalog until an explicit publish. AI Tutor may use owned text only when allowed.",
          "Partner courses automatically inherit AI Tutor on this draft.",
          "A quiz pass publishes the course.",
        ],
        1,
        "Originals stay draft and unpublished until an explicit publish. AI Tutor is owned-content only when allowed."
      ),
      quizQuestion(
        "pe-final-q5",
        "Empty Store or Learning states look unfinished. What is the responsible action?",
        [
          "Invent inventory or email a marketplace brand to fill the gap.",
          "Mark a prospective partner ACTIVE so the page looks complete.",
          "Use the pages that exist. Do not invent partners, inventory, or a live checkout.",
          "Apply a production SQL hotfix from a chat message.",
        ],
        2,
        "Empty or Demo-labeled states are intentional. Do not invent partners or inventory."
      ),
    ],
  },
  modules: [
    moduleOf(
      "pe-m1",
      "Account, profile, and the product map",
      "The account is the boundary. Settings holds the profile you control.",
      [
        lesson({
          id: "pe-m1-l1",
          title: "Account, profile, and Settings",
          kind: "text",
          minutes: 12,
          objective:
            "Explain why the UMTUBA account is the security boundary and where you change the profile you control.",
          body: "Your UMTUBA account is the security boundary for what you can see and do. Sign-in, password updates, and profile edits belong on official account and Settings pages — not in Messages, Learning, or a ticket thread.\n\nSettings holds the profile you control: the display details you chose to show. A public profile is not a place for recovery codes, backup phrases, or environment files.\n\nPlatform administrators are determined by the platform_admins table, not a JWT claim and not a local environment variable. Opening an /admin URL does not make someone an administrator.\n\nIf a person asks you to paste a password, one-time code, or service key into chat, treat that as unsafe — even if they sound official. Staff will not ask you to do that.",
          examples: [
            "You change a display name in Settings. That is a profile edit you control.",
            "A chat claims 'paste your code so we can verify you as admin.' That is not how platform_admins works.",
            "A browser bookmark to /admin does not grant administrator status.",
          ],
          keyTakeaways: [
            "The account is the security boundary.",
            "Settings holds the profile you control.",
            "Administrators come from platform_admins, not a token or a URL.",
            "Never paste secrets into Learning, Messages, or tickets.",
          ],
          exercise: {
            title: "Name the boundary",
            prompt:
              "Write two lists: (1) things that belong on Settings or official account pages, and (2) things that must never be pasted into Messages or Learning. Do not write a real password.",
          },
          aiTutorContext:
            "This lesson is about the UMTUBA account as the security boundary, Settings as the profile the learner controls, and platform_admins as the source of administrator status. Do not invent extra admin consoles. Never ask for passwords or codes.",
        }),
        lesson({
          id: "pe-m1-l2",
          title: "The honest product map",
          kind: "text",
          minutes: 12,
          objective:
            "List the member surfaces this course actually walks and say what each is not.",
          body: "This course walks surfaces that exist today: account and Settings; Home (the signed-in home feed, with /discover as a forever alias); Watch; Saved; Search; Live; Messages; Create (video and article); Learning; Store; World; Games; and the Privacy and Terms pages.\n\nDemo and Mock labels are intentional. They mean the item is not live inventory and not a real partner. Unknown rights are denied.\n\nThis map is not a promise that every empty state will be filled. Do not invent a Following destination, a Write Post or Image Create flow, a Support inbox, or a Block page if you cannot open it. Follow and Report appear as in-product actions where they exist (for example Follow on profiles and video, Report on Live).\n\nHome section circles can point to Learning, Store, Games, and Live. Those are separate products that share one account.",
          examples: [
            "You open / and then /discover. You are still in Home, not a second product.",
            "A listing marked DEMO is not a live shop item.",
            "World is places, not a second Store.",
          ],
          keyTakeaways: [
            "Walk pages that exist; do not invent missing ones.",
            "/discover is a Home alias, not a second primary destination.",
            "Demo and Mock labels are intentional.",
            "Unknown rights are denied.",
          ],
          exercise: {
            title: "Map eight surfaces",
            prompt:
              "List eight surfaces from this lesson. For each, write one phrase: what it is for. Do not add a feature you have not opened.",
          },
          aiTutorContext:
            "Honest product map for current UMTUBA web: Home (/ and /discover alias), Watch, Saved, Search, Live, Messages, Create video/article, Learning, Store, World, Games, Privacy, Terms, Settings. Do not invent Following as a page, Write Post/Image Create, or a dedicated Support/Block site. Unknown rights deny.",
        }),
        lesson({
          id: "pe-m1-q",
          title: "Check: account and product map",
          kind: "quiz",
          minutes: 7,
          objective:
            "Apply the account boundary and the honest product map to short scenarios.",
          body: "Answer from this module only. Choose the option that matches the product as it exists.",
          aiTutorContext:
            "Quiz on platform_admins, Settings vs secrets, Home/discover alias, and not inventing surfaces. Do not introduce extra products.",
          quiz: [
            quizQuestion(
              "pe-m1-q1",
              "How is a platform administrator determined?",
              [
                "A JWT claim alone.",
                "A local environment variable alone.",
                "The platform_admins database table.",
                "Whoever can open /admin in the browser.",
              ],
              2,
              "Database authorization in platform_admins is the source of truth."
            ),
            quizQuestion(
              "pe-m1-q2",
              "Where should you change the display name you control?",
              [
                "In a Messages thread with anyone who says they are staff.",
                "On Settings / official account pages.",
                "By pasting a recovery code into Learning.",
                "By emailing a marketplace brand.",
              ],
              1,
              "Settings holds the profile you control."
            ),
            quizQuestion(
              "pe-m1-q3",
              "You open /discover after Home. What is true?",
              [
                "/discover is a second primary destination that replaces Home.",
                "/discover is a forever alias of Home.",
                "/discover completes a Store purchase.",
                "/discover publishes this course.",
              ],
              1,
              "Home is the Discovery Layer; /discover is a forever alias."
            ),
            quizQuestion(
              "pe-m1-q4",
              "A page looks empty. What should you do?",
              [
                "Invent inventory or a partner so the page looks finished.",
                "Use the pages that exist and leave Demo/Mock labels in place.",
                "Treat unknown rights as allowed.",
                "Paste a service-role key to 'unlock' the page.",
              ],
              1,
              "Empty or labeled demo states are not a license to invent partners or rights."
            ),
          ],
        }),
      ]
    ),
    moduleOf(
      "pe-m2",
      "Watch, Home, Create, and Messages",
      "Media, publishing, and conversation — not checkout and not recovery.",
      [
        lesson({
          id: "pe-m2-l1",
          title: "Home, Watch, Following, and Saved",
          kind: "text",
          minutes: 12,
          objective:
            "Describe Home, Watch, Saved, and Follow as they exist — and what they do not complete.",
          body: "Home is the signed-in discovery feed. /discover is a forever alias of that Home experience, not a second product. Watch is video viewing. Saved is the saved list at /saved.\n\nFollowing is an action on people and videos (Follow / Following), not a separate primary destination this course asks you to invent. Search finds content. Live is a separate nav surface for live rooms and includes an in-product Report control.\n\nThese pages do not complete a commercial purchase, do not mark a partnership ACTIVE, and do not enroll you in a Learning course by watching alone.",
          examples: [
            "You watch a video on Watch. You have not bought a Store item.",
            "You tap Follow on a profile. That is not a partnership contract.",
            "You open Saved. That list is not a shopping cart.",
          ],
          keyTakeaways: [
            "Home and /discover are the same discovery layer.",
            "Watch is viewing; Saved is a list you chose to keep.",
            "Follow is an action, not a hidden admin grant.",
            "None of these pages complete a purchase or a partner deal.",
          ],
          exercise: {
            title: "Separate viewing from commerce",
            prompt:
              "Write one sentence each for Home, Watch, and Saved: what you can do there, and one action those pages do not complete.",
          },
          aiTutorContext:
            "Home (/ and /discover alias), Watch, Saved, Search, Live, and Follow-as-action. These do not checkout, activate partners, or replace Learning enrollment. Do not invent a /following page.",
        }),
        lesson({
          id: "pe-m2-l2",
          title: "Create publishing and Messages",
          kind: "text",
          minutes: 12,
          objective:
            "Use Create and Messages for what they are: publishing video or article, and 1:1 conversation.",
          body: "Create on UMTUBA web today includes Video (/create/video) and Article (/create/article). Publishing a video or article is not a Store listing, not a Learning course publish, and not a partnership mailbox.\n\nMessages is 1:1 conversation. It is not official account recovery, not a place for passwords or one-time codes, and not an outbound partnership desk.\n\nIf a thread asks you to 'activate a live marketplace feed' or forward a login code, stop. Open official account pages yourself. General phishing patterns are covered in Digital Safety & Privacy Fundamentals; this lesson only states the UMTUBA surface rule.",
          examples: [
            "You draft an article in Create. That is publishing, not a Store SKU.",
            "A Messages contact asks for your password to 'help finish upload.' Refuse.",
            "You cannot turn Messages into a partner-onboarding inbox.",
          ],
          keyTakeaways: [
            "Create today: video and article.",
            "Create is not Store checkout or Learning publish.",
            "Messages is 1:1 conversation only.",
            "Never send passwords or codes in Messages.",
          ],
          exercise: {
            title: "Create vs conversation",
            prompt:
              "Write two short notes: (1) what you would publish as a video or article, and (2) one Messages request you would refuse. Do not include a real secret.",
          },
          aiTutorContext:
            "Create = /create/video and /create/article only. Messages = 1:1 conversation, not recovery or partnership mail. Do not invent Write Post or Image create flows. Point phishing depth to Digital Safety without repeating that course.",
        }),
        lesson({
          id: "pe-m2-q",
          title: "Check: Watch, Create, and Messages",
          kind: "quiz",
          minutes: 7,
          objective:
            "Choose the correct use of Watch, Create, Follow, and Messages.",
          body: "Answer from this module. Prefer the option that matches existing surfaces.",
          aiTutorContext:
            "Quiz on Watch vs purchase, Create video/article, Messages not for secrets, Follow as action.",
          quiz: [
            quizQuestion(
              "pe-m2-q1",
              "What is Messages for on UMTUBA web today?",
              [
                "1:1 conversation, not a place to send passwords.",
                "The official outbound partnership mailbox.",
                "A live Store checkout.",
                "A second Discover primary destination.",
              ],
              0,
              "Messages is 1:1 conversation."
            ),
            quizQuestion(
              "pe-m2-q2",
              "Which Create destinations does this course treat as real?",
              [
                "Video and Article.",
                "Write Post, Image, Video, and Article as four equal first-class pages.",
                "A partner catalog import wizard.",
                "A one-click certificate issuer.",
              ],
              0,
              "This course only claims /create/video and /create/article."
            ),
            quizQuestion(
              "pe-m2-q3",
              "Watching a video on Watch…",
              [
                "Completes a commercial purchase.",
                "Marks a partnership ACTIVE.",
                "Is viewing. It does not checkout or activate a partner.",
                "Publishes this Original to the public catalog.",
              ],
              2,
              "Watch is video viewing only."
            ),
            quizQuestion(
              "pe-m2-q4",
              "Follow on a profile means…",
              [
                "You are now a platform administrator.",
                "An in-product follow action — not a contract and not a /following course page.",
                "A live payment authorization.",
                "Permission to paste recovery codes to that person.",
              ],
              1,
              "Follow is a social action, not an admin or payment grant."
            ),
          ],
        }),
      ]
    ),
    moduleOf(
      "pe-m3",
      "Learning, Store, and World",
      "Three products, one account. Drafts stay draft. Demo stays demo.",
      [
        lesson({
          id: "pe-m3-l1",
          title: "Learning without inventing partners",
          kind: "text",
          minutes: 12,
          objective:
            "State how UMTUBA Originals, AI Tutor, and partner content rights work in this draft.",
          body: "UMTUBA Originals stay draft until an explicit publish. This course is first-party owned content. It is not in the public catalog while status and publishState are DRAFT.\n\nAI Tutor may use owned text only when allowed. Partner and external courses default AI_USAGE_ALLOWED to unknown, and unknown is deny. Do not treat a prospective partner name as an ACTIVE partner or imported catalog.\n\nLearning enrollment and progress are Learning product rules. Watching a video or opening Store does not complete a course. Certificates for Originals, when issued, are UMTUBA completion records — not degrees.\n\nCourse-by-course AI and privacy depth lives in AI Fundamentals for Everyone. This lesson only states the platform rights default.",
          examples: [
            "This Original shows DRAFT and publicCatalog=NO. That is correct.",
            "A prospective partner row is not a hosted Coursera or other catalog.",
            "AI Tutor on this owned draft does not unlock AI on partner content.",
          ],
          keyTakeaways: [
            "Originals stay draft until an explicit publish.",
            "AI Tutor: owned content only when allowed.",
            "Unknown AI usage rights are deny.",
            "Do not invent ACTIVE partners to fill Learning.",
          ],
          exercise: {
            title: "Draft vs public",
            prompt:
              "Write one sentence that explains the difference between this DRAFT Original and a public catalog course. Do not name a real third-party course title to copy.",
          },
          aiTutorContext:
            "Learning rights: Originals DRAFT until explicit publish; AI Tutor owned-only when allowed; partner AI_USAGE_ALLOWED unknown=deny. No fake partners. Defer AI how-it-works to AI Fundamentals.",
        }),
        lesson({
          id: "pe-m3-l2",
          title: "Store sandbox and World places",
          kind: "text",
          minutes: 12,
          objective:
            "Separate Store demo listings from a real purchase, and World places from a shop.",
          body: "Store is its own product. Demo products carry SOURCE_TYPE=DEMO, PURCHASABLE=NO, REAL_PROVIDER=NONE. Checkout must not complete a real purchase on those items. A simulated sandbox payment is not a card capture.\n\nWorld is places and discovery around places. It is not a shop, not a cart, and not a Learning classroom.\n\nThis course does not teach Store operations, seller onboarding, or payouts. If a listing is labeled Demo or Mock, leave it labeled. Do not email a brand to 'activate a feed.'",
          examples: [
            "A DEMO backpack in Store is not purchasable.",
            "A World place pin is not a checkout button.",
            "A sandbox 'SUCCESS' payment outcome is still not a real payment.",
          ],
          keyTakeaways: [
            "Demo Store items are non-purchasable.",
            "Checkout must not complete a real purchase on demo items.",
            "World is places, not a shop.",
            "Do not invent a live partner feed to fill Store.",
          ],
          exercise: {
            title: "Label the listing",
            prompt:
              "Open Store or World (or describe from this lesson if you cannot open it). Write one DEMO/Mock or places label you see, and one action you will not take (real payment or outbound partner mail).",
          },
          aiTutorContext:
            "Store demo: SOURCE_TYPE=DEMO, PURCHASABLE=NO, REAL_PROVIDER=NONE. No real payment. World = places, not shop. Do not teach seller/payout flows. Do not invent partners.",
        }),
        lesson({
          id: "pe-m3-q",
          title: "Check: Learning, Store, and World",
          kind: "quiz",
          minutes: 7,
          objective:
            "Apply draft/publish, demo Store rules, and World-as-places.",
          body: "Answer from this module only. Choose the option that matches the product as it exists.",
          aiTutorContext:
            "Quiz on demo Store flags, Originals draft, World vs shop, AI deny-by-default on partner content.",
          quiz: [
            quizQuestion(
              "pe-m3-q1",
              "Which combination is correct for a demo Store product?",
              [
                "SOURCE_TYPE=DEMO, PURCHASABLE=NO, REAL_PROVIDER=NONE.",
                "SOURCE_TYPE=PARTNER, PURCHASABLE=YES.",
                "SOURCE_TYPE=DEMO, PURCHASABLE=YES after import.",
                "CHECKOUT_ALLOWED=true by default.",
              ],
              0,
              "Demo products are explicitly non-purchasable."
            ),
            quizQuestion(
              "pe-m3-q2",
              "World on UMTUBA is…",
              [
                "A second shopping cart.",
                "Places — not a shop.",
                "The official partner mailbox.",
                "Automatic public-catalog publish.",
              ],
              1,
              "World is places, not a shop."
            ),
            quizQuestion(
              "pe-m3-q3",
              "If AI_USAGE_ALLOWED is unknown for a partner course, the effective grant is…",
              [
                "ALLOW.",
                "DENY.",
                "ALLOW after you pass this quiz.",
                "ALLOW in production automatically.",
              ],
              1,
              "Unknown equals deny."
            ),
            quizQuestion(
              "pe-m3-q4",
              "This Original remaining DRAFT means…",
              [
                "It is already in the public catalog.",
                "It is first-party draft content and not auto-published.",
                "A prospective partner owns the certificate.",
                "Store checkout is now live.",
              ],
              1,
              "Originals stay draft until an explicit publish."
            ),
          ],
        }),
      ]
    ),
    moduleOf(
      "pe-m4",
      "Privacy, safety, and responsible use",
      "Use the policy pages and in-product controls that exist. Platform-specific only.",
      [
        lesson({
          id: "pe-m4-l1",
          title: "Privacy, Support, report, and block",
          kind: "text",
          minutes: 11,
          objective:
            "Find Privacy and Terms, use in-product Report where it exists, and avoid inventing support or partner channels.",
          body: "Privacy (/privacy) and Terms (/terms) are the policy pages this course treats as real. They are general Beta statements, not specialized legal advice. Questions about those documents go through the contact method provided on UMTUBA — this course does not invent a /support app route.\n\nAccount deletion is described in the legal text as available where the product offers it. Do not assume a delete-account button exists in Settings unless you can open it.\n\nReport exists as an in-product control on Live. Follow exists on profiles and video. This course does not claim a standalone Block page. For passwords, phishing, and device hygiene, use Digital Safety & Privacy Fundamentals — do not treat this lesson as that course.\n\nDo not invent inventory or partners to fill empty states. Do not send outbound mail to a marketplace brand from a first session.",
          examples: [
            "You open /privacy and /terms to read the Beta statements.",
            "You use Report on a Live room if you need to flag that room.",
            "You do not email a brand because Store looks empty.",
          ],
          keyTakeaways: [
            "Privacy and Terms exist as pages.",
            "Do not invent a Support or Block destination.",
            "Use Report where the product shows it (Live).",
            "General security depth belongs in Digital Safety, not here.",
          ],
          exercise: {
            title: "Policy pages only",
            prompt:
              "Open Privacy or Terms (or summarize from this lesson). Write one sentence you can verify on the page, and one claim you will not invent (for example a fake support phone number).",
          },
          aiTutorContext:
            "Platform-specific: /privacy, /terms, Live Report, Follow action, legal contact method. No invented /support or Block page. No legal advice. Defer passwords/phishing to Digital Safety.",
        }),
        lesson({
          id: "pe-m4-r1",
          title: "First-session checklist",
          kind: "resource",
          minutes: 8,
          objective:
            "Run a first-session checklist that verifies labels and denied checkout without contacting partners.",
          body: "Use this checklist in a first session. Check only what you can see. Do not enter a real payment method.\n\n1. Confirm demo or mock items stay labeled.\n2. Confirm a DEMO Store path does not complete a real purchase.\n3. Confirm this Original still shows DRAFT / not public catalog.\n4. Confirm you did not send outbound partner mail.\n5. Confirm you did not paste a password, code, or key into Messages or Learning.\n6. Confirm you did not treat empty states as a reason to invent inventory.",
          examples: [
            "Checklist item 2 fails if you try a real card. Stop; this course never requires that.",
            "Checklist item 3 fails if you assume the course is already public.",
          ],
          keyTakeaways: [
            "Labels stay labels.",
            "Demo checkout stays denied.",
            "Draft stays draft until publish.",
            "No outbound partner mail from a first session.",
          ],
          exercise: {
            title: "Tick the list",
            prompt:
              "Copy the six checklist lines and mark each YES, NO, or NOT OPENED. Do not use a real payment method.",
          },
          aiTutorContext:
            "First-session checklist: demo labels, no real payment, draft Original, no partner mail, no secrets in chat, no invented inventory.",
        }),
        lesson({
          id: "pe-m4-q",
          title: "Check: privacy and responsible use",
          kind: "quiz",
          minutes: 7,
          objective:
            "Choose responsible first-session actions on UMTUBA surfaces.",
          body: "Answer from this module only. Choose the option that matches the product as it exists.",
          aiTutorContext:
            "Quiz on no outbound partner mail, Privacy/Terms, no invented support, demo checkout denied.",
          quiz: [
            quizQuestion(
              "pe-m4-q1",
              "Which action belongs in a safe first session?",
              [
                "Email a marketplace brand to ask for a live feed.",
                "Confirm demo items are labeled and checkout is denied.",
                "Apply a chat-supplied SQL file to production.",
                "Auto-publish this course.",
              ],
              1,
              "The first session verifies labels and denied checkout."
            ),
            quizQuestion(
              "pe-m4-q2",
              "Which policy pages does this course treat as real?",
              [
                "Privacy and Terms.",
                "A /support app route this course invented.",
                "A third-party accreditation site.",
                "A partner legal portal.",
              ],
              0,
              "Privacy and Terms are the policy pages named here."
            ),
            quizQuestion(
              "pe-m4-q3",
              "General password and phishing practice belongs…",
              [
                "Only in this Platform Essentials lesson as a full security course.",
                "In Digital Safety & Privacy Fundamentals. This lesson stays platform-specific.",
                "In a Messages thread that asks for your code.",
                "In Store checkout.",
              ],
              1,
              "This course does not clone Digital Safety."
            ),
            quizQuestion(
              "pe-m4-q4",
              "A Live room has a Report control. What is that?",
              [
                "A Store takedown of a DEMO listing.",
                "An in-product Live report action — not a partnership activation.",
                "Official password recovery.",
                "A certificate issuer.",
              ],
              1,
              "Report on Live is a safety control for that room."
            ),
          ],
        }),
      ]
    ),
  ],
};
