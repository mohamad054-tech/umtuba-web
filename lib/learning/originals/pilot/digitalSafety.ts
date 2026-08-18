import type { UmtubaOriginalPilotCourse } from "./types";
import {
  PILOT_PASS_THRESHOLD_PERCENT,
  PILOT_PROGRESS_RULES,
  UMTUBA_CERTIFICATE_STATEMENT,
  UMTUBA_PILOT_AUTHOR,
} from "./types";

export const DIGITAL_SAFETY_PRIVACY_FUNDAMENTALS: UmtubaOriginalPilotCourse = {
  id: "c1e22222-2222-4222-8222-222222222222",
  slug: "digital-safety-privacy-fundamentals",
  title: "Digital Safety & Privacy Fundamentals",
  shortDescription:
    "Practical passwords, MFA, phishing, scams, privacy, device safety, and reporting habits. Educational and first-party. No fabricated statistics.",
  fullDescription:
    "This UMTUBA Original covers passwords and multi-factor authentication concepts, phishing and social-engineering scams, account security, privacy, device safety, safe sharing, public versus private information, suspicious links and files, reporting abuse, and a reusable checklist. It is educational. It does not invent industry breach rates, and it does not name any company as a live UMTUBA partner. Official recovery stays on the product’s account pages.",
  targetAudience: "Any UMTUBA member who uses passwords, email, and app permissions in daily work.",
  level: "beginner",
  language: "en",
  category: "digital-safety",
  prerequisites: [
    "A personal UMTUBA account you control.",
    "Access to the email or authenticator you use for recovery.",
    "UMTUBA Platform Essentials is helpful but not required.",
  ],
  learningObjectives: [
    "Build a unique-password and recovery practice that does not rely on shared secrets.",
    "Explain MFA concepts and prefer an authenticator or hardware key over SMS when the product offers it.",
    "Recognize phishing, scams, and social engineering, including fake partner or admin requests.",
    "Separate public from private information and share the least data a task needs.",
    "Treat suspicious links and files as untrusted, and report abuse through Support or an in-product control when it exists.",
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
      id: "ds-m1",
      title: "Passwords and recovery",
      summary: "Unique secrets, a password manager, and recovery that you control.",
      lessons: [
        {
          id: "ds-m1-l1",
          kind: "text",
          title: "One account, one secret",
          estimatedMinutes: 8,
          resource: null,
          quiz: [],
          body: `A password is a secret that proves you are the account holder. If two sites share the same password, a breach on one site becomes a key to the other. Use a unique password for UMTUBA and a unique password for email. Reuse is the failure mode this lesson exists to prevent.

A password manager generates and stores those unique secrets. You then remember one strong unlock method for the manager, not dozens of site passwords. Do not store passwords in a chat thread, a screenshot album, or a shared spreadsheet. Those places are not a vault.

Length and uniqueness matter more than clever substitutions. A long random string from a manager is better than a short word with a number on the end. Do not include your name, a company name, or a year that is easy to guess.

UMTUBA staff will not ask you to send a password. A message that asks for one is not an official recovery flow, even if it uses an UMTUBA-looking logo. Official recovery happens on the account pages of the product, not in a private chat.`,
        },
        {
          id: "ds-m1-l2",
          kind: "text",
          title: "MFA concepts and recovery",
          estimatedMinutes: 8,
          resource: null,
          quiz: [],
          body: `Multi-factor authentication (MFA) means a second proof besides the password. Typical factors are something you know (password), something you have (authenticator app, hardware key, or a phone), and something you are (biometrics on a device you control). UMTUBA staff will not ask you to read an MFA code into chat.

A one-time SMS code is better than password-only and weaker than an authenticator app or a hardware key. Prefer the stronger option when the product offers it. Treat the second factor as a second secret. If you lose it, use the product’s official recovery — usually a verified email and recovery codes you stored offline. Set those up before you need them.

Print or write recovery codes and keep them somewhere you control. Do not photograph them into a shared cloud album. Do not paste them into Learning notes. Do not ask a colleague to “approve the login from their phone.” That creates a shared account, which this course treats as a security incident, not a convenience.

Account security also means signing in only on devices you control, signing out on a shared computer, and changing the password if you see a session you do not recognize. Official recovery happens on the account pages of the product, not in a private chat and not in an unexpected email form.`,
        },
        {
          id: "ds-m1-q",
          kind: "quiz",
          title: "Check: passwords and recovery",
          estimatedMinutes: 5,
          resource: null,
          body: "Answer from this module.",
          quiz: [
            {
              id: "ds-m1-q1",
              prompt: "Why must the UMTUBA password be unique?",
              choices: [
                { id: "a", text: "So the certificate looks more official." },
                { id: "b", text: "So a breach on another site does not unlock UMTUBA." },
                { id: "c", text: "So search can index the account." },
                { id: "d", text: "So demo products can be purchased." },
              ],
              correctChoiceId: "b",
              explanation: "Reuse lets one breach become many. Unique passwords contain the damage.",
            },
            {
              id: "ds-m1-q2",
              prompt: "Where should recovery codes live?",
              choices: [
                { id: "a", text: "In a shared chat with the team." },
                { id: "b", text: "In a place you control, not a shared album or ticket." },
                { id: "c", text: "In the course discussion so staff can help." },
                { id: "d", text: "In the partner vault_ref field." },
              ],
              correctChoiceId: "b",
              explanation: "Recovery codes are secrets. Shared chats, albums, and tickets are not a vault.",
            },
            {
              id: "ds-m1-q3",
              prompt: "A chat message asks you to forward a one-time login code. What should you do?",
              choices: [
                { id: "a", text: "Send it because the logo looks official." },
                { id: "b", text: "Refuse and use only the product’s official recovery pages." },
                { id: "c", text: "Send it if the sender is a coworker." },
                { id: "d", text: "Post it in Learning so an instructor can confirm." },
              ],
              correctChoiceId: "b",
              explanation: "Codes and passwords are never sent in chat, even to people you know.",
            },
            {
              id: "ds-m1-q4",
              prompt: "Which MFA picture is strongest when the product offers it?",
              choices: [
                { id: "a", text: "Password only, reused across sites." },
                { id: "b", text: "Password plus an authenticator app or hardware key." },
                { id: "c", text: "Sharing one phone authenticator across the office." },
                { id: "d", text: "Emailing recovery codes to a fake partner helpdesk." },
              ],
              correctChoiceId: "b",
              explanation: "SMS is better than nothing; authenticator or hardware key is stronger. Shared factors are not MFA.",
            },
          ],
        },
      ],
    },
    {
      id: "ds-m2",
      title: "Phishing and impersonation",
      summary: "How to treat unexpected links, attachments, and “partner” requests.",
      lessons: [
        {
          id: "ds-m2-l1",
          kind: "text",
          title: "Phishing, scams, and social engineering",
          estimatedMinutes: 9,
          resource: null,
          quiz: [],
          body: `Phishing works by creating urgency and a trusted costume. The costume may be a bank, a shipping company, a workplace admin, or a fake commerce or learning partner. The urgency is usually “confirm now or lose access.” Social engineering is the same idea without needing a perfect replica of a website: a person talks you into handing over a code, a password, or a file.

Scams that show up around a product like UMTUBA include fake “your account will be closed,” fake refund or payout changes, fake job or creator-brand deals, and fake “activate the partner feed today” mail. In this pre-company phase UMTUBA is not sending outbound partnership mail. A message that claims you must finish a live marketplace or university partnership is not an official UMTUBA action. Do not click it to be helpful.

Check the destination before you tap. Hover or long-press a link and read the host name. A look-alike domain is not the UMTUBA product. Do not sign in through a page that arrived in email if you can open the product yourself from a bookmark or the installed app.

Attachments, unexpected installers, and QR codes can carry the same trap. If you did not expect a file, do not open it to be polite. If a QR code is on a poster you did not place, treat it as an untrusted URL. Suspicious links and files stay untrusted until you can open the real product without using the inbound link.`,
        },
        {
          id: "ds-m2-l2",
          kind: "text",
          title: "Verify out of band",
          estimatedMinutes: 7,
          resource: null,
          quiz: [],
          body: `When a request is surprising, verify it through a channel you already trust. If email asks you to change a payout account, open the product from your bookmark and look at the actual settings. If chat asks you to approve a partner, check the partner lifecycle in the admin domain — REAL_PARTNER_DATA cannot be ACTIVE here.

Do not verify by replying to the same message. Attackers read replies. Use a phone number or admin process you already had, not a number supplied in the suspicious message.

This course will not invent a live partner helpdesk. If you need UMTUBA help, use the in-product report or the internal task channel your team already uses. Do not send the suspicious attachment to a public social account and ask strangers to inspect it.`,
        },
        {
          id: "ds-m2-q",
          kind: "quiz",
          title: "Check: phishing",
          estimatedMinutes: 4,
          resource: null,
          body: "Answer from this module.",
          quiz: [
            {
              id: "ds-m2-q1",
              prompt: "Why is unexpected urgency a warning sign?",
              choices: [
                { id: "a", text: "Official UMTUBA recovery always uses a countdown timer." },
                { id: "b", text: "Attackers use urgency so you skip checking the real destination." },
                { id: "c", text: "Demo checkouts expire in sixty seconds." },
                { id: "d", text: "Certificates expire if you wait." },
              ],
              correctChoiceId: "b",
              explanation: "Urgency is there to stop you from reading the host name or opening the real product.",
            },
            {
              id: "ds-m2-q2",
              prompt: "A mail says you must activate a live marketplace feed today. What is true in this phase?",
              choices: [
                { id: "a", text: "UMTUBA is not sending outbound partnership mail; treat it as suspicious." },
                { id: "b", text: "You should sign the contract from the email attachment." },
                { id: "c", text: "You should import the feed to keep shelves full." },
                { id: "d", text: "You should mark the partner ACTIVE so checkout works." },
              ],
              correctChoiceId: "a",
              explanation: "No outbound partnership messages are sent in this phase. The request is not official.",
            },
          ],
        },
      ],
    },
    {
      id: "ds-m3",
      title: "Permissions and data minimization",
      summary: "Give software the least access it needs, and paste less.",
      lessons: [
        {
          id: "ds-m3-l1",
          kind: "text",
          title: "Least privilege for apps and browsers",
          estimatedMinutes: 8,
          resource: null,
          quiz: [],
          body: `A permission is a door. Camera, microphone, contacts, files, and location are doors you open on purpose. If a page needs a camera for one action, grant it for that action and review it later. If a page wants contacts to “find friends” and you do not need that feature, deny it.

Browser notifications and clipboard access are easy to forget. Review site permissions in the browser settings on a schedule you can keep, such as the first Monday of a month. Revoke what you do not use.

On UMTUBA, admin tools are not granted by opening a URL. A store manager role is not a platform admin. A catalog editor cannot invent checkout rights. If a control is missing, that may be correct least privilege rather than a bug.

Do not install a browser extension to “unlock” a feature. Extensions can read the pages you have open, including account settings. Prefer the product’s own settings.`,
        },
        {
          id: "ds-m3-l2",
          kind: "text",
          title: "Public vs private info, safe sharing, and devices",
          estimatedMinutes: 9,
          resource: null,
          quiz: [],
          body: `Public information is what you chose to show on a public profile: a display name, a username, an optional bio, city, or avatar. Private information is everything else: passwords, recovery codes, government identifiers, card numbers, exact home address, private messages, and other people’s data. Safe sharing means you publish only the public layer you intended and you keep the private layer off Home, Watch, Messages, Learning, and tickets.

Data minimization means you share the smallest set of facts that completes the task. A support ticket about a failed lesson load needs a timestamp and a course slug. It does not need your government ID, a full card number, or a service-role key. Never paste .env files, API keys, or vault secrets into Learning, Messages, or an AI Tutor prompt.

Device safety is part of the same habit. Keep the operating system and browser updated. Lock the screen. Do not install a random “unlocker” extension or an unexpected APK to “fix” UMTUBA. Prefer the product’s own settings. On a shared or borrowed device, use a browser you will sign out of, and do not save the password in a profile you do not control. If a device is lost, change the password from a device you still have.

Logs and screenshots leak. Crop a screenshot so it does not show a session token, an email inbox, or someone else’s profile. If you cannot crop it, do not attach it. When you use an UMTUBA AI Tutor on owned content, ask about the lesson — do not paste another person’s personal data to “make the example realistic.”`,
        },
        {
          id: "ds-m3-q",
          kind: "quiz",
          title: "Check: permissions and minimization",
          estimatedMinutes: 4,
          resource: null,
          body: "Answer from this module.",
          quiz: [
            {
              id: "ds-m3-q1",
              prompt: "What is least privilege in this course?",
              choices: [
                { id: "a", text: "Grant every permission so you are not blocked later." },
                { id: "b", text: "Grant only the access the current task needs, then review it." },
                { id: "c", text: "Share one admin account across the team." },
                { id: "d", text: "Allow checkout on demo items for testers." },
              ],
              correctChoiceId: "b",
              explanation: "Least privilege is the fewest doors open for the current task.",
            },
            {
              id: "ds-m3-q2",
              prompt: "Which item must not be pasted into an AI Tutor prompt?",
              choices: [
                { id: "a", text: "A question about a lesson you are taking." },
                { id: "b", text: "A service-role key or .env contents." },
                { id: "c", text: "A request to restate a learning objective." },
                { id: "d", text: "A quiz explanation from this course." },
              ],
              correctChoiceId: "b",
              explanation: "Secrets never go into prompts, tickets, or chat.",
            },
          ],
        },
      ],
    },
    {
      id: "ds-m4",
      title: "Practice and close",
      summary: "A privacy checklist you can reuse.",
      lessons: [
        {
          id: "ds-m4-l1",
          kind: "text",
          title: "Reporting abuse and a monthly pass",
          estimatedMinutes: 7,
          resource: null,
          quiz: [],
          body: `Reporting abuse is a safety action, not a merchandising action. If a person harasses you, impersonates staff, sends malware, or tries to collect a password, use an in-product Report or Block control when it is visible on that post, profile, or conversation. If it is not visible, use Support. Do not amplify the abuse by resharing it. Do not email a company that is not a UMTUBA partner. Testers should also write the finding in the internal task report.

Once a month, run a short pass. Confirm the password manager is unlocking and that UMTUBA is still a unique entry. Confirm recovery codes still exist where you put them. Review browser site permissions. Sign out of sessions you do not recognize. Confirm you have not stored a partner secret in a note, treated a demo product as a real order, or forwarded a one-time code.

This pass is ordinary hygiene. It is not a claim that UMTUBA has measured a specific industry breach rate. This course does not invent those numbers. The habit is useful whether or not a statistic is attached.`,
        },
        {
          id: "ds-m4-r1",
          kind: "resource",
          title: "Privacy pass worksheet",
          estimatedMinutes: 5,
          quiz: [],
          resource: {
            title: "Monthly privacy pass",
            kind: "worksheet",
            body: "Password unique: yes/no\nRecovery codes stored privately: yes/no\nUnknown sessions revoked: yes/no\nSite permissions reviewed: yes/no\nNo secrets in tickets or prompts: yes/no",
          },
          body: `Copy this worksheet into a private note you control, not into a shared course discussion.

- UMTUBA password is unique and stored in a manager: yes / no
- Recovery codes still exist in a private place: yes / no
- Sessions you do not recognize were revoked: yes / no
- Browser permissions reviewed: yes / no
- No API keys, .env contents, or one-time codes were pasted this month: yes / no

A “no” is a task, not a shame score. Fix the row, then continue.`,
        },
        {
          id: "ds-m4-q",
          kind: "quiz",
          title: "Check: monthly pass",
          estimatedMinutes: 3,
          resource: null,
          body: "Answer from the worksheet lesson.",
          quiz: [
            {
              id: "ds-m4-q1",
              prompt: "Where should the privacy-pass worksheet live?",
              choices: [
                { id: "a", text: "In a private note you control." },
                { id: "b", text: "In a public Learning discussion." },
                { id: "c", text: "In a partner onboarding record as plaintext." },
                { id: "d", text: "In an outbound email to a marketplace." },
              ],
              correctChoiceId: "a",
              explanation: "The worksheet can contain recovery status. Keep it private.",
            },
          ],
        },
      ],
    },
  ],
  exercises: [
    {
      id: "ds-ex-1",
      title: "Unique password check",
      prompt:
        "Without revealing the password, confirm that your UMTUBA password is unique and stored in a manager. Write only yes/no plus the date you checked.",
      successCriteria: [
        "The write-up does not include the password or a hint that reconstructs it.",
        "The check date is present.",
        "A 'no' includes a next step that does not involve chat-sharing the secret.",
      ],
    },
    {
      id: "ds-ex-2",
      title: "Phishing rewrite",
      prompt:
        "Rewrite a fake urgent 'activate the partner feed' message into the safe action you would take instead.",
      successCriteria: [
        "The rewrite refuses the inbound request.",
        "Verification happens in a trusted channel, not by replying.",
        "No outbound partnership message is sent.",
      ],
    },
    {
      id: "ds-ex-3",
      title: "Public versus private sort",
      prompt:
        "List three facts about yourself. Mark each public (OK on a profile) or private (never in Messages, tickets, or prompts). Include one reporting action you would take if someone asked for a private fact.",
      successCriteria: [
        "At least one public and one private item are labeled correctly.",
        "No password, recovery code, or government identifier is written in full.",
        "The reporting action uses Support or an in-product control, not outbound partner mail.",
      ],
    },
  ],
  finalAssessment: [
    {
      id: "ds-fa-1",
      prompt: "Password reuse is dangerous because:",
      choices: [
        { id: "a", text: "It makes certificates harder to print." },
        { id: "b", text: "One breached site can unlock another account that shared the secret." },
        { id: "c", text: "UMTUBA forbids password managers." },
        { id: "d", text: "Demo products require a shared team password." },
      ],
      correctChoiceId: "b",
      explanation: "Reuse turns one breach into many.",
    },
    {
      id: "ds-fa-2",
      prompt: "Official UMTUBA recovery happens:",
      choices: [
        { id: "a", text: "On the product’s account pages, not by sending codes in chat." },
        { id: "b", text: "When you forward a code to any staff-looking profile." },
        { id: "c", text: "In an outbound partner email." },
        { id: "d", text: "By sharing one phone authenticator across the office." },
      ],
      correctChoiceId: "a",
      explanation: "Recovery is in-product. Codes stay off chat.",
    },
    {
      id: "ds-fa-3",
      prompt: "A look-alike sign-in page that arrived in email should be handled by:",
      choices: [
        { id: "a", text: "Signing in there if the logo matches." },
        { id: "b", text: "Opening the product from a bookmark or installed app instead." },
        { id: "c", text: "Uploading your recovery codes to the page." },
        { id: "d", text: "Asking the sender to confirm by reply." },
      ],
      correctChoiceId: "b",
      explanation: "Do not sign in through an unexpected page. Use a destination you already trust.",
    },
    {
      id: "ds-fa-4",
      prompt: "Least privilege means:",
      choices: [
        { id: "a", text: "Every teammate is a platform admin." },
        { id: "b", text: "Grant only the access the current task needs." },
        { id: "c", text: "Allow all browser permissions once." },
        { id: "d", text: "Store API keys in Learning notes for speed." },
      ],
      correctChoiceId: "b",
      explanation: "Least privilege is the fewest permissions that complete the task.",
    },
    {
      id: "ds-fa-5",
      prompt: "Which data belongs in an AI Tutor prompt on owned content?",
      choices: [
        { id: "a", text: "A question about the lesson you are taking." },
        { id: "b", text: "Another person’s identification number, used as a 'realistic' example." },
        { id: "c", text: "A service-role key." },
        { id: "d", text: "A full .env file." },
      ],
      correctChoiceId: "a",
      explanation: "Tutor prompts may use the lesson. They must not use secrets or other people’s personal data.",
    },
    {
      id: "ds-fa-6",
      prompt: "In this pre-company phase, outbound partnership mail is:",
      choices: [
        { id: "a", text: "An official recovery channel." },
        { id: "b", text: "Not sent; a message claiming otherwise is suspicious." },
        { id: "c", text: "Required to activate demo checkout." },
        { id: "d", text: "The only way to publish an original course." },
      ],
      correctChoiceId: "b",
      explanation: "OUTREACH_SENT remains 0. Mail that claims otherwise is not official.",
    },
    {
      id: "ds-fa-7",
      prompt: "A screenshot for a bug report should:",
      choices: [
        { id: "a", text: "Include the full inbox and any visible tokens." },
        { id: "b", text: "Be cropped so secrets and other people’s data are not visible." },
        { id: "c", text: "Include the .env file for context." },
        { id: "d", text: "Be posted publicly so partners can comment." },
      ],
      correctChoiceId: "b",
      explanation: "Crop or do not attach. Screenshots leak.",
    },
    {
      id: "ds-fa-8",
      prompt: "Sharing one login with a colleague is treated as:",
      choices: [
        { id: "a", text: "A normal Store manager workflow." },
        { id: "b", text: "A security incident, not a convenience." },
        { id: "c", text: "Required for certificate issuance." },
        { id: "d", text: "The same as a vault_ref." },
      ],
      correctChoiceId: "b",
      explanation: "Each person needs their own account and role.",
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
