import Link from "next/link";
import { createTranslator } from "../../../lib/i18n";
import { resolveRequestLocale } from "../../../lib/i18n/server";
import type { TranslationKey } from "../../../lib/i18n/messages/types";
import {
  adminListUgcReports,
  parseUgcReportStatusFilter,
} from "../../../lib/moderation/adminQueries";
import { UGC_REASON_I18N_KEYS } from "../../../lib/moderation/ugcReport";
import { APP_ROUTES } from "../../lib/nav";
import { requirePlatformAdminPage } from "../requirePlatformAdminPage";
import ModerationShell, { FlashMessages, StatusChip } from "./ModerationShell";
import ReportReviewActions from "./ReportReviewActions";

export const metadata = {
  title: "Moderation | UMTUBA Admin",
};

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?:
    | Promise<{
        status?: string;
        id?: string;
        error?: string;
        ok?: string;
      }>
    | {
        status?: string;
        id?: string;
        error?: string;
        ok?: string;
      };
};

const STATUS_LABEL_KEYS: Record<string, TranslationKey> = {
  open: "admin.moderation.status.open",
  reviewing: "admin.moderation.status.reviewing",
  resolved: "admin.moderation.status.resolved",
  dismissed: "admin.moderation.status.dismissed",
};

const FILTER_LABEL_KEYS = {
  open: "admin.moderation.filter.open",
  reviewing: "admin.moderation.filter.reviewing",
  resolved: "admin.moderation.filter.resolved",
  dismissed: "admin.moderation.filter.dismissed",
  all: "admin.moderation.filter.all",
} as const;

const OK_KEYS = new Set<TranslationKey>([
  "admin.moderation.ok.dismissed",
  "admin.moderation.ok.removed",
  "admin.moderation.ok.suspended",
  "admin.moderation.ok.banned",
]);

const ERROR_KEYS = new Set<TranslationKey>([
  "admin.moderation.loadError",
  "admin.moderation.error.generic",
  "admin.moderation.error.forbidden",
  "admin.moderation.error.notFound",
  "admin.moderation.error.reason",
  "admin.moderation.error.own",
  "admin.moderation.error.adminTarget",
  "admin.moderation.error.confirm",
  "admin.moderation.error.noPost",
  "admin.moderation.error.noUser",
]);

