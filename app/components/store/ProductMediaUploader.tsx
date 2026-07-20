"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { attachMediaMetadataResultAction } from "../../actions/storeCatalog";
import {
  STORE_PRODUCT_MEDIA_ACCEPT_ATTR,
  STORE_PRODUCT_MEDIA_FILE_HINT,
} from "../../../lib/store/mediaConstants";
import { uploadStoreProductMedia } from "../../../lib/store/uploadProductMedia";

type Props = {
  productId: string;
  storeId: string;
};

export default function ProductMediaUploader({ productId, storeId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="mt-4 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setMessage(null);
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
          (form.elements.namedItem("altText") as HTMLInputElement)?.value || "";

        startTransition(async () => {
          try {
            const uploaded = await uploadStoreProductMedia(file, {
              storeId,
              productId,
            });
            const body = new FormData();
            body.set("productId", productId);
            body.set("storagePath", uploaded.path);
            body.set("mediaType", "image");
            body.set("role", role);
            body.set("altText", altText);
            const saved = await attachMediaMetadataResultAction(body);
            if (!saved.ok) {
              setError(saved.message);
              return;
            }
            setMessage("Image uploaded.");
            fileInput.value = "";
            router.refresh();
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "Unable to upload image."
            );
          }
        });
      }}
    >
      <p className="text-sm text-white/45">{STORE_PRODUCT_MEDIA_FILE_HINT}</p>
      <label className="block space-y-2">
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
          Image file
        </span>
        <input
          name="file"
          type="file"
          accept={STORE_PRODUCT_MEDIA_ACCEPT_ATTR}
          required
          disabled={pending}
          className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-1 file:text-xs file:font-bold file:text-black"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
            Role
          </span>
          <select
            name="role"
            defaultValue="cover"
            disabled={pending}
            className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
          >
            <option value="cover">cover</option>
            <option value="gallery">gallery</option>
            <option value="detail">detail</option>
            <option value="swatch">swatch</option>
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
            Alt text
          </span>
          <input
            name="altText"
            disabled={pending}
            className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
          />
        </label>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-200">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="text-sm text-emerald-200">
          {message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="watch-focus-ring rounded-full bg-white px-5 py-3 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Uploading…" : "Upload image"}
      </button>
    </form>
  );
}
