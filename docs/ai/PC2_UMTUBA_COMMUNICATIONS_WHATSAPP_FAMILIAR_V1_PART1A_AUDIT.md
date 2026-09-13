# PC2 UMTUBA Communications — WhatsApp-familiar V1 Part 1A Audit

**AUDIT ONLY. Nothing implemented. No migrations. No deploy. No store upload.**

No official numbered 1–137 spec file was found in `docs/` (search-no-match for `WHATSAPP_FAMILIAR`, `PART1A_AUDIT`, `IDENTITY & DISCOVERY` as a checklist). Items **1–137** below are the product checklist derived from this task’s six category ranges. Classifications use current source inspection, not historical reports.

```text
TASK_ID = PC2_UMTUBA_COMMUNICATIONS_WHATSAPP_FAMILIAR_V1_PART1A_AUDIT
STATUS = AUDIT_COMPLETE
AUTHORITATIVE_SHARED_SOURCE = Shared Supabase messenger domain (public.conversations / messages / participants + RPCs in 20260713_messenger_v1_foundation.sql + 20260729_messenger_production_phase2.sql). Web client: lib/supabase/messenger.ts + app/messages. Mobile client: umtuba-mobile src/lib/messenger/api.ts + app/(tabs)/messages.tsx + app/messages/[id].tsx. One domain, two presentations.
SOURCE_SHA = 455fdca8805b39cc5716861583109a4ab6600dbe
WEB_CURRENT = c:\Users\Giga store\Desktop\umtuba\umtuba-web-translation-trunk-port-v1 @ 455fdca8805b39cc5716861583109a4ab6600dbe (branch pc2/um-life-rich-personal-profile-v1-part2b; no upstream; 2B profile docs committed; messenger product files not part of 2B delta)
ANDROID_CURRENT = Inspected checkout: c:\Users\Giga store\Desktop\umtuba\umtuba-mobile @ 77e9e287e117fc9a19f9a5df1596f69b0b8bf07f (branch pc2/eas-preview-config-v1; Expo ~57.0.7; package umtuba-mobile; com.umtuba.app). DIVERGED from origin/master: ahead 1, behind 1. Did not merge/rebase/reset. Remote master tip: origin/master 09e94f80775855d7e2036fa7d83d63b9202fb8a4. Same Expo app ships Android + iOS. Docs also freeze a later release-candidate SHA 17cbfefbc8c77d5286efdf2c9b941101db84b6c3 (iOS Build 29 / Android Fold6) in sibling worktree c:\Users\Giga store\Desktop\umtuba\umtuba-mobile-pc2-ios-build29-17cbfef-v1 — do not treat 77e9e287 as the shipped binary SoT.
IOS_CURRENT = SAME Expo app as ANDROID_CURRENT. Inspected messenger source at 77e9e287. Shipped iOS SoT per docs: 17cbfefbc8c77d5286efdf2c9b941101db84b6c3 (Build 29, worktree umtuba-mobile-pc2-ios-build29-17cbfef-v1). reconcile ref origin/central/mobile-reconcile-ios-android-v1 = f66f15c8 (not checked out). Expo managed — no committed native ios/ tree. iOS infoPlist has photo library + notifications only; no NSCamera/NSMicrophone/NSContacts (Android declares CAMERA + RECORD_AUDIO). Mobile live join stubbed (isLiveJoinContractConfigured = false).
CURRENT_MESSAGING_ARCHITECTURE = Production 1:1 text messenger on shared Postgres + Supabase Realtime. Inbox filters kind=direct only. Schema already reserved for group/channel/phone kinds, attachments, call message_type. Web ships Phase 2 UX (reply/react/edit/delete/mute). Mobile ships inbox + thread text, typing, receipts, drafts, realtime; not Phase 2 mute/react/edit/delete UI.
CURRENT_IDENTITY_ARCHITECTURE = Auth is email+password (Supabase Auth). Public identity is profiles.username (unique lowercase [a-z0-9._]{3,24}) + display_name. No profiles.phone. No profiles.email. Email lives on auth.users only. Phone exists only on Store/Ads/World commerce/contact fields — not person-to-person discovery.
CURRENT_REALTIME_ARCHITECTURE = Supabase Realtime channels: web useMessengerRealtime (thread messages + message_reactions + messenger-inbox participant updates, reconnect/resync). Mobile subscribeMessengerRealtime (inbox + thread). Typing and peer last_read via RPC poll (list_conversation_peers / getConversationPeerState) because peer mute/unread are RLS-private. Fake online-presence chrome gated off in production.
CURRENT_NOTIFICATION_ARCHITECTURE = In-app notifications: notify_on_direct_message trigger → create_notification type direct_message, href /messages?conversation=. Mute-aware (phase 2). Web NotificationBell + /notifications. Push: public.push_tokens (ios/android/web, expo/apns/fcm) with register RPCs — comment: "No send pipeline in V1." Mobile expo-notifications registers tokens and parses DM deep links. Browser web-push send not found.
CURRENT_CALL_ARCHITECTURE = No 1:1 voice/video calling product. conversations.kind includes 'phone' and messages.message_type includes 'call' as reserved columns only. Live rooms use LiveKit (app/live, LIVEKIT_* env) for broadcast/stage — not DM calls. No CallKit / ConnectionService / incoming-call UI. Composer/header tests forbid dead call controls.
GAP_MATRIX =
[1 Phone identity stored | MISSING | WEB+ANDROID+IOS | profiles/auth have no person phone; store/ads phones only | dedicated hashed phone identity table + verified bind, not profiles.phone]
[2 Phone OTP verify | MISSING | WEB+ANDROID+IOS | auth is signInWithPassword/signUpWithEmail only (lib/supabase/auth.ts, mobile AuthContext) | SMS/OTP provider + bind flow]
[3 Phone discover without exposing number | MISSING | ALL | no phone_hash / lookup RPC | hash-match RPC returns user_id only]
[4 Email as registered identity | EXISTS | ALL | auth.users.email; signup email confirm | keep; do not copy onto public profiles]
[5 Email discover without exposing email | MISSING | ALL | search queries username/display_name/full_name only (lib/search/queries.ts); no email.ilike | private email-hash lookup RPC]
[6 Username / @handle | EXISTS | ALL | profiles.username unique; /profile/[username]; search people tab | reuse]
[7 Username search | EXISTS | WEB; PARTIAL ANDROID+IOS | globalSearch people + ShareToMessagesPanel; mobile has profile deep links, no dedicated people-search-to-chat surface found | mobile people search → get_or_create]
[8 Personal QR generate | MISSING | ALL | qr/QRCode/qrcode search-no-match in web ts/tsx/sql | original UMTUBA QR of personal link]
[9 Personal QR scan-to-contact | MISSING | ALL | no scanner for person QR; iOS has no NSCamera/NSMicrophone; Android CAMERA/RECORD_AUDIO are Watch/Live, not contacts QR | scan → username or opaque token + iOS purpose strings]
[10 Personal UMTUBA link | PARTIAL | WEB+ANDROID+IOS | /profile/{username} share clipboard; umtuba://profile; AASA /* | add umtuba.com/@handle + messages entry link]
[11 Deep-link contact | PARTIAL | ALL | /messages?creatorId= / conversation=; mobile DeepLinkTarget messages | add handle + hashed-phone tokens]
[12 Contacts permission | MISSING | ANDROID+IOS | app.config.ts has no NSContacts / READ_CONTACTS / expo-contacts (search-no-match) | OS permission + purpose string]
[13 Contacts hash-match | MISSING | ALL | no contact sync tables/RPCs | client-side hash upload, server match, no raw numbers stored]
[14 Profile Message CTA | EXISTS | WEB; PARTIAL MOBILE | ProfileActions + StartDirectMessageButton; mobile can open via creatorId deep link | mobile profile Message button parity]
[15 Profile Call CTA | MISSING | ALL | ProfileActions has Follow/Message/Watch Live/Share only | after Part 3]
[16 Share Watch → conversation | PARTIAL | WEB; MISSING MOBILE | Web ShareToMessagesPanel from DiscoverActionRail + HomeLatestPostLayer (URL-as-text). Mobile WatchVideoCard: "Share, coming soon"; no expo-sharing / OS share sheet | typed cards; mobile share-to-messages]
[17 Share UM Life → conversation | PARTIAL | WEB | Home feed uses ShareToMessagesPanel | same as 16; not a distinct UM Life composer]
[18 Share Learning → conversation | MISSING | ALL | app/learning ShareToMessages search-no-match | Learning share target]
[19 Share Store → conversation | MISSING | ALL | app/store ShareToMessages search-no-match; store has public_contact_phone (commerce) | Store share target]
[20 Discovery privacy controls | MISSING | ALL | no who-can-find-me; profiles SELECT using(true) so usernames are globally searchable; 2B forbids collecting phone/private email on profiles | new privacy prefs + optional hide-from-search]
[21 Inbox list | EXISTS | WEB+ANDROID+IOS | MessagesExperience / messages.tsx listConversationsForUser | keep]
[22 Last-message preview | EXISTS | ALL | conversations.last_message_preview + trigger | keep]
[23 Unread badge | EXISTS | ALL | conversation_participants.unread_count; UnreadBadge web | keep]
[24 Open 1:1 thread | EXISTS | ALL | /messages?conversation= ; /messages/[id] | keep]
[25 Get-or-create direct | EXISTS | ALL | get_or_create_direct_conversation RPC | keep]
[26 Send text | EXISTS | ALL | sendTextMessage / sendMessageAction; 4000 cap | keep]
[27 Receive realtime | EXISTS | ALL | useMessengerRealtime / subscribeMessengerRealtime | keep]
[28 Timestamps | EXISTS | ALL | formatBubbleTime / formatMessageTime | keep]
[29 Optimistic send + client_id | EXISTS | ALL | unique (conversation,sender,client_id); rollback on fail | keep]
[30 Sent receipt | EXISTS | ALL | computeReceiptStatus sent | keep]
[31 Delivered receipt | PARTIAL | ALL | delivered = peer last_read_at exists but < sentAt (approximation, not device ACK) | optional true delivered ACK later]
[32 Seen receipt | EXISTS | ALL | peer last_read_at >= sentAt via list_conversation_peers | keep]
[33 Typing indicator | EXISTS | ALL | set_conversation_typing + poll; TypingIndicator web | keep]
[34 Online presence | MISSING | ALL | OnlineStatusDot gated by allowMessengerPreviewChrome; production false; no presence table | do not fake; optional later presence]
[35 Last seen | MISSING | ALL | ChatHeader uses last message time as activity, not last_seen | optional privacy-gated last_seen]
[36 Image messages | PARTIAL | ALL | message_type image + message_attachments schema; no upload/send UI; no storage bucket | Part 2 media]
[37 Video messages | PARTIAL | ALL | type reserved; no send path | Part 2]
[38 Voice notes | PARTIAL | ALL | type audio + duration_ms reserved; composer explicitly no voice UI (messengerProduction.test) | Part 2]
[39 File messages | PARTIAL | ALL | type file reserved; no send path | Part 2]
[40 Reply-to | EXISTS | WEB; MISSING MOBILE | reply_to_message_id + composer reply chrome; mobile thread no reply UI | mobile Phase 2]
[41 Forward | PARTIAL | ALL | forwarded_from_message_id + same-conversation trigger; no UI; comment says same conversation only | decide cross-thread forward]
[42 Reactions | EXISTS | WEB; MISSING MOBILE | message_reactions + toggle + realtime; mobile api has no toggleMessageReaction | mobile Phase 2]
[43 Edit | EXISTS | WEB; MISSING MOBILE | edit_own_text_message RPC + composer edit | mobile Phase 2]
[44 Delete for me | EXISTS | WEB; MISSING MOBILE | message_hides + hide_message_for_me | mobile Phase 2]
[45 Delete for everyone | EXISTS | WEB; MISSING MOBILE | soft_delete_message_for_everyone | mobile Phase 2]
[46 Inbox search | PARTIAL | WEB; MISSING MOBILE | ConversationSearch filters peerName + lastMessagePreview client-side | server search later]
[47 In-thread search | MISSING | ALL | no message body search RPC/UI | Part 2]
[48 Mute | EXISTS | WEB; PARTIAL MOBILE | set_conversation_mute; mobile stores is_muted on DTO, no mute menu found | mobile mute UI]
[49 Archive | PARTIAL | ALL | is_archived column; list filters archived=false; no archive UI/action | Part 2]
[50 Pin conversation | MISSING | ALL | no is_pinned column/UI | additive column]
[51 Block user | MISSING | ALL | user_blocks/block_user search-no-match | block table + RPC gate on get_or_create/send]
[52 Report user | MISSING | ALL | no messenger report | reuse moderation if any, else new]
[53 Text composer | EXISTS | ALL | MessageComposer / TextInput | keep]
[54 Emoji helper | EXISTS | WEB; MISSING MOBILE | EMOJI_SET in web composer | optional mobile]
[55 Drafts | PARTIAL | WEB+ANDROID+IOS | web keeps draft in component state; mobile drafts.ts persist | web persist optional]
[56 Pagination | EXISTS | ALL | MESSAGE_PAGE_SIZE 40; cursor | keep]
[57 Link/share cards in chat | PARTIAL | WEB | share sends caption+URL as text; no structured card type | typed share payload]
[58 Chat media gallery | MISSING | ALL | no attachments loaded in mapMessage | Part 2]
[59 Create group | MISSING | ALL | kind group reserved; listConversations filters kind===direct; no create_group RPC | Part 4]
[60 Group title | PARTIAL | ALL | conversations.title allowed when kind<>direct | unused]
[61 Group avatar | MISSING | ALL | no group avatar column | Part 4]
[62 Add members | MISSING | ALL | no add-participant RPC | Part 4]
[63 Remove members | MISSING | ALL | search-no-match | Part 4]
[64 Leave group | MISSING | ALL | search-no-match | Part 4]
[65 Admin/owner roles | PARTIAL | ALL | role member/admin/owner on participants; unused in product | Part 4]
[66 Group description | MISSING | ALL | metadata jsonb only | Part 4]
[67 Group text | PARTIAL | ALL | messages table is kind-agnostic; clients filter direct | enable after create]
[68 Group @mentions | MISSING | ALL | mention tokens exist for posts/notifications, not messenger | Part 4]
[69 Group invite link | MISSING | ALL | search-no-match | Part 4]
[70 Group QR | MISSING | ALL | search-no-match | Part 4]
[71 Mute group | PARTIAL | ALL | mute RPC is conversation-agnostic | works once groups exist]
[72 Group media | MISSING | ALL | same as 36–39 | after Part 2+4]
[73 Admin-only messaging | MISSING | ALL | search-no-match | Part 4]
[74 Participant list UI | MISSING | ALL | list_conversation_peers exists for 1:1 | Part 4]
[75 Group search | MISSING | ALL | search-no-match | Part 4]
[76 Broadcast lists | NOT_RECOMMENDED | ALL | WhatsApp-like mass unicast; high spam risk | skip V1]
[77 Communities/channels product | NOT_RECOMMENDED | ALL | kind channel reserved; overlaps Learning community + Live | do not build a third product]
[78 1:1 voice start | MISSING | ALL | tests forbid video.?call / start.?call in messages UI | Part 3]
[79 1:1 video start | MISSING | ALL | same | Part 3]
[80 Incoming call UI | MISSING | ALL | search-no-match | Part 3]
[81 Outgoing call UI | MISSING | ALL | search-no-match | Part 3]
[82 Accept call | MISSING | ALL | Live admit-to-stage is not a DM call | Part 3]
[83 Decline call | MISSING | ALL | search-no-match | Part 3]
[84 Mute mic (call) | PARTIAL | WEB | LiveKit setMicrophoneEnabled in live only | reuse media stack, new signaling]
[85 Speaker route | MISSING | ALL | no call audio route | Part 3]
[86 Camera toggle (call) | PARTIAL | WEB | Live camera only | Part 3]
[87 Switch camera | MISSING | ALL | search-no-match in messenger | Part 3]
[88 Call duration | MISSING | ALL | search-no-match | Part 3]
[89 End call | MISSING | ALL | search-no-match | Part 3]
[90 Call history | MISSING | ALL | no call_sessions table | Part 3]
[91 Missed call | MISSING | ALL | message_type call unused | Part 3]
[92 Call push | MISSING | ALL | push_tokens exist; no VoIP/call category send | Part 3 + send pipeline]
[93 Foreground incoming | MISSING | ALL | search-no-match | Part 3]
[94 iOS CallKit | MISSING | IOS | app.config no CallKit/PushKit; search-no-match | native module]
[95 Android ConnectionService | MISSING | ANDROID | no full-screen incoming-call intent | native]
[96 Busy/unavailable | MISSING | ALL | search-no-match | Part 3]
[97 Call from chat header | MISSING | ALL | ChatHeader mute only | Part 3]
[98 Call from profile | MISSING | ALL | no Call button | Part 3]
[99 Group voice | MISSING | ALL | Live multi-guest ≠ group call | Part 4 after 3]
[100 Group video | MISSING | ALL | same | later]
[101 Screen share 1:1 | PARTIAL | WEB | Live screen share helpers exist | not for DM]
[102 Quality indicator | MISSING | ALL | live reliability ≠ call MOS | Part 3]
[103 Reconnect | PARTIAL | WEB | Live + messenger realtime reconnect; no call ICE restart | Part 3]
[104 Shared SFU signaling | PARTIAL | WEB+MOBILE | LiveKit for Live; EXPO_PUBLIC_LIVEKIT_URL optional on mobile | evaluate reuse vs separate rooms]
[105 TURN/STUN | UNKNOWN | ALL | LiveKit may supply; no standalone TURN config in repo | confirm with LiveKit project]
[106 Call encryption | UNKNOWN | ALL | LiveKit SRTP typical; not audited as DM E2E | product decision]
[107 PiP / minimize call | MISSING | ALL | search-no-match | Part 3]
[108 Voice↔video switch | MISSING | ALL | search-no-match | Part 3]
[109 Ringtone | MISSING | ALL | search-no-match | Part 3]
[110 Call system rows | PARTIAL | ALL | message_type call reserved; preview 'Call' | wire in Part 3]
[111 Same conversation IDs | EXISTS | ALL | shared UUIDs via same backend | keep one domain]
[112 Multi-device sessions | PARTIAL | ALL | Supabase Auth multi-session possible; no device list UX; push_tokens per device | session/device manager]
[113 Message sync | EXISTS | ALL | server is source of truth; clients refetch | keep]
[114 Read-state sync | EXISTS | ALL | mark_conversation_read + peer cursor | keep]
[115 Typing sync | EXISTS | ALL | typing_at + poll | keep]
[116 Presence sync | MISSING | ALL | no real presence | optional]
[117 Push all devices | PARTIAL | ALL | tokens multi-row; send pipeline missing | send worker]
[118 umtuba://messages | EXISTS | ANDROID+IOS | deepLinks.ts messages target | keep]
[119 Universal/App Links /messages | PARTIAL | ALL | AASA components /* ; Android intentFilters https umtuba.com; web /messages | verify /messages opens app]
[120 QR/link open chat any platform | PARTIAL | ALL | conversation UUID links work; no handle/QR | Part 1B]
[121 Web notifications | PARTIAL | WEB | in-app only; no Web Push subscription found | optional]
[122 Background receive | PARTIAL | ANDROID+IOS | expo-notifications; send path missing so background DMs depend on future worker | Part 2/3]
[123 Offline send queue | PARTIAL | ALL | optimistic in-memory; no durable outbox | Part 2]
[124 Device list / revoke | MISSING | ALL | no messenger device UX | Part 4]
[125 Shared contracts not 3 messengers | EXISTS | ALL | mobile types comment "mirrors umtuba-web"; same RPCs | enforce in all parts]
[126 Comms i18n | PARTIAL | WEB | EN/AR app shell; many messenger strings still English hardcoded (Search conversations, Typing…, Mute) | i18n Part 1B/2]
[127 Messages in shell | EXISTS | ALL | web mobileNav + platform circles; mobile (tabs)/messages catalog available | keep]
[128 Notification center DMs | EXISTS | WEB; PARTIAL MOBILE | type direct_message labeled Message; mobile maps to messages category | keep]
[129 Profile Message integration | EXISTS | WEB | StartDirectMessageButton | mobile parity]
[130 Watch share-to-chat | PARTIAL | WEB | Discover/Home panel; also shareToWhatsApp external | do not treat WhatsApp outbound as UMTUBA chat]
[131 UM Life share-to-chat | PARTIAL | WEB | Home layer | expand]
[132 Learning share-to-chat | MISSING | ALL | search-no-match | Part 4]
[133 Store share-to-chat | MISSING | ALL | search-no-match | Part 4]
[134 Live vs 1:1 call separation | EXISTS | ALL | Live is rooms/stage; messenger has no call UI; must stay separate products | document boundary]
[135 Auth reuse | EXISTS | ALL | same Supabase user id | never second account]
[136 Original UMTUBA UI | EXISTS | ALL | dark premium shell, gradients, no WhatsApp green/tab clone in messages | keep; do not copy WA]
[137 Privacy-first discovery | MISSING | ALL | username public; phone/email not discoverable because not stored for people | design privacy prefs before collecting phone]
PHONE_DISCOVERY_STATUS = MISSING
EMAIL_DISCOVERY_STATUS = MISSING (email exists for login; not discoverable)
USERNAME_DISCOVERY_STATUS = EXISTS (web search + profile URL); mobile entry PARTIAL
CONTACT_SYNC_STATUS = MISSING
PRIVACY_STATUS = MISSING (no who-can-find-me; profile 2B explicitly forbids collecting phone/private email on profiles)
ONE_TO_ONE_CHAT_STATUS = PARTIAL (text 1:1 production on web+mobile; web Phase 2 richer; no media/voice notes/block/pin/archive UI)
GROUP_CHAT_STATUS = MISSING (schema reserved only)
VOICE_CALL_STATUS = MISSING
VIDEO_CALL_STATUS = MISSING
MULTI_DEVICE_STATUS = PARTIAL (same backend; no device manager; push register without send)
WEB_GAPS = Phone/email/QR/contacts/privacy; media/voice notes; archive/pin/block; in-thread search; groups; calls; messenger i18n; Learning/Store share; web push send
ANDROID_GAPS = Same identity/discovery/calls/groups; Phase 2 UX (reply/react/edit/delete/mute); share-to-messages (Watch "coming soon"); contacts permission; ConnectionService; people search; live join stubbed
IOS_GAPS = Same as Android plus CallKit/PushKit; NSContacts + NSCamera + NSMicrophone purpose strings missing (iOS plist has photo library + notifications only)
SHARED_BACKEND_CHANGES_REQUIRED = YES
If YES list only. Do not implement.
- Phone identity: verified E.164 bind + peppered hash lookup RPC that never returns the raw number
- Email discovery hash lookup RPC that never returns the email
- Discovery privacy preferences (phone/email findability)
- Block list + enforce on get_or_create/send
- Optional: pin column; archive RPC/UI; message FTS; structured share payload
- Push send pipeline (Expo/FCM/APNs) for DMs — tokens table exists
- Part 2: message storage bucket + send RPCs for image/video/audio/file
- Part 3: call_sessions + signaling (or LiveKit private rooms) + call message rows
- Part 4: group membership RPCs; do not activate kind=channel as a second messenger
DATABASE_CHANGES_REQUIRED = YES
If YES list only. Do not create migrations.
- communication_identities (user_id, phone_e164_hash, phone_verified_at, email_hash) — not public.profiles columns
- communication_privacy_settings (find_by_phone, find_by_email, …)
- user_blocks
- Optional conversation_participants.is_pinned
- message-media storage bucket
- call_sessions / call_participants (Part 3)
- group invite tokens (Part 4)
- Do not put phone/private email on public.profiles (conflicts with active profile 2B forbidden scope)
RTC_INFRA_REQUIRED = YES
PART1B_IMPLEMENTATION_PLAN = Identity + discovery + privacy + conversation entry. Shared backend first. Platforms: web + Expo Android/iOS against same RPCs. No second messenger.
PART2_IMPLEMENTATION_PLAN = Complete 1:1: media, voice notes, replies/reactions/search parity on mobile, archive/pin/block, structured share cards.
PART3_IMPLEMENTATION_PLAN = Voice/video 1:1 + history + incoming-call OS integration. Reuse LiveKit only as private 1:1 rooms if isolation from Live broadcast is proven; else dedicated RTC. Not Live stages.
PART4_IMPLEMENTATION_PLAN = Groups + multi-device UX + Watch/UM Life/Learning/Store share. No broadcast lists. No WhatsApp Communities clone.
REGRESSION_RISKS = Auth/profile 2B schema; existing 1:1 RLS/RPCs; LiveKit Live rooms; Store/Ads phone fields mistaken for person identity; shareToWhatsApp outbound; notification hrefs; mobile Watch permissions; localization; do not checkout/reset this 2B worktree.
READY_FOR_PART1B = YES
IMPLEMENTED = NO
DEPLOYED = NO
MIGRATIONS_CREATED = NO
PLAY_UPLOAD = NO
APP_STORE_UPLOAD = NO
WEB_PRODUCTION_CHANGED = NO
```

