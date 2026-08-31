"use client";

import { useEffect, useMemo, useState } from "react";
import {
  bindOwnPhoneAction,
  loadCommunicationsSettingsAction,
  saveCommunicationPrivacyAction,
  setContactSyncPermissionAction,
  unbindOwnPhoneAction,
} from "../actions/communications";
import { buildPersonalContactUrl } from "../../lib/comms/contactLink";
import {
  DEFAULT_COMMUNICATION_PRIVACY,
  type CommunicationPrivacy,
  type EmailFindValue,
  type PhoneFindValue,
} from "../../lib/comms/privacyContract";
import type { ContactSyncState, OwnPhoneIdentity } from "../../lib/supabase/communicationsDiscovery";
import { sanitizeUserFacingMessage } from "../lib/product/userFacingMessage";
import { useTranslation } from "../components/i18n";
import PersonalQrCard from "../messages/components/PersonalQrCard";

type CommunicationsPrivacyPanelProps = {
  username: string;
};

export default function CommunicationsPrivacyPanel({
  username,
}: CommunicationsPrivacyPanelProps) {
  const { t } = useTranslation();
  const [privacy, setPrivacy] = useState<CommunicationPrivacy>(
    DEFAULT_COMMUNICATION_PRIVACY
  );
  const [phone, setPhone] = useState<OwnPhoneIdentity | null>(null);
  const [contactSync, setContactSync] = useState<ContactSyncState | null>(null);
  const [countryCode, setCountryCode] = useState("+1");
  const [national, setNational] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const contactUrl = useMemo(
    () => buildPersonalContactUrl(username),
    [username]
  );

  useEffect(() => {
    void loadCommunicationsSettingsAction().then((result) => {
      setLoading(false);
      if (!result.ok) {
        setError(sanitizeUserFacingMessage(result.message));
        return;
      }
      setPrivacy(result.privacy);
      setPhone(result.phone);
      setContactSync(result.contactSync);
      if (result.phone) {
        setCountryCode(result.phone.phoneCountryCode);
        setNational(
          result.phone.phoneE164.slice(result.phone.phoneCountryCode.length)
        );
      }
    });
  }, []);

  async function savePrivacy(
    patch: Parameters<typeof saveCommunicationPrivacyAction>[0]
  ) {
    setSaving(true);
    setError(null);
    const result = await saveCommunicationPrivacyAction(patch);
    setSaving(false);
    if (!result.ok) {
      setError(sanitizeUserFacingMessage(result.message));
      return;
    }
    setPrivacy(result.privacy);
  }

  async function savePhone() {
    setSaving(true);
    setError(null);
    const result = await bindOwnPhoneAction({
      phone: national,
      countryCode,
    });
    setSaving(false);
    if (!result.ok) {
      setError(sanitizeUserFacingMessage(result.message));
      return;
    }
    setPhone(result.phone);
  }

  async function removePhone() {
    setSaving(true);
    setError(null);
    const result = await unbindOwnPhoneAction();
    setSaving(false);
    if (!result.ok) {
      setError(sanitizeUserFacingMessage(result.message));
      return;
    }
    setPhone(null);
    setNational("");
  }

  async function copyLink() {
    if (!contactUrl) return;
    try {
      await navigator.clipboard.writeText(contactUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t("profile.actions.copyError"));
    }
  }

  if (loading) {
    return <p className="text-sm text-white/50">{t("status.loading")}</p>;
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h3 className="text-sm font-black text-white/85">{t("settings.findByEmail")}</h3>
        <p className="text-xs leading-5 text-white/45">
          {t("settings.findByEmailHint")}
        </p>
        <div className="flex flex-wrap gap-2">
          {(["nobody", "everyone"] as EmailFindValue[]).map((value) => (
            <button
              key={value}
              type="button"
              disabled={saving}
              onClick={() => void savePrivacy({ findByEmail: value })}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                privacy.findByEmail === value
                  ? "bg-white text-black"
                  : "border border-white/10 bg-white/5 text-white/70"
              }`}
            >
              {value === "nobody"
                ? t("settings.privacyNobody")
                : t("settings.privacyEveryone")}
            </button>
          ))}
        </div>
        <p className="text-xs text-white/35">
          {t("settings.privacyConnectionsReserved")}
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-black text-white/85">{t("settings.findByPhone")}</h3>
        <p className="text-xs leading-5 text-white/45">
          {t("settings.findByPhoneHint")}
        </p>
        <div className="flex flex-wrap gap-2">
          {(["nobody", "contacts", "everyone"] as PhoneFindValue[]).map(
            (value) => (
              <button
                key={value}
                type="button"
                disabled={saving}
                onClick={() => void savePrivacy({ findByPhone: value })}
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                  privacy.findByPhone === value
                    ? "bg-white text-black"
                    : "border border-white/10 bg-white/5 text-white/70"
                }`}
              >
                {value === "nobody"
                  ? t("settings.privacyNobody")
                  : value === "contacts"
                    ? t("settings.privacyContacts")
                    : t("settings.privacyEveryone")}
              </button>
            )
          )}
        </div>
        {privacy.findByPhone === "contacts" ? (
          <p className="text-xs leading-5 text-white/40">
            {t("settings.privacyContactsReserved")}
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-black text-white/85">{t("settings.ownPhone")}</h3>
        <p className="text-xs leading-5 text-white/45">{t("settings.ownPhoneHint")}</p>
        <div className="grid gap-3 sm:grid-cols-[7rem_1fr]">
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
              {t("settings.phoneCountry")}
            </span>
            <input
              dir="ltr"
              value={countryCode}
              onChange={(event) => setCountryCode(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
              {t("settings.phoneNumber")}
            </span>
            <input
              dir="ltr"
              inputMode="tel"
              value={national}
              onChange={(event) => setNational(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void savePhone()}
            className="watch-focus-ring rounded-full bg-white px-4 py-2 text-xs font-black text-black"
          >
            {t("settings.phoneSave")}
          </button>
          {phone ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void removePhone()}
              className="watch-focus-ring rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-white/70"
            >
              {t("settings.phoneRemove")}
            </button>
          ) : null}
        </div>
        {phone ? (
          <p className="text-xs text-white/50" dir="ltr">
            {phone.phoneE164} · {t("settings.phoneUnverified")}
          </p>
        ) : null}
        <p className="text-xs leading-5 text-white/35">
          {t("settings.phoneVerificationUnavailable")}
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-black text-white/85">{t("settings.personalLink")}</h3>
        <p className="text-xs leading-5 text-white/45">
          {t("settings.personalLinkHint")}
        </p>
        {contactUrl ? (
          <>
            <p className="break-all text-sm text-cyan-100" dir="ltr">
              {contactUrl}
            </p>
            <button
              type="button"
              onClick={() => void copyLink()}
              className="watch-focus-ring rounded-full border border-white/15 px-4 py-2 text-xs font-bold"
            >
              {copied ? t("settings.linkCopied") : t("settings.copyLink")}
            </button>
            <PersonalQrCard url={contactUrl} label={t("comms.yourQr")} />
          </>
        ) : null}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-black text-white/85">{t("settings.contactSync")}</h3>
        <p className="text-xs leading-5 text-white/45">
          {t("settings.contactSyncHint")}
        </p>
        <p className="text-xs text-white/40">{t("settings.contactSyncInactive")}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              const result = await setContactSyncPermissionAction(true);
              if (result.ok) setContactSync(result.state);
              else setError(sanitizeUserFacingMessage(result.message));
            }}
            className="watch-focus-ring rounded-full border border-white/15 px-4 py-2 text-xs font-bold"
          >
            {t("settings.contactSyncAllow")}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              const result = await setContactSyncPermissionAction(false);
              if (result.ok) setContactSync(result.state);
              else setError(sanitizeUserFacingMessage(result.message));
            }}
            className="watch-focus-ring rounded-full border border-white/15 px-4 py-2 text-xs font-bold"
          >
            {t("settings.contactSyncRevoke")}
          </button>
        </div>
        {contactSync?.permissionGrantedAt ? (
          <p className="text-xs text-white/35" dir="ltr">
            {contactSync.permissionGrantedAt}
          </p>
        ) : null}
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs leading-5 text-white/40">{t("settings.preparedHint")}</p>
        <p className="text-sm font-bold text-white/70">{t("settings.whoCanMessage")}</p>
        <p className="text-sm font-bold text-white/70">{t("settings.whoCanCall")}</p>
        <p className="text-sm font-bold text-white/70">{t("settings.readReceipts")}</p>
        <p className="text-sm font-bold text-white/70">{t("settings.lastSeen")}</p>
      </section>

      {error ? (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
