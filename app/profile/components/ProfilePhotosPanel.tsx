"use client";

import { useCallback, useState } from "react";
import type { ProfilePost } from "../types";
import { PROFILE_ERROR_STATES_COPY } from "../lib/profileErrorStates";
import ProfilePanelError from "./ProfilePanelError";
import ProfilePhotosLightbox from "./ProfilePhotosLightbox";
import OwnerContentDeleteControl from "../../components/social/OwnerContentDeleteControl";
import { useTranslation } from "../../components/i18n";

type ProfilePhotosPanelProps = {
  posts: ProfilePost[];
  loadFailed?: boolean;
  onRetry?: () => void;
  isOwner?: boolean;
  onPostDeleted?: (postId: number) => void;
};

function isPhotoPost(post: ProfilePost): boolean {
  return Boolean(post.imageUrl?.trim()) || post.postType === "image";
}

/**
 * Photos replaces Posts for image-first browsing (Creator Space §5 / §10).
 * Text-only posts are excluded from this grid.
 * Tap opens Photos Lightbox V1 (wrap prev/next, dialog a11y).
 */
export default function ProfilePhotosPanel({
  posts,
  loadFailed = false,
  onRetry,
  isOwner = false,
  onPostDeleted,
}: ProfilePhotosPanelProps) {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const closeLightbox = useCallback(() => {
    setOpenIndex(null);
  }, []);

  if (loadFailed) {
    return (
      <ProfilePanelError
        message={PROFILE_ERROR_STATES_COPY.photosPanel}
        onRetry={onRetry}
      />
    );
  }

  const photos = posts.filter(isPhotoPost);

  if (photos.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center">
        <p className="text-base font-bold text-white/80">{t("profile.emptyPhotos")}</p>
        <p className="mt-2 text-sm text-white/45">
          {isOwner
            ? t("profile.emptyPhotosOwner")
            : t("profile.emptyPhotosVisitor")}
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:gap-3">
        {photos.map((post, index) => (
          <li
            key={post.id}
            className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
          >
            <button
              type="button"
              className="watch-focus-ring block w-full overflow-hidden rounded-xl text-left"
              aria-label={`Open photo ${index + 1} of ${photos.length}`}
              onClick={() => setOpenIndex(index)}
            >
              {post.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- public post image
                <img
                  src={post.imageUrl}
                  alt=""
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center px-2 text-center text-[10px] font-bold uppercase tracking-wider text-white/35">
                  Photo
                </div>
              )}
            </button>
            {isOwner ? (
              <div className="absolute end-1 top-1">
                <OwnerContentDeleteControl
                  postId={post.id}
                  kind="post"
                  isOwner={isOwner}
                  variant="overlay"
                  onDeleted={(postId) => {
                    setOpenIndex(null);
                    onPostDeleted?.(postId);
                  }}
                />
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {openIndex !== null ? (
        <ProfilePhotosLightbox
          photos={photos}
          openIndex={openIndex}
          onClose={closeLightbox}
          onIndexChange={setOpenIndex}
        />
      ) : null}
    </>
  );
}
