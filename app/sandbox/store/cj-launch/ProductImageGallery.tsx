"use client";

import { useEffect, useState } from "react";
import { visibleGalleryUrls } from "../../../../lib/sandbox/cjLaunch/productImageGallery";

type ProductImageGalleryProps = {
  productKey: string;
  images: readonly (string | null | undefined)[];
  alt?: string;
  galleryLabel: string;
  galleryListLabel: string;
};

export default function ProductImageGallery({
  productKey,
  images,
  alt = "",
  galleryLabel,
  galleryListLabel,
}: ProductImageGalleryProps) {
  const urls = visibleGalleryUrls(images);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [productKey]);

  const safeIndex =
    urls.length === 0 ? 0 : Math.min(Math.max(selectedIndex, 0), urls.length - 1);
  const mainUrl = urls[safeIndex] ?? null;

  return (
    <section aria-label={galleryLabel}>
      <div className="overflow-hidden rounded-[var(--sf-radius-lg)] border border-[var(--sf-line)] bg-[var(--sf-surface)]">
        <div className="relative aspect-[4/5] bg-[var(--sf-surface-2)] sm:aspect-[4/3]">
          {mainUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mainUrl}
              alt={alt}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-[var(--sf-surface-2)]" />
          )}
        </div>
      </div>
      {urls.length > 1 ? (
        <ul
          className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-1"
          aria-label={galleryListLabel}
        >
          {urls.map((url, index) => {
            const selected = index === safeIndex;
            return (
              <li key={`${productKey}-${index}`} className="shrink-0">
                <button
                  type="button"
                  aria-label={`${galleryListLabel} ${index + 1}`}
                  aria-current={selected ? "true" : undefined}
                  aria-pressed={selected}
                  onClick={() => setSelectedIndex(index)}
                  className={`watch-focus-ring relative h-16 w-16 overflow-hidden rounded-xl border transition [touch-action:manipulation] ${
                    selected
                      ? "border-[rgba(214,196,161,0.55)]"
                      : "border-[var(--sf-line)] bg-white/5 hover:border-[rgba(214,196,161,0.35)]"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover pointer-events-none"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