---

## Collision / git snapshot

- Inspected web worktree: `pc2/um-life-rich-personal-profile-v1-part2b` at `455fdca8` (`docs(profile): part 2b schema report`).
- `docs/ai/CURRENT_TASK.md` and `docs/ai/CURSOR_REPORT.md` belong to **Part 2B rich profile** (STATUS = IMPLEMENTED). This audit does **not** replace them. Pointer already present in CURRENT_TASK.
- `git fetch --prune` ran. Branch has **no upstream**. FETCH_HEAD was `9b997b06` (unrelated remote tip). No merge/rebase/reset/stash/force.
- Mobile checkout **diverged** from `origin/master` (ahead 1, behind 1). Reported only. Not synchronized.
- Profile/settings/migration product files were **read for evidence only**, not edited.

---

## Architecture principle (plan)

**One communications domain.** Web and mobile already share tables and RPCs. Do not create three messengers. Platform-specific work is presentation, OS incoming-call, contacts permission, and push.

| Layer | Shared | Platform-only |
| --- | --- | --- |
| Identity / discovery / privacy | Yes | OS contacts, QR camera |
| Conversation + message semantics | Yes | Composer chrome |
| Notifications in-app | Yes | OS push display |
| Calls | Signaling + history shared | CallKit / ConnectionService / web in-app |
| Live rooms | Separate product | — |

