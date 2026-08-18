"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  applyDocumentLocale,
  collectNavigatorLanguages,
  planDeviceLocaleBridge,
  readLocaleFromSearch,
  readSavedLocaleFromDocument,
} from "../../../lib/i18n";
import { useTranslation } from "./I18nProvider";

/**
 * Bridges navigator.language into the shared umtuba_locale cookie when the
 * server could not see a saved preference. Never overrides an explicit choice.
 */
export default function DeviceLocaleBridge() {
  const { locale } = useTranslation();
  const router = useRouter();
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current) return;
    if (typeof navigator === "undefined") return;

    const plan = planDeviceLocaleBridge({
      cookiePreference: readSavedLocaleFromDocument(),
      urlLocale: readLocaleFromSearch(window.location.search),
      deviceLanguages: collectNavigatorLanguages(navigator),
      serverLocale: locale,
    });

    if (plan.action === "none") return;

    applied.current = true;
    applyDocumentLocale(plan.locale, "detected");

    if (plan.reason === "device-mismatch") {
      router.refresh();
    }
  }, [locale, router]);

  return null;
}
