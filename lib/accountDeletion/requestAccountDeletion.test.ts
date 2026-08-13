import { describe, expect, it, vi } from "vitest";
import {
  ACCOUNT_DELETION_CONFIRMATION_PHRASE,
  isUniqueViolationCode,
  submitAccountDeletionRequest,
  validateAccountDeletionInput,
  type AccountDeletionStore,
} from "./requestAccountDeletion";

const USER = { id: "11111111-1111-4111-8111-111111111111", email: "user@example.com" };

function pendingRecord(id = "req-1") {
  return {
    id,
    status: "pending" as const,
    requestedAt: "2026-08-13T12:00:00.000Z",
  };
}

describe("validateAccountDeletionInput", () => {
  it("requires acknowledgement", () => {
    const result = validateAccountDeletionInput({
      confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE,
      acknowledged: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/understand/i);
    }
  });

  it("requires the confirmation phrase", () => {
    const result = validateAccountDeletionInput({
      confirmationPhrase: "please delete",
      acknowledged: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain(ACCOUNT_DELETION_CONFIRMATION_PHRASE);
    }
  });

  it("accepts a case-insensitive DELETE confirmation", () => {
    expect(
      validateAccountDeletionInput({
        confirmationPhrase: " delete ",
        acknowledged: true,
      }).ok
    ).toBe(true);
  });
});

describe("submitAccountDeletionRequest", () => {
  it("blocks unauthenticated callers without inserting", async () => {
    const insertPending = vi.fn();
    const store: AccountDeletionStore = {
      findOpenRequest: vi.fn(),
      insertPending,
    };

    const result = await submitAccountDeletionRequest(
      {
        confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE,
        acknowledged: true,
      },
      { user: null, store }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.requiresAuth).toBe(true);
      expect(result.message).toMatch(/sign in/i);
    }
    expect(insertPending).not.toHaveBeenCalled();
  });

  it("does not insert when confirmation is missing", async () => {
    const insertPending = vi.fn();
    const store: AccountDeletionStore = {
      findOpenRequest: vi.fn(),
      insertPending,
    };

    const result = await submitAccountDeletionRequest(
      { confirmationPhrase: "", acknowledged: false },
      { user: USER, store }
    );

    expect(result.ok).toBe(false);
    expect(insertPending).not.toHaveBeenCalled();
  });

  it("returns an existing open request without inserting again", async () => {
    const existing = pendingRecord();
    const insertPending = vi.fn();
    const store: AccountDeletionStore = {
      findOpenRequest: vi.fn().mockResolvedValue(existing),
      insertPending,
    };

    const result = await submitAccountDeletionRequest(
      {
        confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE,
        acknowledged: true,
      },
      { user: USER, store }
    );

    expect(result).toEqual({
      ok: true,
      alreadyRequested: true,
      request: existing,
    });
    expect(insertPending).not.toHaveBeenCalled();
  });

  it("queues a new pending request for the signed-in user only", async () => {
    const created = pendingRecord("req-new");
    const insertPending = vi.fn().mockResolvedValue({
      ok: true,
      record: created,
    });
    const store: AccountDeletionStore = {
      findOpenRequest: vi.fn().mockResolvedValue(null),
      insertPending,
    };

    const result = await submitAccountDeletionRequest(
      {
        confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE,
        acknowledged: true,
      },
      { user: USER, store }
    );

    expect(result).toEqual({
      ok: true,
      alreadyRequested: false,
      request: created,
    });
    expect(insertPending).toHaveBeenCalledWith({
      userId: USER.id,
      email: USER.email,
    });
  });

  it("treats a unique-violation race as already requested", async () => {
    const raced = pendingRecord("req-race");
    const findOpenRequest = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(raced);
    const store: AccountDeletionStore = {
      findOpenRequest,
      insertPending: vi.fn().mockResolvedValue({
        ok: false,
        uniqueViolation: true,
        message: "duplicate",
      }),
    };

    const result = await submitAccountDeletionRequest(
      {
        confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE,
        acknowledged: true,
      },
      { user: USER, store }
    );

    expect(result).toEqual({
      ok: true,
      alreadyRequested: true,
      request: raced,
    });
  });

  it("does not treat another user's id as the caller", async () => {
    const insertPending = vi.fn().mockResolvedValue({
      ok: true,
      record: pendingRecord(),
    });
    const store: AccountDeletionStore = {
      findOpenRequest: vi.fn().mockResolvedValue(null),
      insertPending,
    };

    await submitAccountDeletionRequest(
      {
        confirmationPhrase: ACCOUNT_DELETION_CONFIRMATION_PHRASE,
        acknowledged: true,
      },
      { user: USER, store }
    );

    expect(insertPending.mock.calls[0]?.[0]?.userId).toBe(USER.id);
    expect(insertPending.mock.calls[0]?.[0]?.userId).not.toBe(
      "22222222-2222-4222-8222-222222222222"
    );
  });
});

describe("isUniqueViolationCode", () => {
  it("detects Postgres unique_violation", () => {
    expect(isUniqueViolationCode("23505")).toBe(true);
    expect(isUniqueViolationCode("42501")).toBe(false);
    expect(isUniqueViolationCode(undefined)).toBe(false);
  });
});
