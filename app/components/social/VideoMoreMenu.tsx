"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type Ref,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { deletePostAction } from "../../actions/deletePost";
import { updatePostCaptionAction } from "../../actions/updatePostCaption";
import { useTranslation } from "../i18n";
import { APP_ROUTES } from "../../lib/nav";
import { useDialogA11y } from "../../lib/product/useDialogA11y";
import { sanitizeUserFacingMessage } from "../../lib/product/userFacingMessage";
import { type SharePostInput } from "../../lib/social/shareAndViews";
import { MAX_CAPTION_LENGTH } from "../../../lib/supabase/videoPostsShared";
import { viewerMaySeeDeleteControl } from "../../../lib/supabase/deleteOwnedPostShared";
import { clampDeleteMenuBox } from "./clampDeleteMenuBox";
import UgcReportControl from "./UgcReportControl";

type VideoMoreMenuProps = {
  postId: number;
  caption?: string;
  viewerId?: string | null;
  ownerUserId?: string | null;
  returnPath: string;
  surface?: SharePostInput["surface"];
  onDeleted?: (postId: number) => void;
  onHideFromFeed?: (postId: number) => void;
  onCaptionChange?: (caption: string) => void;
  onUiLockChange?: (locked: boolean) => void;
  /** Watch: post journey lives in this menu instead of on the video. */
  onJourney?: () => void;
  journeyLabel?: string;
  /** Watch: AI summary lives in this menu instead of on the video. */
  summaryTitle?: string;
  summaryBody?: string;
};