---

## Narrative evidence

### Web messaging (this repo)

Foundation migration `supabase/migrations/20260713_messenger_v1_foundation.sql`:

- `conversations.kind` check: `direct | group | channel | phone`
- `messages.message_type`: `text | image | video | file | audio | system | call`
- `message_attachments` foundation (no bucket created)
- `direct_conversation_pairs` unique 1:1
- RPCs: `get_or_create_direct_conversation`, `mark_conversation_read`, `is_conversation_participant`
- Designed “for later” attachments/voice/video/groups; V1 deletion/mute/archive columns present

Phase 2 `supabase/migrations/20260729_messenger_production_phase2.sql`:

- `muted_until`, `set_conversation_mute`, `message_hides`, `edit_own_text_message`, `soft_delete_message_for_everyone`, `message_reactions`, mute-aware `notify_on_direct_message`, Realtime publication, `list_conversation_peers` with `last_read_at`

Client: `lib/supabase/messenger.ts`, `app/actions/messenger.ts`, `app/messages/*`. Production composer is text-only (tested). Presence dots opt-in only. Inbox **filters `kind === "direct"`**.

### Mobile messaging (`umtuba-mobile`)

Same Supabase project assumed. `src/lib/messenger/types.ts` states it mirrors web DTOs. Inbox + thread + realtime + drafts + receipts + typing. **No** Phase 2 reaction/edit/delete/mute menu in `src/lib/messenger` (search-no-match). Android back closes thread then leaves messages (`resolveAndroidBack`).

