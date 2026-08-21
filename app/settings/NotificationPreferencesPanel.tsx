"use client";

import { useEffect, useState } from "react";
import {
  getNotificationPreferencesAction,
  updateNotificationPreferencesAction,
} from "../actions/notifications";
import type { NotificationPreferences } from "../../lib/supabase/notifications";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_PREFERENCE_FIELDS,
  type NotificationPreferenceKey,
} from "../notifications/lib/preferences";
import { useTranslation } from "../components/i18n";
import { settingsUserFacingKey } from "./settingsUserFacingError";

type NotificationPreferencesPanelProps = {
  /** When true, scroll/highlight this section (settings deep link). */
  highlighted?: boolean;
};

export default function NotificationPreferencesPanel({
  highlighted = false,
}: NotificationPreferencesPanelProps) {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<NotificationPreferenceKey | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await getNotificationPreferencesAction();
      if (cancelled) return;
      if (!result.ok) {
        const messageKey = settingsUserFacingKey(result.message);
        setError(messageKey ? t(messageKey) : t("settings.notificationsError"));
        setLoading(false);
        return;
      }
      setPrefs(result.preferences);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  async function toggle(key: NotificationPreferenceKey) {
    const nextValue = !prefs[key];
    const previous = prefs;
    setPrefs((p) => ({ ...p, [key]: nextValue }));
    setSavingKey(key);
    setError(null);
    setSavedFlash(false);

    const result = await updateNotificationPreferencesAction({
      [key]: nextValue,
    });
    setSavingKey(null);

    if (!result.ok) {
      setPrefs(previous);
      const messageKey = settingsUserFacingKey(result.message);
      setError(messageKey ? t(messageKey) : t("settings.notificationsError"));
      return;
    }

    setPrefs(result.preferences);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1600);
  }

  return (
    <section
      id="notification-preferences"
      className={`rounded-2xl border p-4 transition ${
        highlighted
          ? "border-blue-400/40 bg-blue-500/10"
          : "border-white/10 bg-black/30"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40 rtl:normal-case rtl:tracking-normal">
            {t("settings.notificationsEyebrow")}
          </p>
          <h3 className="mt-0.5 text-base font-black tracking-tight text-white">
            {t("settings.notificationsAlertPrefs")}
          </h3>
          <p className="mt-1 text-xs text-white/45">
            {t("settings.notificationsNearbyNote")}
          </p>
        </div>
        {savedFlash ? (
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
            {t("settings.notificationsSavedFlash")}
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-xl bg-white/5"
            />
          ))}
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {NOTIFICATION_PREFERENCE_FIELDS.map((field) => {
            const on = prefs[field.key];
            const busy = savingKey === field.key;
            return (
              <li
                key={field.key}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white/90">
                    {t(field.labelKey)}
                  </p>
                  <p className="mt-0.5 text-xs text-white/45">
                    {t(field.descriptionKey)}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  disabled={busy || loading}
                  onClick={() => void toggle(field.key)}
                  className={`watch-focus-ring relative h-7 w-12 shrink-0 rounded-full border transition ${
                    on
                      ? "border-blue-400/40 bg-blue-500/40"
                      : "border-white/15 bg-white/10"
                  } disabled:opacity-50`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                      on ? "left-6" : "left-0.5"
                    }`}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}
    </section>
  );
}
