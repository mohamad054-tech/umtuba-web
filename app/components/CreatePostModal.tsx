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

type CreatePostModalProps = {
  open: boolean;
  onClose: () => void;
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
}: CreatePostModalProps) {
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  useEffect(() => {
    if (!open) {
      return;
    }

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
          setErrorMessage("Please sign in to publish a post.");
          return;
        }

        setIsAuthenticated(true);
      } catch (error) {
        console.error(error);

        if (isActive) {
          setIsAuthenticated(false);
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Please sign in to publish a post."
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
  }, [open]);

  function resetForm() {
    setContent("");
    setSelectedImage(null);
    setErrorMessage("");

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
      setErrorMessage("Please select a valid image file.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setErrorMessage("The image must be smaller than 5 MB.");
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
      setErrorMessage("Please sign in to publish a post.");
      return;
    }

    const trimmedContent = content.trim();

    if (!trimmedContent && !selectedImage) {
      setErrorMessage(
        "Please write something or choose an image before publishing."
      );
      return;
    }

    try {
      setIsPublishing(true);
      setErrorMessage("");

      let imageUrl: string | null = null;

      if (selectedImage) {
        imageUrl = await uploadPostImage(selectedImage);
      }

      await createPost(trimmedContent, imageUrl);

      window.dispatchEvent(
        new Event("umtuba:post-created")
      );

      resetForm();
      onClose();
    } catch (error) {
      console.error(error);

      const message =
        error instanceof Error
          ? error.message
          : "The post could not be published.";

      setErrorMessage(
        message ||
          "The post could not be published. Please try again."
      );
    } finally {
      setIsPublishing(false);
    }
  }

  function handleClose() {
    if (isPublishing) {
      return;
    }

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

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/80 p-4">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0b0b18] p-6 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black">
            Create Post
          </h2>

          <button
            type="button"
            onClick={handleClose}
            disabled={isPublishing}
            className="rounded-full bg-white/10 px-3 py-2 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close create-post window"
          >
            ✕
          </button>
        </div>

        {isCheckingAuth ? (
          <p className="mt-6 text-sm text-white/50">
            Checking your session...
          </p>
        ) : null}

        {!isCheckingAuth && !isAuthenticated ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
            <p>
              You need an account to publish.{" "}
              <Link href="/login" className="font-bold text-white underline">
                Sign in
              </Link>{" "}
              or{" "}
              <Link
                href="/register"
                className="font-bold text-white underline"
              >
                create an account
              </Link>
              .
            </p>
          </div>
        ) : null}

        <textarea
          value={content}
          onChange={(event) => {
            setContent(event.target.value);
            setErrorMessage("");
          }}
          placeholder="What's happening today?"
          maxLength={1000}
          autoFocus
          disabled={isPublishing || !isAuthenticated || isCheckingAuth}
          className="mt-6 h-40 w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-4 text-base outline-none focus:border-white/30 disabled:opacity-60"
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
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-bold hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            📷 Add Image
          </button>

          <p className="mt-2 text-xs text-white/40">
            JPG, PNG, WEBP or GIF — maximum 5 MB
          </p>
        </div>

        {imagePreview ? (
          <div className="relative mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black">
            <img
              src={imagePreview}
              alt="Selected image preview"
              className="max-h-80 w-full object-contain"
            />

            <button
              type="button"
              onClick={removeImage}
              disabled={isPublishing}
              className="absolute right-3 top-3 rounded-full bg-black/75 px-3 py-2 font-bold hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              Remove
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
            onClick={handleClose}
            disabled={isPublishing}
            className="rounded-2xl border border-white/10 px-5 py-3 font-bold hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing || !canPublish}
            className="rounded-2xl bg-white px-5 py-3 font-black text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPublishing
              ? selectedImage
                ? "Uploading..."
                : "Publishing..."
              : "Publish"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
