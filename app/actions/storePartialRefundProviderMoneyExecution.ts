/**
 * Admin first-time provider money execute + readiness + recovery (P3).
 * First-time submit is fail-closed behind dual gates + execution mode + operator ACK.
 * Recovery remains LOOKUP only.
 */

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ADMIN_STORE_UNAUTHORIZED,
  assertPlatformAdminDb,
} from "../../lib/store/adminAuth";
import {
  assertAdminProviderMoneyExecuteAllowed,
  buildPartialRefundProviderMoneyReadinessReport,
  createPartialRefundProviderMoneyServiceRole,
  PARTIAL_REFUND_PROVIDER_MONEY_OPERATOR_ACK_FIELD,
  recoverPartialRefundProviderMoneyLookup,
  runAdminExecutePartialRefundProviderMoney,
} from "../../lib/store/partialRefundProviderMoneyExecution";
import { createPartialRefundReservationServiceRole } from "../../lib/store/partialRefundReservation";
import { createClient, getServerUser } from "../../lib/supabase/server";
import { APP_ROUTES } from "../lib/nav";

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function backPath(formData: FormData): string {
  const raw = formString(formData, "returnTo").trim();
  if (raw.startsWith("/admin/store")) return raw;
  return APP_ROUTES.adminStoreRefunds;
}