export default function VideoMoreMenu({
  postId,
  caption = "",
  viewerId = null,
  ownerUserId = null,
  returnPath,
  surface = "discover",
  onDeleted,
  onHideFromFeed,
  onCaptionChange,
  onUiLockChange,
  onJourney,
  journeyLabel,
  summaryTitle,
  summaryBody,
}: VideoMoreMenuProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const titleId = useId();
  const isOwner = viewerMaySeeDeleteControl(viewerId, ownerUserId);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [editValue, setEditValue] = useState(caption);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const firstMenuRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const editInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [menuBox, setMenuBox] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const uiLocked = menuOpen || editOpen || confirmOpen || reportOpen;

  useEffect(() => {
    onUiLockChange?.(uiLocked);
  }, [onUiLockChange, uiLocked]);

  useEffect(() => {
    return () => onUiLockChange?.(false);
  }, [onUiLockChange]);

  useDialogA11y({
    open: menuOpen,
    onClose: () => {
      if (!pending) setMenuOpen(false);
    },
    containerRef: menuRef,
    initialFocusRef: firstMenuRef,
  });

  useDialogA11y({
    open: confirmOpen,
    onClose: () => {
      if (!pending) setConfirmOpen(false);
    },
    containerRef: dialogRef,
    initialFocusRef: confirmRef,
  });

  useDialogA11y({
    open: editOpen,
    onClose: () => {
      if (!pending) setEditOpen(false);
    },
    containerRef: dialogRef,
    initialFocusRef: editInputRef,
  });

  useLayoutEffect(() => {
    if (!menuOpen) {
      return;
    }

    function syncMenuBox() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const dir = document.documentElement.dir === "rtl" ? "rtl" : "ltr";
      setMenuBox(
        clampDeleteMenuBox({
          trigger: {
            top: rect.top,
            left: rect.left,
            right: rect.right,
            bottom: rect.bottom,
          },
          viewport: { width: window.innerWidth, height: window.innerHeight },
          dir,
          menuWidth: summaryBody ? 280 : 220,
          menuHeight: 176 + (summaryBody ? 96 : 0) + (onJourney ? 48 : 0),
        })
      );
    }

    syncMenuBox();
    window.addEventListener("resize", syncMenuBox);
    window.addEventListener("scroll", syncMenuBox, true);
    return () => {
      window.removeEventListener("resize", syncMenuBox);
      window.removeEventListener("scroll", syncMenuBox, true);
    };
  }, [menuOpen, onJourney, summaryBody]);

  if (!Number.isInteger(postId) || postId <= 0) {
    return null;
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  function showStatus(message: string) {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(null), 2200);
  }

  function handleNotInterested() {
    closeMenu();
    onHideFromFeed?.(postId);
  }

  function handleEditCaption() {
    setEditValue(caption);
    setErrorMessage(null);
    closeMenu();
    setEditOpen(true);
  }

  function handleDelete() {
    setErrorMessage(null);
    closeMenu();
    setConfirmOpen(true);
  }

  function handleReport() {
    closeMenu();
    if (!viewerId) {
      router.push(
        `${APP_ROUTES.login}?next=${encodeURIComponent(returnPath || APP_ROUTES.home)}`
      );
      return;
    }
    setReportOpen(true);
  }

  async function handleSaveCaption() {
    if (pending) return;
    setPending(true);
    setErrorMessage(null);
    const result = await updatePostCaptionAction(postId, editValue);
    if (!result.ok) {
      setPending(false);
      setErrorMessage(
        sanitizeUserFacingMessage(result.message, t("video.more.editError"))
      );
      return;
    }
    onCaptionChange?.(result.content);
    setPending(false);
    setEditOpen(false);
    showStatus(t("video.more.editSuccess"));
  }

  async function handleConfirmDelete() {
    if (pending) return;
    setPending(true);
    setErrorMessage(null);
    const result = await deletePostAction(postId);
    if (!result.ok) {
      setPending(false);
      setErrorMessage(
        sanitizeUserFacingMessage(result.message, t("video.more.deleteError"))
      );
      return;
    }
    setConfirmOpen(false);
    setPending(false);
    showStatus(t("video.more.deleteSuccess"));
    onDeleted?.(postId);
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        className="watch-focus-ring flex flex-col items-center gap-1"
        aria-label={t("video.more.aria")}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setMenuOpen((open) => !open);
        }}
      >
        <span className="watch-rail-btn flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-md">
          <MoreIcon />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wide text-white/55">
          {t("video.more.button")}
        </span>
      </button>

      {statusMessage ? (
        <p
          className="pointer-events-none absolute -left-40 top-0 max-w-[9.5rem] rounded-full border border-emerald-300/40 bg-emerald-400/15 px-2.5 py-1 text-[10px] font-bold text-emerald-100 backdrop-blur-xl"
          role="status"
        >
          {statusMessage}
        </p>
      ) : null}

      {menuOpen && typeof document !== "undefined"
        ? createPortal(
            <>
              <button
                type="button"
                className="fixed inset-0 z-[130] cursor-default bg-transparent"
                aria-label={t("video.more.close")}
                onClick={() => setMenuOpen(false)}
              />
              <div
                ref={menuRef}
                role="menu"
                onKeyDown={(event) => {
                  if (
                    event.key === "ArrowDown" ||
                    event.key === "ArrowUp" ||
                    event.key === "j" ||
                    event.key === "k"
                  ) {
                    event.stopPropagation();
                  }
                }}
                style={
                  menuBox
                    ? {
                        top: menuBox.top,
                        left: menuBox.left,
                        width: menuBox.width,
                      }
                    : { visibility: "hidden" }
                }
                className="fixed z-[131] max-h-[70vh] max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-2xl border border-white/15 bg-[#0b0b18]/96 p-1.5 shadow-2xl backdrop-blur-xl"
              >
                {summaryBody ? (
                  <div className="px-3 py-2">
                    <p className="text-[11px] font-bold text-purple-200/90">
                      {summaryTitle}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-white/80">{summaryBody}</p>
                  </div>
                ) : null}
                {onJourney && journeyLabel ? (
                  <MenuItem
                    label={journeyLabel}
                    onClick={() => {
                      closeMenu();
                      onJourney();
                    }}
                  />
                ) : null}
                {isOwner ? (
                  <>
                    <MenuItem
                      itemRef={firstMenuRef}
                      label={t("video.more.editCaption")}
                      onClick={handleEditCaption}
                    />
                    <MenuItem
                      label={t("video.more.delete")}
                      danger
                      onClick={handleDelete}
                    />
                  </>
                ) : (
                  <>
                    <MenuItem
                      itemRef={firstMenuRef}
                      label={t("video.more.notInterested")}
                      onClick={handleNotInterested}
                    />
                    <MenuItem
                      label={t("video.more.report")}
                      onClick={handleReport}
                    />
                  </>
                )}
              </div>
            </>,
            document.body
          )
        : null}

      {editOpen && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[140] flex items-end justify-center p-3 sm:items-center sm:p-6">
              <button
                type="button"
                tabIndex={-1}
                className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-[2px]"
                aria-label={t("video.more.editCancel")}
                disabled={pending}
                onClick={() => {
                  if (!pending) setEditOpen(false);
                }}
              />
              <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="relative z-10 w-full max-w-md overflow-hidden rounded-t-[28px] border border-white/15 bg-[#0b0b18] p-5 text-white shadow-2xl sm:rounded-[28px]"
              >
                <h2 id={titleId} className="text-lg font-black">
                  {t("video.more.editTitle")}
                </h2>
                <textarea
                  ref={editInputRef}
                  value={editValue}
                  maxLength={MAX_CAPTION_LENGTH}
                  rows={4}
                  disabled={pending}
                  onChange={(event) => setEditValue(event.target.value)}
                  className="mt-4 w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm outline-none focus:border-violet-400/40"
                />
                <p className="mt-1 text-end text-[11px] font-bold text-white/40">
                  {editValue.length}/{MAX_CAPTION_LENGTH}
                </p>
                {errorMessage ? (
                  <p role="alert" className="mt-3 text-sm font-bold text-red-200">
                    {errorMessage}
                  </p>
                ) : null}
                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={pending}
                    className="watch-focus-ring min-h-[44px] rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-white/80 hover:bg-white/10 disabled:opacity-50"
                    onClick={() => setEditOpen(false)}
                  >
                    {t("video.more.editCancel")}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    aria-busy={pending}
                    className="watch-focus-ring min-h-[44px] rounded-full bg-white px-4 py-2.5 text-sm font-black text-black hover:bg-white/90 disabled:cursor-wait disabled:opacity-60"
                    onClick={() => void handleSaveCaption()}
                  >
                    {pending ? t("video.more.editSaving") : t("video.more.editSave")}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {confirmOpen && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[140] flex items-end justify-center p-3 sm:items-center sm:p-6">
              <button
                type="button"
                tabIndex={-1}
                className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-[2px]"
                aria-label={t("video.more.deleteCancel")}
                disabled={pending}
                onClick={() => {
                  if (!pending) setConfirmOpen(false);
                }}
              />
              <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="relative z-10 w-full max-w-md overflow-hidden rounded-t-[28px] border border-white/15 bg-[#0b0b18] p-5 text-white shadow-2xl sm:rounded-[28px]"
              >
                <h2 id={titleId} className="text-lg font-black">
                  {t("video.more.deleteTitle")}
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/70">
                  {t("video.more.deleteBody")}
                </p>
                {errorMessage ? (
                  <p role="alert" className="mt-3 text-sm font-bold text-red-200">
                    {errorMessage}
                  </p>
                ) : null}
                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={pending}
                    className="watch-focus-ring min-h-[44px] rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-white/80 hover:bg-white/10 disabled:opacity-50"
                    onClick={() => setConfirmOpen(false)}
                  >
                    {t("video.more.deleteCancel")}
                  </button>
                  <button
                    ref={confirmRef}
                    type="button"
                    disabled={pending}
                    aria-busy={pending}
                    className="watch-focus-ring min-h-[44px] rounded-full border border-red-400/40 bg-red-500/90 px-4 py-2.5 text-sm font-black text-white hover:bg-red-500 disabled:cursor-wait disabled:opacity-60"
                    onClick={() => void handleConfirmDelete()}
                  >
                    {pending ? t("video.more.deleting") : t("video.more.deleteConfirm")}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {!isOwner ? (
        <UgcReportControl
          target={{ kind: "content", postId, ownerUserId }}
          viewerId={viewerId}
          returnPath={returnPath}
          variant="none"
          controlledOpen={reportOpen}
          onOpenChange={setReportOpen}
        />
      ) : null}
    </div>
  );
}

function MenuItem({
  label,
  onClick,
  danger = false,
  itemRef,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  itemRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={itemRef}
      type="button"
      role="menuitem"
      className={`flex min-h-[44px] w-full items-center rounded-xl px-3 py-2.5 text-start text-sm font-bold transition ${
        danger
          ? "text-red-200 hover:bg-red-500/15"
          : "text-white hover:bg-white/10"
      }`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
    >
      {label}
    </button>
  );
}

function MoreIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}
