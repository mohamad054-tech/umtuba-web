"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  activateSellerDigitalAssetVersionAction,
  finalizeSellerDigitalAssetAttachAction,
  prepareSellerDigitalAssetUploadAction,
} from "../../actions/storeDigitalAssets";
import {
  STORE_DIGITAL_ASSET_ACCEPT_ATTR,
  STORE_DIGITAL_ASSET_FILE_HINT,
} from "../../../lib/store/mediaConstants";
import type { SellerDigitalAssetSummary } from "../../../lib/store/digitalAssetUpload";
import { uploadStoreDigitalProductAsset } from "../../../lib/store/uploadDigitalProductAsset";

type Props = {
  productId: string;
  storeId: string;
  productType: string;
  canEdit: boolean;
  initialSummary: SellerDigitalAssetSummary;
};

type Phase = "idle" | "preparing" | "uploading" | "attaching" | "activating";

function statusCopy(summary: SellerDigitalAssetSummary): string {
  if (summary.uiStatus === "unavailable") {
    return "Digital file delivery is unavailable for non-digital products.";
  }
  if (summary.uiStatus === "active") {
    const ext = summary.fileExtension
      ? summary.fileExtension.toUpperCase()
      : "file";
    const title = summary.title ? `“${summary.title}”` : "Digital deliverable";
    return `${title} is active (${ext}). Buyers with an entitlement always receive this active version.`;
  }
  if (summary.uiStatus === "draft_only") {
    return "Draft version(s) exist, but nothing is active yet. Activate a version to enable buyer delivery and publish readiness.";
  }
  if (summary.uiStatus === "inactive") {
    return "No active digital version. Upload a draft and activate it to restore delivery.";
  }
  return "No digital asset attached yet. Upload a draft, then activate it for secure buyer delivery.";
}