### Identity

- Signup/signin: email + password (`lib/supabase/auth.ts`, mobile `AuthContext`).
- `profiles`: username, names, bio, city/country, avatar; 2B adds bio_long/cover/website + rich tables. **No phone. No email column.**
- People search: `lib/search/queries.ts` ilike on username/display_name/full_name; skips empty username.
- Email is not searchable (correct for privacy; discovery RPC still missing).
- Profile 2B forbidden scope: do not collect phone or private email on profiles. Communications phone/email **must not** be added to `public.profiles`.

### Sharing

- **Into UMTUBA chat:** `ShareToMessagesPanel` (Home + Discover). Opens/creates DM, sends text + post URL, `recordShareAction`.
- **Out to WhatsApp:** `shareToWhatsApp` / `buildWhatsAppShareUrl` — official click-to-chat **without a phone number**. This is external share, not UMTUBA Communications. Do not clone WhatsApp UI.
- Learning/Store: no share-to-messages.

### Calling vs Live

LiveKit is **Live** (`app/live`, `useLiveMediaSession`, host/stage). Messenger tests **forbid** call buttons. Reserved `call` type is unused. RTC for 1:1 is required and must not merge into Live lobbies.

### Push

`push_tokens` + register/refresh RPCs. Mobile parses `umtuba://messages?conversation=`. **No send pipeline** (migration comment). DM in-app notifications exist on insert.

