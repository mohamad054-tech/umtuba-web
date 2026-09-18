"use client";

import { useState, type ReactNode } from "react";
import { useI18n } from "../../components/i18n";
import type { TranslationKey } from "../../../lib/i18n/messages/types";

export function usePlayHelp() {
  const [helpOpen, setHelpOpen] = useState(true);
  const [ready, setReady] = useState(false);

  const dismissHelp = () => {
    setHelpOpen(false);
    setReady(true);
  };

  const toggleHelp = () => {
    setHelpOpen((open) => !open);
  };

  const keepReadyOnReplay = () => {
    setHelpOpen(false);
    setReady(true);
  };

  return { helpOpen, ready, dismissHelp, toggleHelp, keepReadyOnReplay };
}

export function PlayStat({
  label,
  value,
  warn = false,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="um-play-stat">
      <span className="k">{label}</span>
      <span className={`v${warn ? " warn" : ""}`}>{value}</span>
    </div>
  );
}

export function PlayPanel({
  stats,
  helpOpen = false,
  onToggleHelp,
  fill = false,
  children,
}: {
  stats: ReactNode;
  helpOpen?: boolean;
  onToggleHelp?: () => void;
  fill?: boolean;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className={`um-play-panel${fill ? " fit" : ""}`} data-game-mounted="true">
      <div className="um-play-bar">
        {stats}
        <div className="um-play-grow" />
        {onToggleHelp ? (
          <button
            type="button"
            className={`um-play-btn um-play-help-btn${helpOpen ? " on" : ""}`}
            onClick={onToggleHelp}
            aria-expanded={helpOpen}
            data-help-toggle="true"
          >
            ? {t("games.howTo")}
          </button>
        ) : null}
      </div>
      <div className="um-play-strand" />
      <div className="um-play-body">{children}</div>
    </div>
  );
}

export function PlayHowTo({
  open,
  lines,
  cta,
  onDismiss,
}: {
  open: boolean;
  lines: string[];
  cta: "start" | "gotIt";
  onDismiss: () => void;
}) {
  const { t } = useI18n();
  if (!open) return null;
  return (
    <div className="um-play-howto" data-howto="true">
      <p className="um-play-howto-title">{t("games.howTo")}</p>
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
      <div className="um-play-row" style={{ marginTop: 10 }}>
        <button
          type="button"
          className="um-play-btn go"
          data-howto-dismiss="true"
          onClick={onDismiss}
        >
          {cta === "start" ? t("games.start") : t("games.gotIt")}
        </button>
      </div>
    </div>
  );
}

export function PlayResult({
  score,
  verdictKey,
  detail,
  onAgain,
}: {
  score: number;
  verdictKey: TranslationKey;
  detail: string;
  onAgain: () => void;
}) {
  const { t, locale } = useI18n();
  return (
    <div className="um-play-result" data-game-result="true">
      <div className="um-play-score">
        {new Intl.NumberFormat(locale).format(score)}
        <small> {t("games.score")}</small>
      </div>
      <div className="um-play-verdict">{t(verdictKey)}</div>
      <p className="um-play-detail">{detail}</p>
      <div className="um-play-row" style={{ justifyContent: "center" }}>
        <button type="button" className="um-play-btn go" onClick={onAgain}>
          {t("games.playAgain")}
        </button>
      </div>
    </div>
  );
}