async function requirePlatformAdmin() {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.adminStoreRefunds)}`
    );
  }
  const supabase = await createClient();
  const isAdmin = await assertPlatformAdminDb(supabase);
  if (!isAdmin) {
    redirect(
      `${APP_ROUTES.home}?error=${encodeURIComponent(ADMIN_STORE_UNAUTHORIZED)}`
    );
  }
  return { user, supabase };
}

export type AdminPartialRefundProviderMoneyReadinessActionResult =
  | {
      ok: true;
      readiness: ReturnType<typeof buildPartialRefundProviderMoneyReadinessReport>;
      executeAllowed: boolean;
      executeBlockCode: string | null;
    }
  | { ok: false; message: string; code?: string };

/**
 * Platform-admin only. Returns readiness/status contracts.
 */
export async function adminGetPartialRefundProviderMoneyReadinessAction(): Promise<AdminPartialRefundProviderMoneyReadinessActionResult> {
  const user = await getServerUser();
  if (!user) {
    return { ok: false, message: "Authentication required.", code: "unauthorized" };
  }
  const supabase = await createClient();
  const isAdmin = await assertPlatformAdminDb(supabase);
  if (!isAdmin) {
    return {
      ok: false,
      message: ADMIN_STORE_UNAUTHORIZED,
      code: "unauthorized",
    };
  }

  const readiness = buildPartialRefundProviderMoneyReadinessReport(process.env);
  const executeGuard = assertAdminProviderMoneyExecuteAllowed(process.env);

  return {
    ok: true,
    readiness,
    executeAllowed: executeGuard.ok,
    executeBlockCode: executeGuard.ok
      ? null
      : "code" in executeGuard
        ? executeGuard.code
        : "gate_disabled",
  };
}

/**
 * First-time provider money execute — fail-closed.
 * Uses trusted PaymentIntent resolution only; never trusts client pi_ refs.
 * Does not compensate / restock / Sync / commerce_confirm.
 */
export async function adminExecutePartialRefundProviderMoneyAction(
  formData: FormData
): Promise<void> {
  const { user } = await requirePlatformAdmin();
  const back = backPath(formData);
  const storeId = formString(formData, "storeId").trim();
  const ledgerId = formString(formData, "ledgerId").trim();
  const operatorReason = formString(formData, "operatorReason");
  const operatorMoneyAck = formString(
    formData,
    PARTIAL_REFUND_PROVIDER_MONEY_OPERATOR_ACK_FIELD
  );
  // Explicitly ignore any client-supplied provider refs.
  const forbiddenPi =
    formString(formData, "providerPaymentRef") ||
    formString(formData, "paymentIntentId") ||
    formString(formData, "payment_intent");

  const guard = assertAdminProviderMoneyExecuteAllowed(process.env);
  if (!guard.ok) {
    redirect(
      `${back}?prProvExecError=${encodeURIComponent(guard.message.slice(0, 180))}&prProvExecStatus=${encodeURIComponent(guard.code)}&prProvStoreId=${encodeURIComponent(storeId)}&prProvExecLedgerId=${encodeURIComponent(ledgerId)}`
    );
  }

  const ledgerBoot = createPartialRefundReservationServiceRole();
  if (!ledgerBoot.ok) {
    redirect(
      `${back}?prProvExecError=${encodeURIComponent(ledgerBoot.message.slice(0, 180))}&prProvExecStatus=unsupported&prProvStoreId=${encodeURIComponent(storeId)}`
    );
  }

  const execBoot = createPartialRefundProviderMoneyServiceRole();
  if (!execBoot.ok) {
    redirect(
      `${back}?prProvExecError=${encodeURIComponent(execBoot.message.slice(0, 180))}&prProvExecStatus=unsupported&prProvStoreId=${encodeURIComponent(storeId)}`
    );
  }

  const result = await runAdminExecutePartialRefundProviderMoney(
    {
      ledgerId,
      expectedStoreId: storeId,
      operatorUserId: user.id,
      operatorReason,
      operatorMoneyAck,
      clientProviderPaymentRef: forbiddenPi || null,
      clientBag: {
        // presence of these keys is rejected by orchestrator if monetary
      },
    },
    {
      factClient: ledgerBoot.supabase,
      ledgerRepository: ledgerBoot.repository,
      executionRepository: execBoot.repository,
      repository: execBoot.repository,
      env: process.env,
    }
  );

  revalidatePath(APP_ROUTES.adminStoreRefunds);
  revalidatePath(back);

  if (!result.ok) {
    redirect(
      `${back}?prProvExecError=${encodeURIComponent(result.message.slice(0, 180))}&prProvExecStatus=${encodeURIComponent(result.code)}&prProvStoreId=${encodeURIComponent(storeId)}&prProvExecLedgerId=${encodeURIComponent(ledgerId)}`
    );
  }

  redirect(
    `${back}?prProvExecOk=1&prProvExecStatus=${encodeURIComponent(result.value.phase)}&prProvExecLedgerId=${encodeURIComponent(result.value.execution.ledgerId)}&prProvExecExecutionId=${encodeURIComponent(result.value.execution.executionId)}&prProvExecSubmit=${result.value.providerSubmitCalled ? "1" : "0"}&prProvStoreId=${encodeURIComponent(storeId)}`
  );
}

/**
 * Admin recovery — LOOKUP ONLY. Never submitPartialRefund.
 */
export async function adminRecoverPartialRefundProviderMoneyLookupAction(
  formData: FormData
): Promise<void> {
  const { user } = await requirePlatformAdmin();
  const back = backPath(formData);
  const storeId = formString(formData, "storeId").trim();
  const executionId = formString(formData, "executionId").trim();
  const ledgerId = formString(formData, "ledgerId").trim();

  const boot = createPartialRefundProviderMoneyServiceRole();
  if (!boot.ok) {
    redirect(
      `${back}?prProvRecError=${encodeURIComponent(boot.message.slice(0, 180))}&prProvStoreId=${encodeURIComponent(storeId)}`
    );
  }

  const result = await recoverPartialRefundProviderMoneyLookup(
    {
      storeId,
      executionId: executionId || null,
      ledgerId: ledgerId || null,
      expectedStoreId: storeId,
    },
    {
      repository: boot.repository,
      env: process.env,
      factClient: boot.supabase,
    }
  );

  revalidatePath(APP_ROUTES.adminStoreRefunds);
  revalidatePath(back);

  if (!result.ok) {
    redirect(
      `${back}?prProvRecError=${encodeURIComponent(result.message.slice(0, 180))}&prProvStoreId=${encodeURIComponent(storeId)}`
    );
  }

  void user;
  redirect(
    `${back}?prProvRecOk=1&prProvRecStatus=${encodeURIComponent(result.value.phase)}&prProvRecLedgerId=${encodeURIComponent(result.value.execution.ledgerId)}&prProvRecExecutionId=${encodeURIComponent(result.value.execution.executionId)}&prProvStoreId=${encodeURIComponent(storeId)}`
  );
}