### Deep links

- Web: `/messages?conversation=&message=&creatorId=`; `/profile/[username]`; AASA `/*` when `APPLE_TEAM_ID` set.
- Mobile: `umtuba://` + https umtuba.com; messages, profile, watch, live, auth.

---

## Items 1–137 (full classification)

Legend: **E** EXISTS · **P** PARTIAL · **M** MISSING · **C** CONFLICT · **NR** NOT_RECOMMENDED

### A. Identity & discovery (1–20)

| # | Feature | Status | Platforms | Evidence | Required delta |
| ---: | --- | :---: | --- | --- | --- |
| 1 | Phone stored as person identity | M | All | No profiles/auth phone; store/ads/world phones only | Dedicated hashed bind, not `profiles.phone` |
| 2 | Phone verified (OTP) | M | All | Email/password auth only | OTP provider + verify |
| 3 | Phone find without exposing number | M | All | No hash lookup | RPC returns user_id only |
| 4 | Registered email identity | E | All | `auth.users.email`, confirm flows | Keep private |
| 5 | Email find without exposing email | M | All | Search has no email field | Hash lookup + privacy |
| 6 | Username / @handle | E | All | Unique username, `/profile/[username]` | Keep |
| 7 | Username search | P | Web E; mobile P | `globalSearch` people; mobile no people→chat search UI | Mobile search |
| 8 | Personal QR generate | M | All | qr/QRCode search-no-match | Original QR of personal link |
| 9 | QR scan to contact | M | All | No person QR scanner | Scan → handle/token |
| 10 | Personal UMTUBA link | P | All | Profile URL + clipboard share | `@handle` + chat-entry link |
| 11 | Deep-link contact | P | All | creatorId / conversation UUID | Handle + private tokens |
| 12 | Contacts OS permission | M | Android+iOS | No expo-contacts / NSContacts / READ_CONTACTS | Permission + copy |
| 13 | Contacts hash sync | M | All | No tables | Hash match, explicit consent |
| 14 | Profile Message | P | Web E; mobile P | `StartDirectMessageButton`; mobile creatorId | Mobile profile CTA |
| 15 | Profile Call | M | All | No Call action | Part 3 |
| 16 | Watch → conversation | P | Web | `ShareToMessagesPanel` on Discover/Home | Typed cards; mobile |
| 17 | UM Life → conversation | P | Web | Home layer same panel | Same |
| 18 | Learning → conversation | M | All | search-no-match | Part 4 |
| 19 | Store → conversation | M | All | search-no-match | Part 4 |
| 20 | Who can find me | M | All | No settings; 2B forbids profile phone/email | Privacy table |