export default function SellerDigitalAssetPanel({
  productId,
  storeId,
  productType,
  canEdit,
  initialSummary,
}: Props) {
  const router = useRouter();
  const [summary, setSummary] = useState(initialSummary);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isDigital = productType === "digital";
  const busy = phase !== "idle";

  async function onFileSelected(file: File | null) {
    if (!file || !canEdit || !isDigital) return;
    setError(null);
    setMessage(null);

    try {
      setPhase("preparing");
      const prepareBody = new FormData();
      prepareBody.set("productId", productId);
      prepareBody.set("fileName", file.name);
      prepareBody.set("mimeType", file.type || "");
      prepareBody.set("byteSize", String(file.size));

      const prepared = await prepareSellerDigitalAssetUploadAction(prepareBody);
      if (!prepared.ok) {
        setError(prepared.message);
        setPhase("idle");
        return;
      }

      setPhase("uploading");
      await uploadStoreDigitalProductAsset(file, {
        storagePath: prepared.storagePath,
        contentType: prepared.contentType,
        storeId,
        productId,
      });

      setPhase("attaching");
      const attachBody = new FormData();
      attachBody.set("productId", productId);
      attachBody.set("storagePath", prepared.storagePath);
      if (prepared.titleHint) {
        attachBody.set("title", prepared.titleHint);
      }

      const attached = await finalizeSellerDigitalAssetAttachAction(attachBody);
      if (!attached.ok) {
        setError(attached.message);
        setPhase("idle");
        return;
      }

      setSummary(attached.summary);
      setMessage(
        attached.activePreserved
          ? `Draft v${attached.draftVersionNumber} created. The previous active version is still delivered until you activate the draft.`
          : `Draft v${attached.draftVersionNumber} created. Activate it to enable secure buyer delivery.`
      );
      setPhase("idle");
      router.refresh();
    } catch (err) {
      setPhase("idle");
      setError(
        err instanceof Error
          ? err.message
          : "Digital upload failed. Try again."
      );
    }
  }

  async function onActivate(versionId: string) {
    if (!canEdit || !isDigital || busy) return;
    setError(null);
    setMessage(null);
    setPhase("activating");
    try {
      const body = new FormData();
      body.set("productId", productId);
      body.set("versionId", versionId);
      const result = await activateSellerDigitalAssetVersionAction(body);
      if (!result.ok) {
        setError(result.message);
        setPhase("idle");
        return;
      }
      setMessage(
        result.alreadyActive
          ? `Version v${result.versionNumber} is already active.`
          : `Version v${result.versionNumber} is now active for buyer delivery.`
      );
      setPhase("idle");
      router.refresh();
    } catch (err) {
      setPhase("idle");
      setError(
        err instanceof Error
          ? err.message
          : "Unable to activate digital version."
      );
    }
  }

  if (!isDigital) {
    return (
      <div className="rounded-2xl border border-[var(--sf-line)] bg-black/20 p-4">
        <p className="text-sm text-[var(--sf-faint)]" role="status">
          Digital asset upload is unavailable for non-digital products.
        </p>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <p className="text-sm text-[var(--sf-faint)]">
        Digital asset management requires catalog permissions.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-[var(--sf-muted)]">
        Upload creates a private draft version. Activate one version to deliver
        always-latest access to entitled buyers. Paths are generated
        server-side; buyers never see permanent URLs.
      </p>
      <p className="text-sm text-[var(--sf-ink)]" role="status">
        {statusCopy(summary)}
      </p>
      <p className="text-xs text-[var(--sf-faint)]">{STORE_DIGITAL_ASSET_FILE_HINT}</p>

      {summary.versions.length > 0 ? (
        <ul className="space-y-2" aria-label="Digital asset versions">
          {summary.versions.map((version) => (
            <li
              key={version.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--sf-line)] bg-black/20 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--sf-ink)]">
                  v{version.versionNumber}
                  {version.title ? ` · ${version.title}` : ""}
                  {version.fileExtension
                    ? ` · ${version.fileExtension.toUpperCase()}`
                    : ""}
                </p>
                <p className="text-xs uppercase tracking-wide text-[var(--sf-faint)]">
                  {version.status}
                </p>
              </div>
              {version.isActive ? (
                <span className="text-xs font-bold text-[var(--sf-ok)]">
                  Active
                </span>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  className="watch-focus-ring rounded-full border border-[var(--sf-line)] px-4 py-2 text-xs font-bold text-[var(--sf-ink)] disabled:cursor-wait disabled:text-[var(--sf-faint)]"
                  onClick={() => void onActivate(version.id)}
                >
                  Activate
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {phase !== "idle" ? (
        <p className="text-sm font-semibold text-[var(--sf-accent-strong)]">
          {phase === "preparing"
            ? "Preparing secure upload…"
            : phase === "uploading"
              ? "Uploading file…"
              : phase === "attaching"
                ? "Creating draft version…"
                : "Activating version…"}
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-2xl border border-[rgba(240,168,168,0.35)] bg-[rgba(240,168,168,0.08)] px-4 py-3 text-sm text-[var(--sf-danger)]"
        >
          {error} You can retry without losing a previously active version.
        </p>
      ) : null}

      {message ? (
        <p
          role="status"
          className="rounded-2xl border border-[var(--sf-line)] bg-black/25 px-4 py-3 text-sm text-[var(--sf-ok)]"
        >
          {message}
        </p>
      ) : null}

      <label className="inline-flex cursor-pointer flex-col gap-2">
        <span className="sr-only">Upload digital asset draft</span>
        <span
          className={`watch-focus-ring inline-flex w-fit rounded-full px-5 py-3 text-sm font-bold ${
            busy
              ? "cursor-wait border border-[var(--sf-line)] text-[var(--sf-faint)]"
              : "bg-[var(--sf-accent)] text-[#1a1712]"
          }`}
        >
          {busy
            ? "Working…"
            : summary.versions.length > 0
              ? "Upload new draft"
              : "Upload digital asset"}
        </span>
        <input
          type="file"
          accept={STORE_DIGITAL_ASSET_ACCEPT_ATTR}
          disabled={busy}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            event.target.value = "";
            void onFileSelected(file);
          }}
        />
      </label>
    </div>
  );
}
