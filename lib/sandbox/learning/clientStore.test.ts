import { afterEach, describe, expect, it } from "vitest";
import {
  dispatchLearningSandboxAction,
  persistLearningSandboxState,
  readLearningSandboxClientState,
  resetLearningSandboxClientStoreForTests,
} from "./clientStore";
import { LEARNING_SANDBOX_CLIENT_STORAGE_KEY } from "./clientStore";
import { EMPTY_LEARNING_SANDBOX_STATE } from "./state";

function installMemoryStorage() {
  const mem: Record<string, string> = {};
  const localStorage = {
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(mem, key) ? mem[key]! : null;
    },
    setItem(key: string, value: string) {
      mem[key] = value;
    },
    removeItem(key: string) {
      delete mem[key];
    },
  };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage },
  });
  return mem;
}

afterEach(() => {
  resetLearningSandboxClientStoreForTests();
  delete (globalThis as { window?: unknown }).window;
});

describe("Learning sandbox client store snapshot cache", () => {
  it("returns the same object when localStorage has not changed", () => {
    installMemoryStorage();
    const first = readLearningSandboxClientState();
    const second = readLearningSandboxClientState();
    expect(first).toBe(second);
    for (let i = 0; i < 50; i += 1) {
      expect(readLearningSandboxClientState()).toBe(first);
    }
  });

  it("keeps the persisted reference after dispatch so React will not loop", () => {
    const mem = installMemoryStorage();
    dispatchLearningSandboxAction({
      type: "enroll",
      studentId: "demo-student-01",
      courseSlug: "umtuba-platform-essentials",
    });
    const after = readLearningSandboxClientState();
    expect(readLearningSandboxClientState()).toBe(after);
    expect(after.enrollments["demo-student-01::umtuba-platform-essentials"]?.enrolled).toBe(true);
    expect(mem[LEARNING_SANDBOX_CLIENT_STORAGE_KEY]).toContain("umtuba-platform-essentials");
  });

  it("does not invent a new empty object on every empty-store read", () => {
    installMemoryStorage();
    persistLearningSandboxState(EMPTY_LEARNING_SANDBOX_STATE);
    const a = readLearningSandboxClientState();
    const b = readLearningSandboxClientState();
    expect(a).toBe(b);
  });
});
