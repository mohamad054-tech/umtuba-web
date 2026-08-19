"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useTranslation } from "../../components/i18n";
import { createClient } from "../../../lib/supabase/client";
import { isPubliclyReusableSound } from "../../../lib/sounds/socialSounds";

function mapSoundFromUnknown(row: unknown) {
  if (!row || typeof row !== "object") return null;
  const raw = row as Record<string, unknown>;
  if (typeof raw.id !== "string") return null;
  return {
    id: raw.id,
    title: typeof raw.title === "string" ? raw.title : "",
    ownerUserId: typeof raw.owner_user_id === "string" ? raw.owner_user_id : "",
    durationMs: typeof raw.duration_ms === "number" ? raw.duration_ms : null,
    usageCount: typeof raw.usage_count === "number" ? raw.usage_count : 0,
    visibility: String(raw.visibility ?? "private"),
    reusePermission: String(raw.reuse_permission ?? "none"),
    rightsStatus: String(raw.rights_status ?? "unverified"),
    moderationStatus: String(raw.moderation_status ?? "pending"),
    rightsConfirmedAt:
      typeof raw.rights_confirmed_at === "string" ? raw.rights_confirmed_at : null,
    sourceType: String(raw.source_type ?? "uploaded"),
  };
}

export default function SoundPageClient({
  soundId,
  createHref,
}: {
  soundId: string;
  createHref: string;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [usageCount, setUsageCount] = useState<number | null>(null);
  const [rights, setRights] = useState("");
  const [canUse, setCanUse] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const supabase = createClient();
        const { data, error: queryError } = await supabase
          .from("social_sounds")
          .select(
            "id,title,owner_user_id,duration_ms,usage_count,visibility,reuse_permission,rights_status,moderation_status,rights_confirmed_at,source_type"
          )
          .eq("id", soundId)
          .maybeSingle();
        if (!active) return;
        if (queryError || !data) {
          setError(t("status.empty"));
          return;
        }
        const sound = mapSoundFromUnknown(data);
        if (!sound) {
          setError(t("status.empty"));
          return;
        }
        setTitle(sound.title);
        setUsageCount(sound.usageCount);
        setRights(sound.rightsStatus);
        setCanUse(
          isPubliclyReusableSound({
            visibility: sound.visibility,
            reusePermission: sound.reusePermission,
            rightsStatus: sound.rightsStatus,
            moderationStatus: sound.moderationStatus,
            rightsConfirmedAt: sound.rightsConfirmedAt,
          })
        );
      } catch {
        if (active) setError(t("status.unavailable"));
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [soundId, t]);

  return (
    <section className="mx-auto max-w-xl px-4 py-8 space-y-4">
      <h2 className="text-2xl font-black">{title || t("status.loading")}</h2>
      {usageCount != null ? (
        <p className="text-white/60">{usageCount}</p>
      ) : null}
      {rights ? <p className="text-sm text-white/45">{rights}</p> : null}
      {error ? (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
      {canUse ? (
        <Link
          href={createHref}
          className="inline-flex rounded-2xl bg-white px-5 py-3 font-black text-black"
        >
          {t("actions.continue")}
        </Link>
      ) : null}
    </section>
  );
}