### B. One-to-one chat (21–58)

| # | Feature | Status | Platforms | Evidence | Required delta |
| ---: | --- | :---: | --- | --- | --- |
| 21 | Conversation list | E | All | Inbox screens + `listConversationsForUser` | Keep |
| 22 | Last message preview | E | All | `last_message_preview` | Keep |
| 23 | Unread | E | All | `unread_count` | Keep |
| 24 | Open thread | E | All | Web query / mobile `[id]` | Keep |
| 25 | Get-or-create DM | E | All | RPC | Keep |
| 26 | Send text | E | All | 1–4000 trimmed | Keep |
| 27 | Realtime receive | E | All | Realtime + resync | Keep |
| 28 | Timestamps | E | All | Bubble/list formatters | Keep |
| 29 | Optimistic + idempotency | E | All | `client_id` unique index | Keep |
| 30 | Sent tick | E | All | `receiptStatus` | Keep |
| 31 | Delivered tick | P | All | Inferred from peer cursor, not device ACK | Optional ACK |
| 32 | Seen tick | E | All | `last_read_at` | Keep |
| 33 | Typing | E | All | `typing_at` + UI | Keep |
| 34 | Online presence | M | All | Fake chrome gated off | Do not ship fake |
| 35 | Last seen | M | All | Activity = last message | Optional, privacy |
| 36 | Images | P | All | Type+attachments schema; no send | Part 2 |
| 37 | Video clips | P | All | Type reserved | Part 2 |
| 38 | Voice notes | P | All | Type reserved; UI forbidden | Part 2 |
| 39 | Files | P | All | Type reserved | Part 2 |
| 40 | Reply | P | Web E; mobile M | `reply_to_message_id` | Mobile UI |
| 41 | Forward | P | All | Column; same-conversation only; no UI | Product decision |
| 42 | Reactions | P | Web E; mobile M | 5 emoji set | Mobile |
| 43 | Edit | P | Web E; mobile M | RPC | Mobile |
| 44 | Delete for me | P | Web E; mobile M | `message_hides` | Mobile |
| 45 | Delete for everyone | P | Web E; mobile M | Soft delete | Mobile |
| 46 | Inbox search | P | Web P; mobile M | Name/preview filter | Server + mobile |
| 47 | Thread search | M | All | No FTS | Part 2 |
| 48 | Mute | P | Web E; mobile P | RPC; mobile DTO only | Mobile UI |
| 49 | Archive | P | All | Column + filter; no UI | UI + action |
| 50 | Pin | M | All | No column | Additive |
| 51 | Block | M | All | search-no-match | Table + gates |
| 52 | Report | M | All | search-no-match | Moderation |
| 53 | Composer | E | All | Text send | Keep |
| 54 | Emoji helper | P | Web E; mobile M | Web `EMOJI_SET` | Optional |
| 55 | Drafts | P | All | Mobile persist; web state | Web persist |
| 56 | Pagination | E | All | 40 + cursor | Keep |
| 57 | Share cards | P | Web | URL-as-text | Typed payload |
| 58 | Media gallery | M | All | Attachments not mapped | Part 2 |

### C. Group chat (59–77)

| # | Feature | Status | Platforms | Evidence | Required delta |
| ---: | --- | :---: | --- | --- | --- |
| 59 | Create group | M | All | No RPC; clients filter direct | Part 4 |
| 60 | Group title | P | All | `title` when not direct | Unused |
| 61 | Group avatar | M | All | — | Part 4 |
| 62 | Add members | M | All | — | Part 4 |
| 63 | Remove members | M | All | — | Part 4 |
| 64 | Leave | M | All | — | Part 4 |
| 65 | Roles | P | All | member/admin/owner unused | Part 4 |
| 66 | Description | M | All | metadata only | Part 4 |
| 67 | Group text | P | All | Table OK; product off | Enable after create |
| 68 | @mentions | M | All | Post mentions ≠ messenger | Part 4 |
| 69 | Invite link | M | All | — | Part 4 |
| 70 | Group QR | M | All | — | Part 4 |
| 71 | Mute group | P | All | Mute is conversation-level | Works later |
| 72 | Group media | M | All | — | After Part 2 |
| 73 | Admin-only send | M | All | — | Optional |
| 74 | Participant list UI | M | All | Peer RPC is 1:1-oriented | Part 4 |
| 75 | Group search | M | All | — | Part 4 |
| 76 | Broadcast lists | NR | All | Spam / WhatsApp-specific | Skip |
| 77 | Communities / channels app | NR | All | Overlaps Learning + Live; `kind=channel` reserved | Do not productize |

