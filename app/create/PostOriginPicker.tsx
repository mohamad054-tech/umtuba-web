"use client";

import { useId, useMemo } from "react";
import { useTranslation } from "../components/i18n";
import { listIsoCountryCodes } from "../../lib/geo/isoCountryCenters";
import {
  ORIGIN_CITY_MAX_LENGTH,
  emptyPostOriginDraft,
  localizedIsoCountryName,
  type PostOriginDraft,
} from "../../lib/geo/postOrigin";

type PostOriginPickerProps = {
  value: PostOriginDraft;
  onChange: (value: PostOriginDraft) => void;
  disabled?: boolean;
};

export default function PostOriginPicker({
  value,
  onChange,
  disabled = false,
}: PostOriginPickerProps) {
  const { t, locale } = useTranslation();
  const countryId = useId();
  const cityId = useId();
  const hintId = useId();
  const cityEnabled = Boolean(value.countryCode) && !disabled;

  const countries = useMemo(() => {
    return listIsoCountryCodes()
      .map((code) => ({
        code,
        name: localizedIsoCountryName(locale, code),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [locale]);

  const hasValue = Boolean(value.countryCode || value.city.trim());

  return (
    <fieldset className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <legend className="px-1 text-sm font-bold text-white/80">
        {t("create.origin.countryLabel")}{" "}
        <span className="font-medium text-white/40">
          ({t("create.origin.optional")})
        </span>
      </legend>

      <p id={hintId} className="text-xs text-white/45">
        {t("create.origin.hint")}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor={countryId} className="block text-xs font-bold text-white/70">
            {t("create.origin.countryLabel")}
          </label>
          <select
            id={countryId}
            value={value.countryCode}
            disabled={disabled}
            aria-describedby={hintId}
            onChange={(event) => {
              const countryCode = event.target.value;
              onChange({
                countryCode,
                city: countryCode ? value.city : "",
              });
            }}
            className="watch-focus-ring w-full rounded-2xl border border-white/10 bg-[#0b0b18] px-3 py-2.5 text-sm text-white outline-none focus:border-white/30 disabled:opacity-50"
          >
            <option value="" className="bg-[#0b0b18]">
              {t("create.origin.countryNone")}
            </option>
            {countries.map((country) => (
              <option
                key={country.code}
                value={country.code}
                className="bg-[#0b0b18]"
              >
                {country.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor={cityId} className="block text-xs font-bold text-white/70">
            {t("create.origin.cityLabel")}{" "}
            <span className="font-medium text-white/40">
              ({t("create.origin.optional")})
            </span>
          </label>
          <input
            id={cityId}
            type="text"
            value={value.city}
            maxLength={ORIGIN_CITY_MAX_LENGTH}
            disabled={!cityEnabled}
            placeholder={
              cityEnabled
                ? t("create.origin.cityPlaceholder")
                : t("create.origin.cityDisabledHint")
            }
            autoComplete="off"
            onChange={(event) => {
              onChange({
                countryCode: value.countryCode,
                city: event.target.value,
              });
            }}
            className="watch-focus-ring w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/30 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </div>

      {hasValue ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(emptyPostOriginDraft())}
          className="watch-focus-ring text-xs font-bold text-white/55 underline-offset-2 hover:text-white hover:underline disabled:opacity-50"
        >
          {t("create.origin.clear")}
        </button>
      ) : null}
    </fieldset>
  );
}
