"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  archiveProductMediaAction,
  attachMediaMetadataResultAction,
  updateProductMediaLayoutAction,
} from "../../actions/storeCatalog";
import {
  STORE_PRODUCT_MEDIA_ACCEPT_ATTR,
  STORE_PRODUCT_MEDIA_FILE_HINT,
} from "../../../lib/store/mediaConstants";
import { uploadStoreProductMedia } from "../../../lib/store/uploadProductMedia";

export type SellerMediaPreview = {
  id: string;
  mediaUrl: string | null;
  alt_text: string | null;
  role: string;
  media_type: string;
  sort_order: number;
};

type Props = {
  productId: string;
  storeId: string;
  media: SellerMediaPreview[];
  canEdit: boolean;
};

export default function SellerProductMediaStudio({
  productId,
  storeId,
  media,
  canEdit,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState(media);
  const [dragId, setDragId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [phase, setPhase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [draggingFile, setDraggingFile] = useState(false);

  const coverId = useMemo(
    () => items.find((item) => item.role === "cover")?.id ?? items[0]?.id ?? null,
    [items]
  );

  function persistLayout(nextItems: SellerMediaPreview[], nextCoverId: string | null) {
    const body = new FormData();
    body.set("productId", productId);
    body.set(
      "orderedMediaIds",
      JSON.stringify(nextItems.map((item) => item.id))
    );
    if (nextCoverId) body.set("coverMediaId", nextCoverId);
    startTransition(async () => {
      const result = await updateProductMediaLayoutAction(body);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMessage("Media layout saved.");
      router.refresh();
    });
  }

  function onDropReorder(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const from = items.findIndex((item) => item.id === dragId);
    const to = items.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    setItems(next);
    setDragId(null);
    persistLayout(next, coverId);
  }

  function setCover(mediaId: string) {
    const next = items.map((item) => ({
      ...item,
      role: item.id === mediaId ? "cover" : item.role === "cover" ? "gallery" : item.role,
    }));
    setItems(next);
    persistLayout(next, mediaId);
  }

  function removeMedia(mediaId: string) {
    const body = new FormData();
    body.set("productId", productId);
    body.set("mediaId", mediaId);
    startTransition(async () => {
      const result = await archiveProductMediaAction(body);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setItems((prev) => prev.filter((item) => item.id !== mediaId));
      setMessage("Media removed from product.");
      router.refresh();
    });
  }

  async function uploadFile(file: File, role: string, altText: string) {
    setError(null);
    setMessage(null);
    setPhase("Uploading image…");
    try {
      const uploaded = await uploadStoreProductMedia(file, {
        storeId,
        productId,
      });
      setPhase("Saving media metadata…");
      const body = new FormData();
      body.set("productId", productId);
      body.set("storagePath", uploaded.path);
      body.set("mediaType", "image");
      body.set("role", role);
      body.set("altText", altText);
      body.set("sortOrder", String(items.length));
      const saved = await attachMediaMetadataResultAction(body);
      if (!saved.ok) {
        setError(saved.message);
        setPhase(null);
        return;
      }
      setMessage("Image uploaded.");
      setPhase(null);
      router.refresh();
    } catch (err) {
      setPhase(null);
      setError(err instanceof Error ? err.message : "Unable to upload image.");
    }
  }

  if (!canEdit) {
    return (
      <p className="text-sm text-[var(--sf-faint)]">
        Media editing requires catalog permissions.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-[var(--sf-muted)]">
        Premium media studio for cover and gallery images. Video file upload is
        not enabled in the trusted storage allow-list yet — only JPEG, PNG, and
        WebP. Drag tiles to reorder; set cover explicitly.
      </p>

      {items.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <li
              key={item.id}
              draggable={!pending}
              onDragStart={() => setDragId(item.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => onDropReorder(item.id)}
              className="overflow-hidden rounded-2xl border border-[var(--sf-line)] bg-black/30"
            >
              {item.mediaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.mediaUrl}
                  alt={item.alt_text || item.role}
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-white/[0.04] text-xs text-[var(--sf-faint)]">
                  Preview unavailable
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <p className="text-xs capitalize text-[var(--sf-muted)]">
                  {item.role}
                  {item.id === coverId ? " · cover" : ""}
                </p>
                <div className="flex gap-2">
                  {item.id !== coverId ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setCover(item.id)}
                      className="text-xs font-semibold text-[var(--sf-accent)]"
                    >
                      Set cover
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => removeMedia(item.id)}
                    className="text-xs font-semibold text-[var(--sf-danger)]"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-[var(--sf-line)] px-4 py-8 text-center text-sm text-[var(--sf-faint)]">
          No media yet. Drop an image below to create the first cover.
        </p>
      )}

      <form
        className={`space-y-4 rounded-2xl border border-dashed p-4 transition ${
          draggingFile
            ? "border-[var(--sf-accent)] bg-[rgba(214,196,161,0.08)]"
            : "border-[var(--sf-line)] bg-black/20"
        }`}
        onDragEnter={(event) => {
          event.preventDefault();
          setDraggingFile(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDraggingFile(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDraggingFile(false);
          const file = event.dataTransfer.files?.[0];
          if (file) {
            startTransition(() => uploadFile(file, "gallery", ""));
          }
        }}
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const fileInput = form.elements.namedItem("file") as HTMLInputElement;
          const file = fileInput.files?.[0];
          if (!file) {
            setError("Choose an image to upload.");
            return;
          }
          const role =
            (form.elements.namedItem("role") as HTMLSelectElement)?.value ||
            "cover";
          const altText =
            (form.elements.namedItem("altText") as HTMLInputElement)?.value ||
            "";
          startTransition(async () => {
            await uploadFile(file, role, altText);
            fileInput.value = "";
          });
        }}
      >
        <p className="text-sm text-[var(--sf-faint)]">
          {STORE_PRODUCT_MEDIA_FILE_HINT}. Drag a file here or choose below.
        </p>
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
            Image file
          </span>
          <input
            name="file"
            type="file"
            accept={STORE_PRODUCT_MEDIA_ACCEPT_ATTR}
            required
            disabled={pending}
            className="w-full rounded-2xl border border-[var(--sf-line)] bg-black/40 p-4 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-[var(--sf-accent)] file:px-3 file:py-1 file:text-xs file:font-bold file:text-[#1a1712]"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
              Role
            </span>
            <select
              name="role"
              defaultValue={items.length === 0 ? "cover" : "gallery"}
              disabled={pending}
              className="w-full rounded-2xl border border-[var(--sf-line)] bg-black/40 p-3 text-sm outline-none focus:border-[rgba(214,196,161,0.45)]"
            >
              <option value="cover">Cover</option>
              <option value="gallery">Gallery</option>
              <option value="detail">Detail</option>
              <option value="swatch">Swatch</option>
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
              Alt text
            </span>
            <input
              name="altText"
              disabled={pending}
              className="w-full rounded-2xl border border-[var(--sf-line)] bg-black/40 p-3 text-sm outline-none focus:border-[rgba(214,196,161,0.45)]"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="watch-focus-ring rounded-full bg-[var(--sf-accent)] px-5 py-2.5 text-sm font-bold text-[#1a1712] disabled:opacity-50"
        >
          {phase || (pending ? "Working…" : "Upload image")}
        </button>
        {error ? (
          <p role="alert" className="text-sm text-[var(--sf-danger)]">
            {error}
          </p>
        ) : null}
        {message ? (
          <p role="status" className="text-sm text-[var(--sf-ok)]">
            {message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