### D. Voice & video (78–110)

| # | Feature | Status | Platforms | Evidence | Required delta |
| ---: | --- | :---: | --- | --- | --- |
| 78–83 | 1:1 start / in / out / accept / decline | M | All | No messenger call UI | Part 3 |
| 84 | Mute mic | P | Web Live only | `setMicrophoneEnabled` | New call session |
| 85 | Speaker | M | All | — | Part 3 |
| 86 | Camera on/off | P | Web Live only | Live session | Part 3 |
| 87 | Switch camera | M | All | — | Part 3 |
| 88–91 | Duration / end / history / missed | M | All | No `call_sessions` | Part 3 |
| 92–93 | Call push / foreground incoming | M | All | Tokens exist; no VoIP send | Pipeline + UX |
| 94 | CallKit | M | iOS | search-no-match | Native |
| 95 | ConnectionService / FSI | M | Android | search-no-match | Native |
| 96 | Busy | M | All | — | Part 3 |
| 97–98 | Call from header / profile | M | All | Mute-only header | Part 3 |
| 99–100 | Group A/V | M | All | Live ≠ group call | After groups |
| 101 | Screen share 1:1 | P | Web Live | Not DM | Out of V1 |
| 102 | Quality UI | M | All | — | Part 3 |
| 103 | Reconnect | P | Live + chat realtime | No call ICE | Part 3 |
| 104 | SFU | P | LiveKit Live | Reuse only if isolated | Decision |
| 105 | TURN/STUN | UNKNOWN | All | No standalone config | Confirm |
| 106 | Call encryption | UNKNOWN | All | Not DM-E2E audited | Decision |
| 107–109 | PiP / switch A/V / ringtone | M | All | — | Part 3 |
| 110 | `message_type=call` rows | P | All | Reserved preview “Call” | Wire Part 3 |

### E. Cross-platform continuity (111–126)

| # | Feature | Status | Platforms | Evidence | Required delta |
| ---: | --- | :---: | --- | --- | --- |
| 111 | Shared IDs | E | All | Same UUIDs | Keep |
| 112 | Multi-device sessions | P | All | Auth + `push_tokens.device_id` | Device UX |
| 113 | Message sync | E | All | Server SoT | Keep |
| 114 | Read sync | E | All | `mark_conversation_read` | Keep |
| 115 | Typing sync | E | All | Poll peers | Keep |
| 116 | Presence sync | M | All | Gated fake only | Optional |
| 117 | Push all devices | P | All | Multi token; no send | Worker |
| 118 | `umtuba://messages` | E | Mobile | `deepLinks.ts` | Keep |
| 119 | Universal / App Links | P | All | AASA `/*`; Android filters | QA /messages |
| 120 | QR/link any platform | P | All | UUID links only | Part 1B |
| 121 | Web Push | P | Web | In-app only | Optional |
| 122 | Background receive | P | Mobile | Parser ready; no send | Worker |
| 123 | Offline queue | P | All | In-memory optimistic | Outbox |
| 124 | Device revoke | M | All | — | Part 4 |
| 125 | One domain | E | All | Shared RPCs | Enforce |
| 126 | Comms i18n | P | Web | Hardcoded EN in messages UI | EN/AR+ |

### F. UMTUBA integration (127–137)

| # | Feature | Status | Platforms | Evidence | Required delta |
| ---: | --- | :---: | --- | --- | --- |
| 127 | Shell / tabs | E | All | Nav contracts + mobile tab | Keep |
| 128 | Notification center | P | Web E; mobile P | `direct_message` | Keep |
| 129 | Profile Message | P | Web E | Button | Mobile |
| 130 | Watch share | P | Web | Panel + external WhatsApp | Cards; not WA UI |
| 131 | UM Life share | P | Web | Home | Expand |
| 132 | Learning share | M | All | — | Part 4 |
| 133 | Store share | M | All | — | Part 4 |
| 134 | Live ≠ DM call | E | All | Separate stacks | Keep boundary |
| 135 | Same auth | E | All | Same user id | Keep |
| 136 | Original UMTUBA UI | E | All | Dark premium; no WA green | Keep |
| 137 | Privacy-first find | M | All | Username public; phone/email not findable | Privacy before collect |

---

## Privacy controls (design only — do not implement)

**WHO CAN FIND ME BY PHONE**

| Option | Meaning |
| --- | --- |
| Everyone | Hash lookup succeeds for any signed-in user |
| My Contacts | Lookup succeeds only if the seeker’s uploaded contact hash set includes me **and** I uploaded them (mutual) or I allowed one-way — product must pick mutual-only for V1 |
| Connections | Reserved; 2B says connections is schema-reserved / owner-only today — **do not pretend a social graph exists** until a real connections product ships. Until then treat as hidden or map to “people I message / follow mutually” only if explicitly defined |
| Nobody | No phone lookup |

Default recommendation: **My Contacts** after explicit permission, else **Nobody**. Never show the raw number on the peer’s profile or in the thread header.

**WHO CAN FIND ME BY EMAIL**

| Option | Meaning |
| --- | --- |
| Everyone | Hash lookup by exact registered email |
| Connections | Same reservation as above |
| Nobody | No email lookup |

Default recommendation: **Nobody**. Email is login identity; discovery is optional and must not echo the address back.

Do not add these fields to `public.profiles`. Use `communication_privacy_settings`. Do not expose email/phone in search results, message headers, or notifications.

---

## Original UMTUBA experience (design only)

Familiar conventions only: conversation list, thread, bubbles, unread, mute. **Not** WhatsApp green, WA tab bar (Chats/Updates/Communities/Calls), WA call-grid, WA icons, WA copy, or WA assets.

Feel: **fast, clean, private, premium, cross-platform**.

- **Inbox:** UMTUBA dark surface, existing type hierarchy, cyan/violet accents already in messenger gradients — not teal-on-white WA.
- **Thread:** bubbles OK; UMTUBA radius/spacing; receipts as quiet ticks, not WA-style double-check brand.
- **Entry:** Search people by @handle; “Find by number / email” as privacy-explained sheets, not a WA-style contact dump.
- **Calls:** later — in-thread / profile actions; incoming UI is UMTUBA, OS CallKit/FSI only for system integration.
- **Empty states:** already honest (“Message a creator”, “Text messaging only”) — keep honesty; do not add “coming soon” call buttons.

