"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "../../components/i18n";
import {
  discoverByContactLinkAction,
  discoverByEmailAction,
  discoverByPhoneAction,
  discoverByUsernameAction,
} from "../../actions/communications";
import { buildPersonalContactUrl } from "../../../lib/comms/contactLink";
import { discoveryNotFoundMessage } from "../../../lib/comms/discoveryNotFound";
import type { DiscoveredIdentity } from "../../../lib/comms/privacyContract";
import { sanitizeUserFacingMessage } from "../../lib/product/userFacingMessage";
import DiscoveredIdentityCard from "./DiscoveredIdentityCard";
import PersonalQrCard from "./PersonalQrCard";

type StartTab = "username" | "email" | "phone" | "link";

type StartConversationPanelProps = {
  currentUserId: string;
  ownUsername: string | null;
  onClose: () => void;
};

export default function StartConversationPanel({
  currentUserId,
  ownUsername,
  onClose,
}: StartConversationPanelProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<StartTab>("username");
  const [query, setQuery] = useState("");
  const [looking, setLooking] = useState(false);
  const [identity, setIdentity] = useState<DiscoveredIdentity | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ownLink = useMemo(
    () => (ownUsername ? buildPersonalContactUrl(ownUsername) : null),
    [ownUsername]
  );

  const tabs: { id: StartTab; label: string }[] = [
    { id: "username", label: t("comms.tabUsername") },
    { id: "email", label: t("comms.tabEmail") },
    { id: "phone", label: t("comms.tabPhone") },
    { id: "link", label: t("comms.tabLink") },
  ];

  const placeholder =
    tab === "username"
      ? t("comms.usernamePlaceholder")
      : tab === "email"
        ? t("comms.emailPlaceholder")
        : tab === "phone"
          ? t("comms.phonePlaceholder")
          : t("comms.linkPlaceholder");

  async function lookup() {
    setLooking(true);
    setError(null);
    setNotFound(false);
    setIdentity(null);

    const action =
      tab === "username"
        ? discoverByUsernameAction(query)
        : tab === "email"
          ? discoverByEmailAction(query)
          : tab === "phone"
            ? discoverByPhoneAction(query)
            : discoverByContactLinkAction(query);

    const result = await action;
    setLooking(false);

    if (!result.ok) {
      setError(sanitizeUserFacingMessage(result.message));
      return;
    }
    if (!result.identity) {
      setNotFound(true);
      return;
    }
    setIdentity(result.identity);
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm md:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="comms-start-title"
    >
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#08081a] p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-300">
              {t("comms.startConversation")}
            </p>
            <h2
              id="comms-start-title"
              className="mt-1 text-xl font-black tracking-tight text-white"
            >
              {t("comms.startTitle")}
            </h2>
            <p className="mt-1 text-sm text-white/50">{t("comms.startIntro")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="watch-focus-ring rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-white/70"
          >
            {t("comms.closeStart")}
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                setIdentity(null);
                setNotFound(false);
                setError(null);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                tab === item.id
                  ? "bg-white text-black"
                  : "border border-white/10 bg-white/5 text-white/70"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void lookup();
          }}
        >
          <label className="block">
            <span className="sr-only">{placeholder}</span>
            <input
              value={query}
              dir="auto"
              autoComplete="off"
              placeholder={placeholder}
              onChange={(event) => {
                setQuery(event.target.value);
                setNotFound(false);
                setIdentity(null);
                setError(null);
              }}
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-400/40"
            />
          </label>
          <button
            type="submit"
            disabled={looking || !query.trim()}
            className="watch-focus-ring w-full rounded-2xl bg-white py-3 text-sm font-black text-black disabled:opacity-50"
          >
            {looking ? t("comms.looking") : t("comms.lookup")}
          </button>
        </form>

        {error ? (
          <p role="alert" className="mt-3 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        {identity ? (
          <DiscoveredIdentityCard
            identity={identity}
            currentUserId={currentUserId}
            messageLabel={t("comms.message")}
            foundLabel={t("comms.identityFound")}
          />
        ) : null}

        {notFound ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm text-white/70">{t("comms.notFound")}</p>
            <p className="mt-2 text-xs leading-5 text-white/40">
              {t("comms.inviteBoundary")}
            </p>
          </div>
        ) : null}

        {tab === "link" && ownLink ? (
          <div className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/45">
              {t("comms.yourLink")}
            </p>
            <p className="break-all text-sm text-cyan-100" dir="ltr">
              {ownLink}
            </p>
            <PersonalQrCard url={ownLink} label={t("comms.yourQr")} />
            <p className="text-xs text-white/40">{t("comms.scanHint")}</p>
          </div>
        ) : null}

        <p className="sr-only">{discoveryNotFoundMessage()}</p>
      </div>
    </div>
  );
}
