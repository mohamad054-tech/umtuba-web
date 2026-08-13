/**
 * Account deletion request workflow (web).
 * Queues an authenticated request. Does not delete Auth users or related rows.
 */

export const ACCOUNT_DELETION_PATH = "/account-deletion";
export const ACCOUNT_DELETION_CONFIRMATION_PHRASE = "DELETE";

export const ACCOUNT_DELETION_OPEN_STATUSES = [
  "pending",
  "processing",
] as const;

export type AccountDeletionOpenStatus =
  (typeof ACCOUNT_DELETION_OPEN_STATUSES)[number];

export type AccountDeletionStatus =
  | AccountDeletionOpenStatus
  | "completed"
  | "cancelled"
  | "rejected";

export type AccountDeletionRequestRecord = {
  id: string;
  status: AccountDeletionStatus;
  requestedAt: string;
};

export type AccountDeletionInput = {
  confirmationPhrase: string;
  acknowledged: boolean;
};

export type AccountDeletionResult =
  | {
      ok: true;
      alreadyRequested: boolean;
      request: AccountDeletionRequestRecord;
    }
  | {
      ok: false;
      message: string;
      requiresAuth?: boolean;
    };

export type AccountDeletionStore = {
  findOpenRequest: (
    userId: string
  ) => Promise<AccountDeletionRequestRecord | null>;
  insertPending: (input: {
    userId: string;
    email: string | null;
  }) => Promise<
    | { ok: true; record: AccountDeletionRequestRecord }
    | { ok: false; uniqueViolation: boolean; message: string }
  >;
};

const UNIQUE_VIOLATION = "23505";

export function isOpenDeletionStatus(
  status: string
): status is AccountDeletionOpenStatus {
  return (ACCOUNT_DELETION_OPEN_STATUSES as readonly string[]).includes(
    status
  );
}

export function validateAccountDeletionInput(
  input: AccountDeletionInput
): { ok: true } | { ok: false; message: string } {
  if (!input.acknowledged) {
    return {
      ok: false,
      message:
        "Confirm that you understand this request before submitting.",
    };
  }

  const phrase = input.confirmationPhrase.trim().toUpperCase();
  if (phrase !== ACCOUNT_DELETION_CONFIRMATION_PHRASE) {
    return {
      ok: false,
      message: `Type ${ACCOUNT_DELETION_CONFIRMATION_PHRASE} to confirm.`,
    };
  }

  return { ok: true };
}

export function isUniqueViolationCode(code: string | undefined): boolean {
  return code === UNIQUE_VIOLATION;
}

export async function submitAccountDeletionRequest(
  input: AccountDeletionInput,
  deps: {
    user: { id: string; email?: string | null } | null;
    store: AccountDeletionStore;
  }
): Promise<AccountDeletionResult> {
  if (!deps.user) {
    return {
      ok: false,
      requiresAuth: true,
      message: "Sign in to request deletion of your UMTUBA account.",
    };
  }

  const validated = validateAccountDeletionInput(input);
  if (!validated.ok) {
    return validated;
  }

  const existing = await deps.store.findOpenRequest(deps.user.id);
  if (existing) {
    return {
      ok: true,
      alreadyRequested: true,
      request: existing,
    };
  }

  const inserted = await deps.store.insertPending({
    userId: deps.user.id,
    email: deps.user.email?.trim() || null,
  });

  if (inserted.ok) {
    return {
      ok: true,
      alreadyRequested: false,
      request: inserted.record,
    };
  }

  if (inserted.uniqueViolation) {
    const raced = await deps.store.findOpenRequest(deps.user.id);
    if (raced) {
      return {
        ok: true,
        alreadyRequested: true,
        request: raced,
      };
    }
  }

  return {
    ok: false,
    message: inserted.message,
  };
}
