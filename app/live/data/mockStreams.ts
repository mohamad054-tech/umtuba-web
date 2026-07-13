/**
 * Demo live rooms for UI when Supabase live tables are not applied yet.
 * Production path uses lib/supabase/live.ts + app/actions/live.ts.
 * Exact coordinates are never exposed on client DTOs.
 */

import type { LiveChatMessage, LiveRoom } from "../types";
import {
  avatarGradientFromId,
  initialsFromName,
  previewAccentFromId,
  previewGradientFromId,
} from "../types";

function mockHost(
  id: string,
  name: string,
  handle: string,
  followersLabel: string
) {
  return {
    id,
    name,
    handle,
    initials: initialsFromName(name),
    avatarGradient: avatarGradientFromId(id),
    followersLabel,
  };
}

function mockChat(
  roomId: string,
  items: Array<{
    id: string;
    userId: string;
    userName: string;
    text: string;
    sentAt: string;
    isCreator?: boolean;
  }>
): LiveChatMessage[] {
  return items.map((item) => ({
    id: item.id,
    roomId,
    userId: item.userId,
    userName: item.userName,
    userInitials: initialsFromName(item.userName),
    avatarGradient: avatarGradientFromId(item.userId),
    text: item.text,
    sentAt: item.sentAt,
    createdAt: new Date().toISOString(),
    isCreator: item.isCreator,
  }));
}

export const MOCK_LIVE_ROOMS: LiveRoom[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    title: "Sunrise over Lagos Island — live from the waterfront",
    description: null,
    category: "Travel",
    visibility: "public",
    status: "live",
    city: "Lagos",
    country: "Nigeria",
    latitude: null,
    longitude: null,
    viewerCount: 18420,
    peakViewerCount: 18420,
    chatMessageCount: 6,
    recordingStatus: "none",
    startedAt: new Date(Date.now() - 42 * 60_000).toISOString(),
    endedAt: null,
    createdAt: new Date().toISOString(),
    startedAtLabel: "Started 42 min ago",
    previewGradient: previewGradientFromId("lagos"),
    previewAccent: previewAccentFromId("lagos"),
    previewLabel: "Lagos waterfront · golden hour",
    host: mockHost("creator-amara", "Amara Okonkwo", "@amara.ok", "128K"),
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    title: "Shibuya crossing after rain",
    description: null,
    category: "City Life",
    visibility: "public",
    status: "live",
    city: "Tokyo",
    country: "Japan",
    latitude: null,
    longitude: null,
    viewerCount: 22105,
    peakViewerCount: 22105,
    chatMessageCount: 2,
    recordingStatus: "none",
    startedAt: new Date(Date.now() - 60 * 60_000).toISOString(),
    endedAt: null,
    createdAt: new Date().toISOString(),
    startedAtLabel: "Started 1h ago",
    previewGradient: previewGradientFromId("tokyo"),
    previewAccent: previewAccentFromId("tokyo"),
    previewLabel: "Shibuya · neon rain",
    host: mockHost("creator-yuki", "Yuki Tanaka", "@yuki.live", "96K"),
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    title: "Street samba rehearsal — Lapa",
    description: null,
    category: "Music",
    visibility: "public",
    status: "live",
    city: "Rio de Janeiro",
    country: "Brazil",
    latitude: null,
    longitude: null,
    viewerCount: 9734,
    peakViewerCount: 9734,
    chatMessageCount: 1,
    recordingStatus: "none",
    startedAt: new Date(Date.now() - 18 * 60_000).toISOString(),
    endedAt: null,
    createdAt: new Date().toISOString(),
    startedAtLabel: "Started 18 min ago",
    previewGradient: previewGradientFromId("rio"),
    previewAccent: previewAccentFromId("rio"),
    previewLabel: "Lapa · rehearsal energy",
    host: mockHost("creator-rafa", "Rafael Costa", "@rafa.beats", "54K"),
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    title: "Midnight atelier — sketching the Seine",
    description: null,
    category: "Art",
    visibility: "public",
    status: "live",
    city: "Paris",
    country: "France",
    latitude: null,
    longitude: null,
    viewerCount: 6120,
    peakViewerCount: 6120,
    chatMessageCount: 1,
    recordingStatus: "none",
    startedAt: new Date(Date.now() - 55 * 60_000).toISOString(),
    endedAt: null,
    createdAt: new Date().toISOString(),
    startedAtLabel: "Started 55 min ago",
    previewGradient: previewGradientFromId("paris"),
    previewAccent: previewAccentFromId("paris"),
    previewLabel: "Seine · soft floodlights",
    host: mockHost("creator-camille", "Camille Dupont", "@camille.ink", "41K"),
  },
];

export const MOCK_LIVE_CHAT: Record<string, LiveChatMessage[]> = {
  [MOCK_LIVE_ROOMS[0].id]: mockChat(MOCK_LIVE_ROOMS[0].id, [
    {
      id: "lc1",
      userId: "u1",
      userName: "Kai Nakamura",
      text: "That skyline glow is unreal",
      sentAt: "2m ago",
    },
    {
      id: "lc2",
      userId: "u2",
      userName: "Sofia Reyes",
      text: "Watching from Mexico City — good morning Lagos!",
      sentAt: "1m ago",
    },
    {
      id: "lc3",
      userId: "creator-amara",
      userName: "Amara Okonkwo",
      text: "Welcome everyone — pan left in a sec for the ferry.",
      sentAt: "1m ago",
      isCreator: true,
    },
  ]),
  [MOCK_LIVE_ROOMS[1].id]: mockChat(MOCK_LIVE_ROOMS[1].id, [
    {
      id: "tc1",
      userId: "u6",
      userName: "Maya Chen",
      text: "Neon reflections are perfect tonight",
      sentAt: "3m ago",
    },
  ]),
};

export const FEATURED_ROOM_ID = MOCK_LIVE_ROOMS[0].id;

export function getMockRoomById(id: string): LiveRoom | undefined {
  return MOCK_LIVE_ROOMS.find((room) => room.id === id);
}

/** @deprecated use MOCK_LIVE_ROOMS */
export const MOCK_LIVE_STREAMS = MOCK_LIVE_ROOMS;
export const FEATURED_STREAM_ID = FEATURED_ROOM_ID;
export const getStreamById = getMockRoomById;
