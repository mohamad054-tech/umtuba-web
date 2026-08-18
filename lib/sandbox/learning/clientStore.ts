/**
 * Cached Learning sandbox localStorage store.
 * React useSyncExternalStore requires getSnapshot to return the same
 * reference when the underlying value has not changed. Returning a fresh
 * object every read causes an infinite client re-render and a generic
 * "This page couldn’t load" crash on the first hydrated Learning action
 * (exercise, quiz, lesson complete).
 */

import { LEARNING_SANDBOX_STATE_COOKIE } from "./routes";
import {
  EMPTY_LEARNING_SANDBOX_STATE,
  parseLearningSandboxState,
  reduceLearningSandboxState,
  type LearningSandboxAction,
  type LearningSandboxState,
} from "./state";

export const LEARNING_SANDBOX_CLIENT_STORAGE_KEY = LEARNING_SANDBOX_STATE_COOKIE;

const listeners = new Set<() => void>();

let hasCache = false;
let cachedRaw: string | null = null;
let cachedState: LearningSandboxState = EMPTY_LEARNING_SANDBOX_STATE;

function notify() {
  listeners.forEach((listener) => listener());
}

export function subscribeLearningSandboxClientStore(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getLearningSandboxServerSnapshot(): LearningSandboxState {
  return EMPTY_LEARNING_SANDBOX_STATE;
}

export function readLearningSandboxClientState(): LearningSandboxState {
  if (typeof window === "undefined") return EMPTY_LEARNING_SANDBOX_STATE;
  const raw = window.localStorage.getItem(LEARNING_SANDBOX_CLIENT_STORAGE_KEY);
  if (hasCache && raw === cachedRaw) return cachedState;
  hasCache = true;
  cachedRaw = raw;
  cachedState = parseLearningSandboxState(raw);
  return cachedState;
}

export function persistLearningSandboxState(state: LearningSandboxState) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(state);
  window.localStorage.setItem(LEARNING_SANDBOX_CLIENT_STORAGE_KEY, raw);
  hasCache = true;
  cachedRaw = raw;
  cachedState = state;
  notify();
}

export function dispatchLearningSandboxAction(action: LearningSandboxAction) {
  persistLearningSandboxState(reduceLearningSandboxState(readLearningSandboxClientState(), action));
}

export function resetLearningSandboxClientStoreForTests() {
  hasCache = false;
  cachedRaw = null;
  cachedState = EMPTY_LEARNING_SANDBOX_STATE;
  listeners.clear();
}
