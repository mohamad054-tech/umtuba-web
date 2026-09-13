/**
 * Data export request workflow (web).
 * Queues an authenticated request. Does not generate or download an export.
 */

export const DATA_EXPORT_PATH = "/data-export";

export const DATA_EXPORT_OPEN_STATUSES = ["pending", "processing"] as const;

export type DataExportOpenStatus = (typeof DATA_EXPORT_OPEN_STATUSES)[number];

export type DataExportStatus =
  | DataExportOpenStatus
  | "completed"
  | "cancelled"
  | "rejected";

export type DataExportRequestRecord = {
  id: string;
  status: DataExportStatus;
  requestedAt: string;
};

export type DataExportInput = {
  acknowledged: boolean;
};

export type DataExportResult =
  | {
      ok: true;
      alreadyRequested: boolean;
      request: DataExportRequestRecord;
    }
  | {
      ok: false;
      message: string;
      requiresAuth?: boolean;
    };

export type DataExportStore = {
  findOpenRequest: (userId: string) => Promise<DataExportRequestRecord | null>;
  insertPending: (input: {
    userId: string;
    email: string | null;
  }) => Promise<
    | { ok: true; record: DataExportRequestRecord }
    | { ok: false; uniqueViolation: boolean; message: string }
  >;
};

const UNIQUE_VIOLATION = "23505";

export function isOpenExportStatus(
  status: string
): status is DataExportOpenStatus {
  return (DATA_EXPORT_OPEN_STATUSES as readonly string[]).includes(status);
}

export function validateDataExportInput(
  input: DataExportInput
): { ok: true } | { ok: false; message: string } {
  if (!input.acknowledged) {
    return {
      ok: false,
      message: "Confirm that you understand this request before submitting.",
    };
  }

  return { ok: true };
}

export function isUniqueViolationCode(code: string | undefined): boolean {
  return code === UNIQUE_VIOLATION;
}

export async function submitDataExportRequest(
  input: DataExportInput,
  deps: {
    user: { id: string; email?: string | null } | null;
    store: DataExportStore;
  }
): Promise<DataExportResult> {
  if (!deps.user) {
    return {
      ok: false,
      requiresAuth: true,
      message: "Sign in to request a copy of your UMTUBA data.",
    };
  }

  const validated = validateDataExportInput(input);
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