function formatWhen(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function flashKey(
  raw: string | undefined,
  allowed: Set<TranslationKey>
): TranslationKey | null {
  if (!raw) return null;
  return allowed.has(raw as TranslationKey) ? (raw as TranslationKey) : null;
}

function reasonLabelKey(code: string): TranslationKey {
  return (
    UGC_REASON_I18N_KEYS[code as keyof typeof UGC_REASON_I18N_KEYS] ??
    "admin.moderation.unavailable"
  );
}

export default async function AdminModerationPage({ searchParams }: PageProps) {
  const { supabase } = await requirePlatformAdminPage(APP_ROUTES.adminModeration);
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  const params = await Promise.resolve(searchParams ?? {});
  const status = parseUgcReportStatusFilter(params.status);
  const list = await adminListUgcReports(supabase, { status });

  const selectedId = params.id;
  const selected =
    list.ok && selectedId
      ? list.rows.find((row) => row.id === selectedId) ?? null
      : list.ok
        ? list.rows[0] ?? null
        : null;

  const okKey = flashKey(params.ok, OK_KEYS);
  const errorKey = flashKey(params.error, ERROR_KEYS);

  const returnTo = `${APP_ROUTES.adminModeration}?status=${encodeURIComponent(status)}${
    selected ? `&id=${selected.id}` : ""
  }`;

  return (
    <ModerationShell
      title={t("admin.moderation.title")}
      subtitle={t("admin.moderation.subtitle")}
      hubLabel={t("admin.moderation.hubNav")}
    >
      <FlashMessages
        error={errorKey ? t(errorKey) : undefined}
        ok={okKey ? t(okKey) : undefined}
      />

      <form className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-3">
        <label className="block space-y-1 text-xs sm:col-span-2">
          <span className="font-bold uppercase tracking-[0.14em] text-white/45">
            {t("admin.moderation.filter")}
          </span>
          <select
            name="status"
            defaultValue={status}
            className="w-full rounded-2xl border border-white/10 bg-black/40 p-3"
          >
            {(Object.keys(FILTER_LABEL_KEYS) as Array<keyof typeof FILTER_LABEL_KEYS>).map(
              (value) => (
                <option key={value} value={value}>
                  {t(FILTER_LABEL_KEYS[value])}
                </option>
              )
            )}
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="watch-focus-ring w-full rounded-full border border-white/15 px-4 py-2.5 text-sm font-bold"
          >
            {t("admin.moderation.apply")}
          </button>
        </div>
      </form>

      {!list.ok ? (
        <p role="alert" className="mt-4 text-sm text-red-100">
          {t(list.messageKey)}
        </p>
      ) : list.rows.length === 0 ? (
        <p className="mt-6 text-sm text-white/50" role="status">
          {t("admin.moderation.empty")}
        </p>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <ul className="space-y-2" aria-label={t("admin.moderation.subtitle")}>
            {list.rows.map((row) => {
              const active = selected?.id === row.id;
              const targetLabel =
                row.target_type === "content"
                  ? t("admin.moderation.targetContent")
                  : t("admin.moderation.targetUser");
              return (
                <li key={row.id}>
                  <Link
                    href={`${APP_ROUTES.adminModeration}?status=${encodeURIComponent(status)}&id=${row.id}`}
                    className={`watch-focus-ring block rounded-2xl border px-4 py-3 transition ${
                      active
                        ? "border-violet-400/40 bg-violet-500/10"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/5"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold">
                        {targetLabel}
                        {row.target_username ? ` @${row.target_username}` : ""}
                      </p>
                      <StatusChip
                        status={row.status}
                        label={t(STATUS_LABEL_KEYS[row.status] ?? "admin.moderation.unavailable")}
                      />
                    </div>
                    <p className="mt-1 text-xs text-white/45">
                      {t(reasonLabelKey(row.reason_code))} · {formatWhen(row.created_at)}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>

          {selected ? (
            <article className="rounded-2xl border border-white/10 bg-[#080816]/80 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">
                    {selected.target_type === "content"
                      ? t("admin.moderation.targetContent")
                      : t("admin.moderation.targetUser")}
                  </h2>
                  <p className="mt-1 text-sm text-white/50">
                    {selected.target_username
                      ? `@${selected.target_username}`
                      : t("admin.moderation.unavailable")}
                  </p>
                </div>
                <StatusChip
                  status={selected.status}
                  label={t(
                    STATUS_LABEL_KEYS[selected.status] ?? "admin.moderation.unavailable"
                  )}
                />
              </div>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                    {t("admin.moderation.reporter")}
                  </dt>
                  <dd className="mt-1">
                    {selected.reporter_username
                      ? `@${selected.reporter_username}`
                      : t("admin.moderation.unavailable")}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                    {t("admin.moderation.target")}
                  </dt>
                  <dd className="mt-1">
                    {selected.target_type === "content"
                      ? `${t("admin.moderation.targetContent")}${
                          selected.target_post_id != null
                            ? ` #${selected.target_post_id}`
                            : ""
                        }`
                      : t("admin.moderation.targetUser")}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                    {t("admin.moderation.reason")}
                  </dt>
                  <dd className="mt-1">{t(reasonLabelKey(selected.reason_code))}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                    {t("admin.moderation.age")}
                  </dt>
                  <dd className="mt-1">{formatWhen(selected.created_at)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                    {t("admin.moderation.detail")}
                  </dt>
                  <dd className="mt-1 text-white/80">
                    {selected.reason_detail || "—"}
                  </dd>
                </div>
              </dl>

              {selected.target_type === "content" ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 px-3 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                    {t("admin.moderation.postContent")}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-white/80">
                    {selected.post_content?.trim() || t("admin.moderation.noContent")}
                  </p>
                  <p className="mt-2 text-xs text-white/45">
                    {t("admin.moderation.author")}:{" "}
                    {selected.post_author_username
                      ? `@${selected.post_author_username}`
                      : t("admin.moderation.unavailable")}
                    {selected.post_deleted_at
                      ? ` · ${t("admin.moderation.removed")}`
                      : ""}
                  </p>
                </div>
              ) : null}

              <ReportReviewActions
                reportId={selected.id}
                targetUserId={selected.target_user_id}
                targetPostId={selected.target_post_id}
                postDeleted={Boolean(selected.post_deleted_at)}
                canAct={
                  selected.status === "open" || selected.status === "reviewing"
                }
                returnTo={returnTo}
                copy={{
                  actions: t("admin.moderation.actions"),
                  reasonNote: t("admin.moderation.reasonNote"),
                  reasonPlaceholder: t("admin.moderation.reasonPlaceholder"),
                  dismiss: t("admin.moderation.dismiss"),
                  removePost: t("admin.moderation.removePost"),
                  suspend: t("admin.moderation.suspend"),
                  ban: t("admin.moderation.ban"),
                  banConfirm: t("admin.moderation.banConfirm"),
                  banConfirmLabel: t("admin.moderation.banConfirmLabel"),
                  working: t("admin.moderation.working"),
                }}
              />
            </article>
          ) : null}
        </div>
      )}
    </ModerationShell>
  );
}
