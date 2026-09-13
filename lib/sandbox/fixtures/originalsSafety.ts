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

export const DIGITAL_SAFETY: UmtubaOriginalCourse = {
  ...ORIGINAL_BASE,
  id: "sandbox-original-digital-safety",
  slug: "digital-safety-privacy-fundamentals",
  title: "Digital Safety & Privacy Fundamentals",
  shortDescription:
    "First-party draft: unique passwords, MFA concepts, phishing, minimization, and reporting. Educational only. Not a guarantee of safety and not legal advice.",
  instructorId: "demo-instructor-04",
  exercises: [
    {
      id: "ds-ex-1",
      title: "Unique password check",
      prompt:
        "Describe how you keep a unique secret per account without writing the secret itself in chat, email, or this exercise.",
    },
    {
      id: "ds-ex-2",
      title: "Phishing rewrite",
      prompt:
        "Rewrite a fake admin request as a response that uses only official account pages or the product's own contact method. Do not include a real password or code.",
    },
  ],
  certificateCopy: {
    courseName: "Digital Safety & Privacy Fundamentals",
    learnerNamePlaceholder: "{{LEARNER_NAME}}",
    completionStatement:
      "This certifies that {{LEARNER_NAME}} completed Digital Safety & Privacy Fundamentals.",
    issuer: "UMTUBA",
    completionDatePlaceholder: "{{COMPLETION_DATE}}",
    certificateIdPlaceholder: "{{CERTIFICATE_ID}}",
    disclaimer: ORIGINALS_CERTIFICATE_DISCLAIMER,
  },
  finalAssessment: {
    id: "ds-final",
    title: "Digital Safety — course check",
    objective:
      "Apply passwords/recovery, phishing, minimization, and reporting across the four modules.",
    body: "Answer from this course only. Educational practice — not a security audit and not a promise that you cannot be harmed. Passing is 4 of 5 points. You may start a new attempt if you do not pass.",
    estimatedMinutes: 12,
    maxScore: 5,
    passingScore: 4,
    maxAttempts: null,
    completionMode: "score",
    completionRelationship: ORIGINALS_COMPLETION_RELATIONSHIP,
    quiz: [
      quizQuestion(
        "ds-final-q1",
        "A chat says 'paste your password so we can restore your account.' What is the safe move?",
        [
          "Paste it because the message looks official.",
          "Refuse. Official recovery stays on product account pages. Never paste the secret into chat.",
          "Share it with a course instructor in Learning.",
          "Reuse the same password on a second site so you remember it.",
        ],
        1,
        "Staff and courses will not ask you to paste a password into chat."
      ),
      quizQuestion(
        "ds-final-q2",
        "When a product offers a second factor, which habit matches this course?",
        [
          "Prefer an authenticator or hardware key when offered. Keep recovery on official account pages.",
          "Send one-time codes to anyone who asks in Messages.",
          "Disable every second factor so login is faster.",
          "Photograph codes and post them on a public profile.",
        ],
        0,
        "MFA reduces risk when used as the product offers it. It is not a guarantee."
      ),
      quizQuestion(
        "ds-final-q3",
        "A message asks you to 'activate a live marketplace feed' via a link and then forward a login code. What is it?",
        [
          "Official recovery.",
          "A request you should treat as social engineering. Open official pages yourself. Do not forward the code.",
          "A required Store checkout step.",
          "A Learning certificate unlock.",
        ],
        1,
        "Urgency plus codes plus unexpected links is a phishing pattern."
      ),
      quizQuestion(
        "ds-final-q4",
        "Which item may appear on a public profile?",
        [
          "A recovery code.",
          "A display name you chose.",
          "A service-role key.",
          "A real card number.",
        ],
        1,
        "Public presence is identity you chose, not secrets."
      ),
      quizQuestion(
        "ds-final-q5",
        "Reporting abuse is…",
        [
          "A way to mark a partnership ACTIVE.",
          "A safety action through existing product controls or the contact method the product provides. It is not a Store takedown of demo items.",
          "An outbound email you must send to a marketplace brand.",
          "A live payment capture.",
        ],
        1,
        "Use existing controls. Reporting is not commerce activation."
      ),
    ],
  },
  modules: [
    moduleOf(
      "ds-m1",
      "Passwords and recovery",
      "Unique secrets you control. Official recovery stays on account pages.",
      [
        lesson({
          id: "ds-m1-l1",
          title: "One account, one secret",
          kind: "text",
          minutes: 12,
          objective:
            "Explain why a unique password per account reduces reuse harm, without writing the secret down in chat.",
          body: "A password is a secret you control. Use a unique password for each account. If one site is breached, reused passwords let the same secret open other accounts.\n\nThis course will never ask you to type a real password, and staff will not ask you to paste a password or one-time code into chat, email, or Learning. If someone does, treat that as unsafe.\n\nA password manager or another method you already trust can help you keep unique secrets. This course does not require you to name a vendor and does not claim any tool makes you safe.\n\nUMTUBA-specific places not to paste secrets (Messages, Learning) are also covered in Platform Essentials. This lesson is the general habit.",
          examples: [
            "Same password on email and shopping: one leak can open both.",
            "A ticket that says 'paste your password so we can help' is not official recovery.",
            "Writing 'unique per account, stored where I control it' is enough for an exercise — never the secret itself.",
          ],
          keyTakeaways: [
            "One account, one unique secret.",
            "Never paste a password into chat or a course field.",
            "Reuse multiplies harm after a single leak.",
            "No tool is an absolute guarantee.",
          ],
          exercise: {
            title: "Describe the habit, not the secret",
            prompt:
              "In one short paragraph, describe how you would keep unique passwords without writing any actual password, PIN, or recovery code.",
          },
          aiTutorContext:
            "Unique passwords; never collect or request real secrets. No vendor requirement. No guarantee of safety. UMTUBA chat/Learning is one example of where not to paste; general habit is the point.",
        }),
        lesson({
          id: "ds-m1-l2",
          title: "MFA concepts and recovery",
          kind: "text",
          minutes: 12,
          objective:
            "Describe multi-factor concepts and why official recovery stays on account pages.",
          body: "A second factor is something extra after the password — for example a code from an authenticator app or a hardware key — when the product offers it. SMS codes can still be intercepted or redirected; this course does not call any method perfect.\n\nPrefer an authenticator or hardware key when the product offers those options. Official recovery (reset links, backup codes stored by you) stays on the product's account pages. A message that asks you to read a code aloud is not official recovery.\n\nBackup codes are secrets. Store them the way you store other secrets. Do not put them on a public profile or in a shared document you do not control.\n\nMFA reduces some risks. It does not make an account impossible to abuse.",
          examples: [
            "You open the account security page yourself and add an authenticator if offered.",
            "A caller asks you to read the code 'to verify they are support.' You stop.",
            "You keep backup codes offline or in a manager — not in a group chat.",
          ],
          keyTakeaways: [
            "MFA is an extra factor, not a magic shield.",
            "Prefer authenticator or hardware key when offered.",
            "Official recovery stays on account pages.",
            "Backup codes are secrets.",
          ],
          exercise: {
            title: "Recovery map",
            prompt:
              "Write where official recovery happens for an account you use (page name only) and one place you will never send a one-time code. Do not write the code.",
          },
          aiTutorContext:
            "MFA concepts: extra factor, prefer authenticator/hardware key when offered, SMS not perfect, recovery on official pages, backup codes are secrets. No legal claims. No guarantee.",
        }),
        lesson({
          id: "ds-m1-q",
          title: "Check: passwords and recovery",
          kind: "quiz",
          minutes: 7,
          objective:
            "Apply unique-secret and official-recovery rules to short scenarios.",
          body: "Answer from this module. Do not enter a real password.",
          aiTutorContext:
            "Quiz on unique passwords, no paste into chat, official recovery pages, MFA not a guarantee.",
          quiz: [
            quizQuestion(
              "ds-m1-q1",
              "Where does official account recovery happen?",
              [
                "On the product account pages.",
                "In a Messages thread that asks for a code.",
                "By emailing a prospective partner.",
                "By sharing the password with a demo instructor.",
              ],
              0,
              "Official recovery stays on product account pages."
            ),
            quizQuestion(
              "ds-m1-q2",
              "Why use a unique password per account?",
              [
                "So the course can grade your real password.",
                "So a leak on one site is less likely to open others.",
                "Because one password is legally required in every country.",
                "Because MFA is then unnecessary forever.",
              ],
              1,
              "Reuse spreads harm after a single leak. This is practice, not law."
            ),
            quizQuestion(
              "ds-m1-q3",
              "A person in chat asks you to paste a one-time code. What do you do?",
              [
                "Paste it so they can 'finish recovery.'",
                "Refuse and use official account pages.",
                "Post it in a course discussion for help.",
                "Reuse it as your next password.",
              ],
              1,
              "Never paste recovery codes into chat."
            ),
            quizQuestion(
              "ds-m1-q4",
              "Adding a second factor means…",
              [
                "Your account can never be misused.",
                "An extra step that can reduce some risks when the product offers it.",
                "You may now share the password publicly.",
                "Staff may collect backup codes in Learning.",
              ],
              1,
              "MFA reduces some risks. It is not an absolute guarantee."
            ),
          ],
        }),
      ]
    ),
    moduleOf(
      "ds-m2",
      "Phishing and impersonation",
      "Fake admin, fake partner, and fake recovery requests.",
      [
        lesson({
          id: "ds-m2-l1",
          title: "Phishing, scams, and social engineering",
          kind: "text",
          minutes: 13,
          objective:
            "Recognize pressure, unexpected links, and requests for codes as social engineering — not official recovery.",
          body: "Phishing and social engineering try to make you give away a secret or click a path you did not start. Common signals: urgency, fear, a surprise payment or 'activation,' and a request for a password or one-time code.\n\nA message that asks you to activate a live marketplace feed, confirm a payment, or forward a login code is not official recovery. Official-looking logos and fluent language do not make a request safe.\n\nThis course does not quote incident statistics and does not claim any filter catches every attempt. When unsure, stop and open the product yourself.\n\nUMTUBA-specific examples (demo Store, Messages) appear in Platform Essentials. Here the habit is general: do not follow the story; follow the official page you typed or bookmarked.",
          examples: [
            "Email: 'Your account closes in 10 minutes — paste the code.' Treat as suspect.",
            "Chat: 'Activate the partner feed or we suspend you.' Not official recovery.",
            "A well-written message can still be fake.",
          ],
          keyTakeaways: [
            "Urgency plus secrets is a warning sign.",
            "Look-alike branding is not proof.",
            "Codes and passwords are never for chat.",
            "No filter is complete.",
          ],
          exercise: {
            title: "Name the pressure",
            prompt:
              "Write a two-sentence fake request (no real brands required) that uses urgency and a code, then write the safe reply that refuses the secret.",
          },
          aiTutorContext:
            "Phishing/social engineering: urgency, unexpected activation/payment, codes. No statistics. No 'you will always detect it.' Defer UMTUBA surface map to Platform Essentials.",
        }),
        lesson({
          id: "ds-m2-l2",
          title: "Verify out of band",
          kind: "text",
          minutes: 11,
          objective:
            "Start from official pages you open yourself instead of following a message's link.",
          body: "Out of band means you do not continue inside the suspicious message. Open the site or app the way you already trust — typed address, saved bookmark, or installed app — and look at account or help pages there.\n\nDo not follow a link that claims to be admin, recovery, or a partner portal if you did not start that task. Hovering or previewing a link is not a complete check; look-alike addresses exist.\n\nIf the product provides a contact method, use that after you open the product yourself. This course does not invent phone numbers or email addresses.\n\nVerifying out of band slows you down on purpose. That is the point.",
          examples: [
            "Close the message. Open the app from your home screen. Check account pages.",
            "A link says umtuba-support-secure.example — you still open the product yourself.",
            "You do not call a number that arrived in the same message.",
          ],
          keyTakeaways: [
            "You start the official page; the message does not.",
            "Look-alike links can still be false.",
            "Use only contact methods you open from the product.",
            "Slow is safer than following the thread.",
          ],
          exercise: {
            title: "Out-of-band steps",
            prompt:
              "List three steps you would take after a suspicious 'admin' message, without following its link and without sending a code.",
          },
          aiTutorContext:
            "Verify out of band: open official pages yourself, do not trust the message's link or phone, no invented contact details. Not a complete guarantee.",
        }),
        lesson({
          id: "ds-m2-q",
          title: "Check: phishing",
          kind: "quiz",
          minutes: 7,
          objective:
            "Choose responses that refuse codes and verify out of band.",
          body: "Answer from this module only. Choose the safest practical option. Do not enter a real password.",
          aiTutorContext:
            "Quiz on refusing codes, out-of-band verify, urgency is not proof.",
          quiz: [
            quizQuestion(
              "ds-m2-q1",
              "A chat asks you to paste a one-time code. What do you do?",
              [
                "Paste it so the session continues.",
                "Refuse and use official account pages.",
                "Forward it to a prospective partner.",
                "Post it in a course discussion.",
              ],
              1,
              "Never paste recovery codes into chat."
            ),
            quizQuestion(
              "ds-m2-q2",
              "The safest next step after a surprise 'admin' link is…",
              [
                "Click it, then decide.",
                "Open the product yourself and use pages you started.",
                "Reply with your password so they prove they are real.",
                "Share the link with everyone in Learning.",
              ],
              1,
              "Out of band: you start the official page."
            ),
            quizQuestion(
              "ds-m2-q3",
              "A message is well written and uses a familiar logo. That means…",
              [
                "It is definitely official.",
                "Writing quality is not proof. Still verify out of band.",
                "You must activate a marketplace feed.",
                "You should send backup codes to match their logo.",
              ],
              1,
              "Fluent language and logos can be copied."
            ),
            quizQuestion(
              "ds-m2-q4",
              "This course's phishing advice is…",
              [
                "A guarantee you will never be fooled.",
                "Practical habits. No complete guarantee.",
                "A substitute for every country's fraud law.",
                "Permission to test real card numbers.",
              ],
              1,
              "Educational practice only — not a guarantee and not legal advice."
            ),
          ],
        }),
      ]
    ),
    moduleOf(
      "ds-m3",
      "Permissions and data minimization",
      "Share the least data a task needs.",
      [
        lesson({
          id: "ds-m3-l1",
          title: "Least privilege for apps and browsers",
          kind: "text",
          minutes: 12,
          objective:
            "Grant only the permission a task needs and revoke access you no longer use.",
          body: "Least privilege means an app, browser site, or device feature gets only what the current task needs — camera, location, contacts, files — and not everything 'just in case.'\n\nWhen a prompt appears, read what is asked. If you only need to watch a video, you usually do not need contacts. You can refuse or later revoke unused access in device or browser settings.\n\nThis course does not list every operating-system path (they change) and does not claim revocation makes a past share disappear from every copy.\n\nAI prompts are another place people over-share. How to keep secrets out of AI is in AI Fundamentals for Everyone. Here the habit is general: least data for the task.",
          examples: [
            "A flashlight-style app that wants contacts: refuse unless you have a reason.",
            "You used location for one map task; you can turn location off afterward.",
            "A course exercise never needs your real address book.",
          ],
          keyTakeaways: [
            "Grant only what the task needs.",
            "Unused access can be revoked later.",
            "Revocation is not a time machine for every copy.",
            "Over-sharing into AI is covered in the AI course.",
          ],
          exercise: {
            title: "Permission audit (no secrets)",
            prompt:
              "Name two app or browser permissions you could review this week (camera, location, notifications, etc.). Do not paste account credentials or personal document numbers.",
          },
          aiTutorContext:
            "Least privilege for apps/browsers. No OS-specific invented steps. No claim that revoke erases all copies. Point AI over-share to AI Fundamentals.",
        }),
        lesson({
          id: "ds-m3-l2",
          title: "Public vs private info, safe sharing, and devices",
          kind: "text",
          minutes: 12,
          objective:
            "Separate public profile fields from secrets, and treat shared or lost devices as higher risk.",
          body: "Usernames and a display name you chose can be public. Passwords, recovery codes, backup phrases, card numbers, government ID numbers, and .env or service-role keys are never public.\n\nBefore you share a screenshot, check the corners for emails, tokens, or open Settings panels. Before you sell or lend a device, sign out of accounts you control.\n\nShared family devices and public computers raise the chance that the next person can continue your session. Signing out and not saving passwords in a browser you do not control are practical habits — not a complete lock.\n\nThis course does not invent a legal definition of 'personal data' for every country.",
          examples: [
            "Public: a display name you picked. Private: a recovery code.",
            "A screenshot of Settings might show an email you did not mean to share.",
            "A library computer: sign out when you finish.",
          ],
          keyTakeaways: [
            "Public identity ≠ secrets.",
            "Screenshots can leak fields you forgot.",
            "Shared devices need sign-out habits.",
            "No fabricated legal definitions.",
          ],
          exercise: {
            title: "Public / private split",
            prompt:
              "Make two columns: PUBLIC (display name, username you chose) and NEVER PUBLIC (password, codes, keys, card numbers). Do not fill the never-public column with real values.",
          },
          aiTutorContext:
            "Public vs private: display name OK; passwords/codes/keys/cards never public. Screenshots and shared devices. No fabricated privacy-law claims.",
        }),
        lesson({
          id: "ds-m3-q",
          title: "Check: permissions and minimization",
          kind: "quiz",
          minutes: 7,
          objective:
            "Choose least-privilege and public-vs-private answers.",
          body: "Answer from this module only. Choose the safest practical option. Do not enter a real password.",
          aiTutorContext:
            "Quiz on public display name vs secrets, least privilege, screenshots, shared devices.",
          quiz: [
            quizQuestion(
              "ds-m3-q1",
              "Which item may appear on a public profile?",
              [
                "A recovery code.",
                "A display name you chose.",
                "A service-role key.",
                "A real card number.",
              ],
              1,
              "Public presence is identity you chose, not secrets."
            ),
            quizQuestion(
              "ds-m3-q2",
              "An app asks for contacts to show a video. Least privilege says…",
              [
                "Always allow every permission.",
                "Refuse contacts unless the task actually needs them.",
                "Paste your password to skip the prompt.",
                "Post your address book in Learning.",
              ],
              1,
              "Grant only what the task needs."
            ),
            quizQuestion(
              "ds-m3-q3",
              "You used a public computer. A useful habit is…",
              [
                "Stay signed in for the next person.",
                "Sign out of accounts you opened.",
                "Save all passwords in that browser.",
                "Photograph backup codes and leave them on the desk.",
              ],
              1,
              "Shared devices: sign out. Not a complete guarantee."
            ),
            quizQuestion(
              "ds-m3-q4",
              "Revoking an app permission…",
              [
                "Erases every copy of data already taken, everywhere, always.",
                "Stops some future access. It is not a claim that every past copy is gone.",
                "Publishes your course certificate.",
                "Is illegal in all countries.",
              ],
              1,
              "Revoke is useful. It is not a time machine."
            ),
          ],
        }),
      ]
    ),
    moduleOf(
      "ds-m4",
      "Practice and close",
      "Report through existing tools. Repeat a short monthly pass.",
      [
        lesson({
          id: "ds-m4-l1",
          title: "Reporting abuse and a monthly pass",
          kind: "text",
          minutes: 11,
          objective:
            "Use existing report or contact paths, and run a short monthly safety pass.",
          body: "If something is abusive or suspicious, use in-product Report or Block when those controls are present. If they are not, use the contact method the product provides. Reporting is a safety action. It is not a Store takedown, not a way to mark a partnership ACTIVE, and not a live payment.\n\nOn UMTUBA, Live includes a Report control. Other surfaces may not. Do not invent a global Block page. Platform navigation details stay in Platform Essentials.\n\nA monthly pass is a reminder, not a certification: unique passwords, MFA where offered, no secrets in chat, review app permissions, sign out of shared devices you used.\n\nThis course does not promise that reporting leads to a particular outcome.",
          examples: [
            "You use Report on a Live room. That is not a DEMO product takedown.",
            "Monthly pass: review permissions; still no real passwords in the notes.",
            "No report control visible: use the product's stated contact method.",
          ],
          keyTakeaways: [
            "Use controls that exist; do not invent them.",
            "Reporting ≠ commerce or partner activation.",
            "A monthly pass is practice, not a certificate of safety.",
            "Outcomes of a report are not guaranteed.",
          ],
          exercise: {
            title: "Monthly pass (no secrets)",
            prompt:
              "Write a four-line monthly pass you could reuse: unique secrets, MFA if offered, no codes in chat, permission review. Do not include real credentials.",
          },
          aiTutorContext:
            "Reporting via existing controls only; UMTUBA Live Report as one example. Monthly pass habits. No promised outcomes. Not a Store/partner action.",
        }),
        lesson({
          id: "ds-m4-r1",
          title: "Privacy pass worksheet",
          kind: "resource",
          minutes: 8,
          objective:
            "Complete a reusable worksheet that never collects secrets.",
          body: "Monthly pass worksheet (write YES / NO / SKIP — never write secrets):\n\n1. Unique password habit still in place (describe the habit, not the password).\n2. Second factor added where the product offers it and you chose to use it.\n3. No passwords or codes stored in chat, email drafts, or course answers.\n4. App or browser permissions reviewed for something you no longer need.\n5. Shared or public devices: you signed out after use.\n6. You know how you would open official account pages without following a surprise link.",
          examples: [
            "Line 3 is NO if you keep codes in a group chat — fix the habit, do not paste the codes here.",
            "SKIP is allowed if a product does not offer MFA.",
          ],
          keyTakeaways: [
            "The worksheet never needs a real secret.",
            "SKIP is honest when a control does not exist.",
            "Repeat monthly; it is not a legal filing.",
          ],
          exercise: {
            title: "Fill the worksheet",
            prompt:
              "Mark the six lines YES, NO, or SKIP. If NO, write one habit change in words — not a password or code.",
          },
          aiTutorContext:
            "Worksheet only: habits, not secrets. SKIP allowed. Not a legal or compliance filing.",
        }),
        lesson({
          id: "ds-m4-q",
          title: "Check: monthly pass",
          kind: "quiz",
          minutes: 6,
          objective:
            "Confirm reporting and monthly-pass rules.",
          body: "Answer from this module only. Choose the safest practical option. Do not enter a real password.",
          aiTutorContext:
            "Quiz on reporting vs commerce, worksheet never collects secrets, no guaranteed outcomes.",
          quiz: [
            quizQuestion(
              "ds-m4-q1",
              "Reporting abuse is…",
              [
                "A way to mark a partnership ACTIVE.",
                "A safety action through existing product controls or the product's contact method.",
                "An outbound email to a marketplace brand you must send.",
                "A live payment capture.",
              ],
              1,
              "Use existing controls or the stated contact method."
            ),
            quizQuestion(
              "ds-m4-q2",
              "The privacy pass worksheet should include…",
              [
                "Your real password so staff can check it.",
                "Habit marks (YES/NO/SKIP) and no secrets.",
                "A card number to prove identity.",
                "A government ID photo.",
              ],
              1,
              "Exercises never collect secrets or sensitive ID."
            ),
            quizQuestion(
              "ds-m4-q3",
              "Filing a report means…",
              [
                "A guaranteed removal or legal result.",
                "You used a safety path. The outcome is not promised.",
                "Store DEMO items become purchasable.",
                "You completed a professional security license.",
              ],
              1,
              "No promised outcome; not a license."
            ),
          ],
        }),
      ]
    ),
  ],
};
