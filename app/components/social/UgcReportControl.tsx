"use client";

import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  reportUgcContentAction,
  reportUgcUserAction,
} from "../../actions/ugcReport";
import { useTranslation } from "../i18n";
import { useDialogA11y } from "../../lib/product/useDialogA11y";
import { APP_ROUTES } from "../../lib/nav";
import {
  UGC_REASON_CODES,
  UGC_REASON_I18N_KEYS,
  isReportPostId,
  isReportUuid,
} from "../../../lib/moderation/ugcReport";
import {
  PROFILE_A11Y_FOCUS_RING_CLASS,
  PROFILE_A11Y_TOUCH_TARGET_CLASS,
} from "../../profile/lib/profileAccessibility";

type ContentTarget = {
  kind: "content";
  postId: number;
  ownerUserId?: string | null;
};

type UserTarget = {
  kind: "user";
  userId: string;
};

type Props = {
  target: ContentTarget | UserTarget;
  viewerId?: string | null;
  returnPath: string;
  variant?: "rail" | "button" | "none";
  /** When set, the dialog is controlled by the parent (More menu). */
  controlledOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export default function UgcReportControl({
  target,
  viewerId = null,
  returnPath,
  variant = "button",
  controlledOpen,
  onOpenChange,
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [reasonCode, setReasonCode] = useState<(typeof UGC_REASON_CODES)[number]>(
    "spam"
  );
  const [detail, setDetail] = useState("");
  const [errorKey, setErrorKey] = useState<
    | "report.error.generic"
    | "report.error.auth"
    | "report.error.own"
    | "report.error.already"
    | null
  >(null);
  const [done, setDone] = useState(false);

  const ownContent =
    target.kind === "content" &&
    Boolean(viewerId && target.ownerUserId && viewerId === target.ownerUserId);
  const ownUser =
    target.kind === "user" && Boolean(viewerId && viewerId === target.userId);
  const invalidContent =
    target.kind === "content" && !isReportPostId(target.postId);
  const invalidUser = target.kind === "user" && !isReportUuid(target.userId);
  const blocked = ownContent || ownUser || invalidContent || invalidUser;
  const dialogOpen = controlledOpen ?? open;

  if (blocked) {
    return null;
  }

  function openDialog() {
    if (!viewerId) {
      router.push(
        `${APP_ROUTES.login}?next=${encodeURIComponent(returnPath || APP_ROUTES.home)}`
      );
      return;
    }
    setErrorKey(null);
    setDone(false);
    setOpen(true);
    onOpenChange?.(true);
  }

  async function submit() {
    if (pending || !viewerId) {
      return;
    }
    setPending(true);
    setErrorKey(null);
    const result =
      target.kind === "content"
        ? await reportUgcContentAction({
            postId: target.postId,
            reasonCode,
            reasonDetail: detail,
          })
        : await reportUgcUserAction({
            userId: target.userId,
            reasonCode,
            reasonDetail: detail,
          });
    setPending(false);
    if (!result.ok) {
      setErrorKey(result.key);
      return;
    }
    setDone(true);
    setOpen(false);
    onOpenChange?.(false);
  }

  function closeDialog() {
    if (pending) return;
    setOpen(false);
    onOpenChange?.(false);
  }

  const trigger =
    variant === "none" ? null : variant === "rail" ? (
      <button
        type="button"
        className="watch-focus-ring flex flex-col items-center gap-1"
        aria-label={t("report.aria")}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          openDialog();
        }}
      >
        <span className="watch-rail-btn flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-md">
          <FlagIcon />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wide text-white/55">
          {t("report.button")}
        </span>
      </button>
    ) : (
      <button
        type="button"
        className={`${PROFILE_A11Y_FOCUS_RING_CLASS} ${PROFILE_A11Y_TOUCH_TARGET_CLASS} rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white/80 transition hover:bg-white/10 hover:text-white`}
        aria-label={t("report.aria")}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          openDialog();
        }}
      >
        {t("report.button")}
      </button>
    );

  return (
    <div className={variant === "rail" ? "relative" : "relative z-10"}>
      {trigger}
      {done ? (
        <p className="sr-only" role="status">
          {t("report.success")}
        </p>
      ) : null}
      {dialogOpen && typeof document !== "undefined"
        ? createPortal(
            <ReportDialog
              titleId={titleId}
              title={
                target.kind === "content"
                  ? t("report.title.content")
                  : t("report.title.user")
              }
              pending={pending}
              reasonCode={reasonCode}
              detail={detail}
              error={errorKey ? t(errorKey) : null}
              onReasonChange={setReasonCode}
              onDetailChange={setDetail}
              onClose={closeDialog}
              onSubmit={() => void submit()}
            />,
            document.body
          )
        : null}
    </div>
  );
}

function ReportDialog({
  titleId,
  title,
  pending,
  reasonCode,
  detail,
  error,
  onReasonChange,
  onDetailChange,
  onClose,
  onSubmit,
}: {
  titleId: string;
  title: string;
  pending: boolean;
  reasonCode: (typeof UGC_REASON_CODES)[number];
  detail: string;
  error: string | null;
  onReasonChange: (value: (typeof UGC_REASON_CODES)[number]) => void;
  onDetailChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useDialogA11y({
    open: true,
    onClose,
    containerRef: dialogRef,
  });

  return (
    <div className="fixed inset-0 z-[140] flex items-end justify-center p-3 sm:items-center sm:p-6">
      <button
        type="button"
        tabIndex={-1}
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-[2px]"
        aria-label={t("report.cancel")}
        disabled={pending}
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-t-[28px] border border-white/15 bg-[#0b0b18] p-5 text-white shadow-2xl sm:rounded-[28px]"
      >
        <h2 id={titleId} className="text-lg font-black">
          {title}
        </h2>
        <label className="mt-4 block space-y-1 text-xs">
          <span className="font-bold uppercase tracking-[0.14em] text-white/45">
            {t("report.reasonLabel")}
          </span>
          <select
            value={reasonCode}
            disabled={pending}
            onChange={(event) =>
              onReasonChange(event.target.value as (typeof UGC_REASON_CODES)[number])
            }
            className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm"
          >
            {UGC_REASON_CODES.map((code) => (
              <option key={code} value={code}>
                {t(UGC_REASON_I18N_KEYS[code])}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 block space-y-1 text-xs">
          <span className="font-bold uppercase tracking-[0.14em] text-white/45">
            {t("report.detailLabel")}
          </span>
          <textarea
            value={detail}
            disabled={pending}
            maxLength={1000}
            rows={3}
            onChange={(event) => onDetailChange(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm outline-none focus:border-violet-400/40"
            placeholder={t("report.detailPlaceholder")}
          />
        </label>
        {error ? (
          <p role="alert" className="mt-3 text-sm font-bold text-red-200">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={pending}
            className="watch-focus-ring min-h-[44px] rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-white/80 hover:bg-white/10 disabled:opacity-50"
            onClick={onClose}
          >
            {t("report.cancel")}
          </button>
          <button
            type="button"
            disabled={pending}
            aria-busy={pending}
            className="watch-focus-ring min-h-[44px] rounded-full bg-white px-4 py-2.5 text-sm font-black text-black hover:bg-white/90 disabled:cursor-wait disabled:opacity-60"
            onClick={onSubmit}
          >
            {pending ? t("report.submitting") : t("report.submit")}
          </button>
        </div>
      </div>
    </div>
  );
}

function FlagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 4v16M5 5h11l-1.4 3.6L16 12H5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
