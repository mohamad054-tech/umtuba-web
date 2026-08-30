"use client";

import Link from "next/link";
import {
  ChangeEvent,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { getAuthenticatedUser } from "../../lib/supabase/auth";
import {
  createPost,
  uploadPostImage,
} from "../../lib/supabase/posts";
import { APP_ROUTES } from "../lib/nav";
import { dispatchHomeSocialPosted } from "../lib/social/homeSocialPost";
import { useTranslation } from "./i18n";

type CreatePostModalProps = {
  open: boolean;
  onClose: () => void;
  preferImagePicker?: boolean;
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function subscribeToNoop() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export default function CreatePostModal({
  open,
  onClose,
  preferImagePicker = false,
}: CreatePostModalProps) {
  const { t } = useTranslation();
  const mounted = useSyncExternalStore(
    subscribeToNoop,
    getClientSnapshot,
    getServerSnapshot
  );
  const [content, setContent] = useState("");
  const [selectedImage, setSelectedImage] =
    useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [discardOpen, setDiscardOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const shouldOpenPicker = useRef(false);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  useEffect(() => {
    if (!open) {
      shouldOpenPicker.current = false;
      setDiscardOpen(false);
      return;
    }

    shouldOpenPicker.current = preferImagePicker;

    let isActive = true;

    async function verifyAuth() {
      try {
        setIsCheckingAuth(true);
        setErrorMessage("");

        const user = await getAuthenticatedUser();

        if (!isActive) {
          return;
        }

        if (!user) {
          setIsAuthenticated(false);
          setErrorMessage(t("social.composer.signInNeeded"));
          return;
        }

        setIsAuthenticated(true);
        if (shouldOpenPicker.current) {
          window.setTimeout(() => fileInputRef.current?.click(), 80);
          shouldOpenPicker.current = false;
        }
      } catch (error) {
        console.error(error);

        if (isActive) {
          setIsAuthenticated(false);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : t("social.composer.signInNeeded")
          );
        }
      } finally {
        if (isActive) {
          setIsCheckingAuth(false);
        }
      }
    }

    void verifyAuth();

    return () => {
      isActive = false;
    };
  }, [open, preferImagePicker, t]);

  const isDirty = Boolean(content.trim() || selectedImage);

  function resetForm() {
    setContent("");
    setSelectedImage(null);
    setErrorMessage("");
    setDiscardOpen(false);

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setImagePreview("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setErrorMessage("");

    if (!file.type.startsWith("image/")) {
      setErrorMessage(t("social.composer.invalidImage"));
      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setErrorMessage(t("social.composer.imageTooLarge"));
      event.target.value = "";
      return;
    }

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function removeImage() {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setSelectedImage(null);
    setImagePreview("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handlePublish() {
    if (!isAuthenticated) {
      setErrorMessage(t("social.composer.signInNeeded"));
      return;
    }

    const trimmedContent = content.trim();

    if (!trimmedContent && !selectedImage) {
      setErrorMessage(t("social.composer.emptyError"));
      return;
    }

    try {
      setIsPublishing(true);
      setErrorMessage("");

      let imageUrl: string | null = null;

      if (selectedImage) {
        imageUrl = await uploadPostImage(selectedImage);
      }

      const created = await createPost(trimmedContent, imageUrl);
      dispatchHomeSocialPosted(created);
      resetForm();
      onClose();
    } catch (error) {
      console.error(error);

      const message =
        error instanceof Error
          ? error.message
          : t("social.composer.publishError");

      setErrorMessage(message || t("social.composer.publishError"));
    } finally {
      setIsPublishing(false);
    }
  }

  function requestClose() {
    if (isPublishing) {
      return;
    }

    if (isDirty) {
      setDiscardOpen(true);
      return;
    }

    resetForm();
    onClose();
  }

  function confirmDiscard() {
    resetForm();
    onClose();
  }

  if (!mounted || !open) {
    return null;
  }

  const canPublish =
    isAuthenticated &&
    !isCheckingAuth &&
    (Boolean(content.trim()) || Boolean(selectedImage));

  const loginNext = encodeURIComponent(APP_ROUTES.home);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/80 p-4">
      <div className="w-full max-w-xl rounded-3xl border border-amber-400/20 bg-[#0b0b18] p-6 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black">
            {t("social.composer.title")}
          </h2>

          <button
            type="button"
            onClick={requestClose}
            disabled={isPublishing}
            className="rounded-full bg-white/10 px-3 py-2 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={t("social.composer.closeAria")}
          >
            ✕
          </button>
        </div>

        {isCheckingAuth ? (
          <p className="mt-6 text-sm text-white/50">
            {t("social.composer.checkingSession")}
          </p>
        ) : null}

        {!isCheckingAuth && !isAuthenticated ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
            <p>
              {t("social.composer.needAccount")}{" "}
              <Link
                href={`${APP_ROUTES.login}?next=${loginNext}`}
                className="font-bold text-amber-100 underline"
              >
                {t("social.composer.signIn")}
              </Link>{" "}
              {t("social.composer.createAccount") ? (
                <>
                  <Link
                    href={`${APP_ROUTES.signup}?next=${loginNext}`}
                    className="font-bold text-amber-100 underline"
                  >
                    {t("social.composer.createAccount")}
                  </Link>
                  .
                </>
              ) : null}
            </p>
          </div>
        ) : null}

        <textarea
          value={content}
          onChange={(event) => {
            setContent(event.target.value);
            setErrorMessage("");
          }}
          placeholder={t("social.composer.placeholder")}
          maxLength={1000}
          autoFocus
          dir="auto"
          disabled={isPublishing || !isAuthenticated || isCheckingAuth}
          className="mt-6 h-40 w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-4 text-base outline-none focus:border-amber-300/40 disabled:opacity-60"
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleImageChange}
          disabled={isPublishing || !isAuthenticated || isCheckingAuth}
          className="hidden"
        />

        <div className="mt-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPublishing || !isAuthenticated || isCheckingAuth}
            className="rounded-2xl border border-amber-300/25 bg-amber-400/10 px-4 py-3 font-bold text-amber-50 hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("social.composer.addImage")}
          </button>

          <p className="mt-2 text-xs text-white/40">
            {t("social.composer.imageHint")}
          </p>
        </div>

        {imagePreview ? (
          <div className="relative mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black">
            <img
              src={imagePreview}
              alt={t("social.composer.previewAlt")}
              className="max-h-80 w-full object-contain"
            />

            <button
              type="button"
              onClick={removeImage}
              disabled={isPublishing}
              className="absolute right-3 top-3 rounded-full bg-black/75 px-3 py-2 font-bold hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("social.composer.removeImage")}
            </button>
          </div>
        ) : null}

        <div className="mt-3 flex items-start justify-between gap-4 text-sm">
          <p className="text-red-300">
            {errorMessage}
          </p>

          <p className="shrink-0 text-white/40">
            {content.length}/1000
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={requestClose}
            disabled={isPublishing}
            className="rounded-2xl border border-white/10 px-5 py-3 font-bold hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("actions.cancel")}
          </button>

          <button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing || !canPublish}
            className="rounded-2xl bg-amber-300 px-5 py-3 font-black text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPublishing
              ? selectedImage
                ? t("social.composer.uploading")
                : t("social.composer.publishing")
              : t("social.composer.publish")}
          </button>
        </div>
      </div>

      {discardOpen ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="discard-post-title"
            className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#12121f] p-5"
          >
            <h3 id="discard-post-title" className="text-lg font-black">
              {t("social.composer.discardTitle")}
            </h3>
            <p className="mt-2 text-sm text-white/65">
              {t("social.composer.discardBody")}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDiscardOpen(false)}
                className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold hover:bg-white/10"
              >
                {t("social.composer.keepEditing")}
              </button>
              <button
                type="button"
                onClick={confirmDiscard}
                className="rounded-full bg-white px-4 py-2 text-sm font-black text-black"
              >
                {t("social.composer.discardConfirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>,
    document.body
  );
}
