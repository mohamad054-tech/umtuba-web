"use client";

import type { ReactNode } from "react";
import { useI18n } from "../../components/i18n";
import type { TranslationKey } from "../../../lib/i18n/messages/types";

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
  children,
}: {
  stats: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="um-play-panel" data-game-mounted="true">
      <div className="um-play-bar">
        {stats}
        <div className="um-play-grow" />
      </div>
      <div className="um-play-strand" />
      <div className="um-play-body">{children}</div>
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
