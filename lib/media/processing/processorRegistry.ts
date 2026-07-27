/**
 * Processor Registry — allowlist only, no duplicate kinds, no fallback.
 */

import type { MediaProcessor } from "./processor";
import {
  isMediaProcessorKind,
  type MediaProcessorKind,
} from "./types";

const processors = new Map<MediaProcessorKind, MediaProcessor>();

export function registerMediaProcessor(processor: MediaProcessor): void {
  if (!isMediaProcessorKind(processor.kind)) {
    throw new Error(`Unsupported media processor kind: ${processor.kind}`);
  }
  if (processors.has(processor.kind)) {
    throw new Error(`Duplicate media processor for kind: ${processor.kind}`);
  }
  processors.set(processor.kind, processor);
}

export function getMediaProcessor(
  kind: MediaProcessorKind | string
):
  | { ok: true; processor: MediaProcessor }
  | { ok: false; message: string } {
  if (!isMediaProcessorKind(kind)) {
    return { ok: false, message: "Unsupported media processor kind." };
  }
  const processor = processors.get(kind);
  if (!processor) {
    return { ok: false, message: "Unknown media processor." };
  }
  return { ok: true, processor };
}

export function listRegisteredMediaProcessors(): MediaProcessorKind[] {
  return [...processors.keys()].sort();
}

/** Test helper — clears registry. */
export function resetMediaProcessorRegistryForTests(): void {
  processors.clear();
}
