/**
 * Registers allowlisted Content Services V2 adapters exactly once.
 */

import { articleContentAdapter } from "../adapters/articleAdapter";
import { videoContentAdapter } from "../adapters/videoAdapter";
import {
  getRegisteredAdapter,
  registerContentAdapter,
} from "./adapterRuntime";

let bootstrapped = false;

export function ensureBuiltinContentAdaptersRegistered(): void {
  if (bootstrapped) return;
  if (!getRegisteredAdapter("article")) {
    registerContentAdapter(articleContentAdapter);
  }
  if (!getRegisteredAdapter("video")) {
    registerContentAdapter(videoContentAdapter);
  }
  bootstrapped = true;
}
