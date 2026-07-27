/**
 * Hook contracts for future Search / Notifications / Analytics / AI.
 * V2: typed descriptors only — no queue, delivery, or full payloads.
 */

import type { ContentKind, ContentVisibility } from "../contentRegistry";

export type ContentHookEvent =
  | {
      type: "onContentPublished";
      contentKind: ContentKind;
      sourceEntityId: string;
      ownerUserId: string;
      registryId?: string;
      at: string;
    }
  | {
      type: "onContentUnpublished";
      contentKind: ContentKind;
      sourceEntityId: string;
      ownerUserId: string;
      registryId?: string;
      at: string;
    }
  | {
      type: "onVisibilityChanged";
      contentKind: ContentKind;
      sourceEntityId: string;
      ownerUserId: string;
      visibility: ContentVisibility;
      at: string;
    }
  | {
      type: "onDiscoveryReady";
      contentKind: ContentKind;
      sourceEntityId: string;
      ownerUserId: string;
      discoveryPostId: number;
      at: string;
    }
  | {
      type: "onContentDeleted";
      contentKind: ContentKind;
      sourceEntityId: string;
      ownerUserId: string;
      at: string;
    };

type HookListener = (event: ContentHookEvent) => void;

const listeners = new Set<HookListener>();

/** Test/runtime subscription — production surfaces may no-op. */
export function subscribeContentHooks(listener: HookListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitContentHook(event: ContentHookEvent): void {
  // Fail soft — hooks must never break lifecycle.
  for (const listener of listeners) {
    try {
      listener(event);
    } catch (error) {
      console.error("content hook listener failed", event.type, error);
    }
  }
}

/** Guard: hook payloads must not include article body / media blobs. */
export function isBoundedHookPayload(event: ContentHookEvent): boolean {
  const json = JSON.stringify(event);
  if (json.length > 1200) return false;
  if (/\"body\"\s*:/.test(json)) return false;
  if (/\"video_path\"\s*:/.test(json)) return false;
  return true;
}