---

## Four-part plan (plan only)

### PART 1B — Identity + discovery + privacy + conversation entry

1. Additive `communication_identities` + `communication_privacy_settings` (not profile columns).
2. Verify phone (OTP) and bind; store peppered hash only.
3. Email hash for optional lookup; never select `auth.users.email` to clients.
4. Username already works — add mobile people search → `get_or_create_direct_conversation`.
5. Personal link `https://umtuba.com/@{username}` + optional `umtuba://u/{username}`; QR encodes that URL (original artwork).
6. Contacts: explicit OS permission; client hashes E.164; server match; no raw address book stored.
7. Wire Profile Message on mobile; keep web button.
8. Privacy settings UI in Settings (comms section), not inside 2B rich-profile editor.
9. i18n EN/AR for new strings.
10. Tests + RLS: seeker never reads peer phone/email.

**Out of 1B:** media, groups, calls, migrations on `public.profiles` phone/email.

### PART 2 — 1:1 messaging completeness

1. `message-media` bucket, signed URLs, send image/video/file/audio RPCs.
2. Voice notes recorder (original control, not WA mic lock animation).
3. Mobile Phase 2: reply, react, edit, delete, mute.
4. Archive + pin + block + report.
5. In-thread search.
6. Structured share payload (Watch/UM Life first).
7. Optional durable outbox.
8. Push send for `direct_message`.

### PART 3 — Voice / video

1. `call_sessions` + signaling. Prefer isolated LiveKit **private 1:1 rooms** only if they cannot join Live stages; else separate RTC.
2. Web in-app call surface (original).
3. iOS CallKit + Android incoming full-screen.
4. History + `message_type=call` rows.
5. Profile/header Call after signaling exists.
6. TURN confirmation.

### PART 4 — Groups + multi-device + product share

1. `create_group` / invite / roles / leave.
2. Do **not** ship broadcast lists or WA Communities.
3. Device list / session revoke.
4. Learning + Store share-to-conversation.
5. Group calls only after 1:1 calls are stable.

---

## Preserve / do not break

Auth, Profile 2B, UM Life, Watch, Learning, Store, localization, existing messenger RLS, Live, Android/iOS production binaries. No deploy, no Play/App Store, no remote migrations.

---

## Security review (audit)

- Existing messenger RLS + SECURITY DEFINER helpers (`is_conversation_participant`, `get_or_create_direct_conversation`) are the correct pattern to extend. New discovery RPCs must be DEFINER with `search_path = public`, return **user_id only**, and honor privacy settings.
- Do not grant `authenticated` SELECT on raw phone/email hashes in a way that allows enumeration dumps — rate-limit lookup RPCs.
- Contacts: process on device; store hashes + salt/pepper; deletion must wipe hashes.
- Block must fail-closed on send and get-or-create.
- Push tokens already own-row RLS; send worker must be service-role only.
- LiveKit keys stay server-side; do not reuse Live room tokens for DM calls.
- External `shareToWhatsApp` must remain outbound-only and must not become a dependency of UMTUBA chat.
- `message_attachments` has SELECT-only RLS today (no INSERT policy) — Part 2 must add a tight insert path, not open client writes.
- `public.profiles` SELECT is `using (true)` — usernames and base scalars are globally findable. Part 1B hide-from-search must not break existing `/profile/[username]` or follow graphs without an explicit product decision.

---

## Tests / TypeScript / Build

Not run (audit-only; no product code changed).

---

## Open issues

1. No numbered 1–137 spec in-repo; this file **is** the checklist.
2. Mobile worktree diverged from `origin/master`; do not reset.
3. Web 2B branch has no upstream; do not treat as comms implementation branch.
4. `Connections` privacy option is not a real graph yet (2B reserved).
5. Push send pipeline absent — mobile cannot show background DMs until it exists.
6. LiveKit reuse for 1:1 is UNKNOWN-safe until isolation is proven (`RTC_INFRA_REQUIRED = YES`).
7. Forward is same-conversation only in DB — product must decide.
8. Delivered ≠ true device ACK.
9. `kind=channel` / broadcast / Communities: NOT_RECOMMENDED.
10. Cursor report for 2B left intact; this file is the durable comms artifact.
11. Mobile checkout `77e9e287` ≠ shipped iOS SoT `17cbfef` (Build 29 worktree). Inspect both; do not reset either.
12. iOS has no camera/mic usage strings — Part 1B QR scan and Part 3 calls need plist additions (original UMTUBA purpose copy, not Watch-only).
13. Mobile Live join is fail-closed (`isLiveJoinContractConfigured() === false`); do not confuse that stub with 1:1 calling.

---

## Parallel inspection addendum

Synthesized after parallel source inspections of web messenger, identity/discovery, Android/mobile, and iOS/calling. Classifications above are unchanged except items 9, 16, 20 and ANDROID/IOS_CURRENT / GAPS.

Confirmed extra evidence (no product edits):

- Web messenger is **production**, not preview-gated. Only fake presence chrome is gated.
- Client send path is **text only**; non-text maps to `[${message_type}]` (`app/messages/lib/mapMessage.ts`).
- Extra Message entry: `app/discover/components/DiscoverCreatorInfo.tsx`.
- Presence DTO hardcodes `status: "offline"` in `lib/supabase/messenger.ts`.
- Mobile thread copy: “Text only — attachments, voice notes, stickers, groups, and calls are not available yet.”
- Mobile Watch share is **coming soon**; no OS share sheet.
- `message_attachments`: SELECT-only policy, no INSERT.
- Profiles RLS: public SELECT; no hide-from-search.
- Shipped mobile binary SoT: `17cbfef` (Build 29 sibling worktree), not the `77e9e287` checkout used for messenger source inspection.
- Mobile LiveKit: env placeholder only; join contract returns false.
- Twilio in `supabase/config.toml` is Auth SMS stub, not a calling stack.
