import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  allowMessengerPreviewChrome,
  isSurfaceAllowed,
} from "../lib/product/surfaceGates";

const ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("messenger preview gate", () => {
  it("hides messenger preview chrome in production", () => {
    expect(allowMessengerPreviewChrome({ NODE_ENV: "production" })).toBe(false);
    expect(
      allowMessengerPreviewChrome({
        NODE_ENV: "production",
        NEXT_PUBLIC_ALLOW_SURFACE_PREVIEWS: "1",
      })
    ).toBe(false);
    expect(isSurfaceAllowed("messengerPreviewChrome", { NODE_ENV: "production" })).toBe(
      false
    );
  });

  it("keeps messenger preview chrome off by default in development", () => {
    expect(allowMessengerPreviewChrome({ NODE_ENV: "development" })).toBe(false);
    expect(
      allowMessengerPreviewChrome({
        NODE_ENV: "development",
        NEXT_PUBLIC_ALLOW_SURFACE_PREVIEWS: "0",
      })
    ).toBe(false);
  });

  it("allows messenger preview chrome only with explicit opt-in flag", () => {
    expect(
      allowMessengerPreviewChrome({
        NODE_ENV: "development",
        NEXT_PUBLIC_ALLOW_SURFACE_PREVIEWS: "1",
      })
    ).toBe(true);
  });
});

describe("messenger production UI contracts", () => {
  it("production composer exposes text + send only (no attach/voice)", () => {
    const composer = read("app/messages/components/MessageComposer.tsx");
    expect(composer).toMatch(/Send message/);
    expect(composer).toMatch(/messenger-composer-input/);
    expect(composer).toMatch(/Enter sends/);
    expect(composer).not.toMatch(/Attachments coming soon/i);
    expect(composer).not.toMatch(/Voice messages coming soon/i);
    expect(composer).not.toMatch(/aria-label="Attach file"/);
    expect(composer).not.toMatch(/aria-label="Voice message"/);
    expect(composer).toMatch(/shouldClearDraftAfterSend/);
    expect(composer).toMatch(/canSendComposerText/);
  });

  it("gates fake presence dots behind allowMessengerPreviewChrome", () => {
    const header = read("app/messages/components/ChatHeader.tsx");
    const listItem = read("app/messages/components/ConversationListItem.tsx");
    for (const src of [header, listItem]) {
      expect(src).toMatch(/allowMessengerPreviewChrome/);
      expect(src).toMatch(/OnlineStatusDot/);
      expect(src).toMatch(/showPresenceChrome/);
    }
  });

  it("preserves mobile bottom-nav pad and composer safe-area", () => {
    const shell = read("app/messages/components/MessagesShell.tsx");
    const composer = read("app/messages/components/MessageComposer.tsx");
    expect(shell).toMatch(/MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS/);
    expect(composer).toMatch(/env\(safe-area-inset-bottom\)/);
  });

  it("keeps honest empty states and send-error aria-live", () => {
    const chat = read("app/messages/components/ChatWindow.tsx");
    const list = read("app/messages/components/ConversationList.tsx");
    const experience = read("app/messages/MessagesExperience.tsx");

    expect(chat).toMatch(/Select a conversation/);
    expect(chat).toMatch(/No messages yet/);
    expect(chat).toMatch(/statusMessage=\{sendError\}/);
    expect(list).toMatch(/Message a creator/);
    expect(experience).toMatch(/return false/);
    expect(experience).toMatch(/return true/);
    expect(experience).toMatch(/Preserve composer draft/);
  });

  it("does not ship mock attachments or dead call controls", () => {
    const messagesDir = [
      "app/messages/components/MessageComposer.tsx",
      "app/messages/components/ChatHeader.tsx",
      "app/messages/components/ChatWindow.tsx",
      "app/messages/MessagesExperience.tsx",
    ];
    for (const file of messagesDir) {
      const src = read(file);
      expect(src).not.toMatch(/coming soon/i);
      expect(src).not.toMatch(/video.?call/i);
      expect(src).not.toMatch(/start.?call/i);
      expect(src).not.toMatch(/mockAttachment/i);
      expect(src).not.toMatch(/fakeVoice/i);
    }
  });

  it("wires Phase 2 reply, reaction, edit, delete, and mute surfaces", () => {
    const bubble = read("app/messages/components/MessageBubble.tsx");
    const composer = read("app/messages/components/MessageComposer.tsx");
    const header = read("app/messages/components/ChatHeader.tsx");
    const experience = read("app/messages/MessagesExperience.tsx");
    const migration = read(
      "supabase/migrations/20260729_messenger_production_phase2.sql"
    );

    expect(bubble).toMatch(/replyPreview/);
    expect(bubble).toMatch(/Delete for me/);
    expect(bubble).toMatch(/Delete for everyone/);
    expect(bubble).toMatch(/Edited/);
    expect(bubble).toMatch(/MESSAGE_REACTION_EMOJIS/);
    expect(composer).toMatch(/replyTo/);
    expect(composer).toMatch(/editingMessage/);
    expect(header).toMatch(/Mute for 1 hour|MUTE_OPTION_LABELS/);
    expect(experience).toMatch(/useMessengerRealtime/);
    expect(experience).toMatch(/toggleReactionAction/);
    expect(experience).toMatch(/setConversationMuteAction/);

    expect(migration).toMatch(/message_reactions/);
    expect(migration).toMatch(/message_hides/);
    expect(migration).toMatch(/edit_own_text_message/);
    expect(migration).toMatch(/soft_delete_message_for_everyone/);
    expect(migration).toMatch(/hide_message_for_me/);
    expect(migration).toMatch(/set_conversation_mute/);
    expect(migration).toMatch(/is_muted = true/);
    expect(migration).toMatch(/supabase_realtime add table public.message_reactions/);
    expect(migration).not.toMatch(/drop table/i);
  });

  it("keeps Sent / Delivered / Seen receipt labels in the bubble", () => {
    const bubble = read("app/messages/components/MessageBubble.tsx");
    expect(bubble).toMatch(/Seen/);
    expect(bubble).toMatch(/Delivered/);
    expect(bubble).toMatch(/Sent/);
    expect(bubble).toMatch(/receiptStatus/);
  });
});
