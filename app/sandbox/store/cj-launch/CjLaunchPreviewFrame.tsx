"use client";

import { Suspense, useEffect, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { I18nProvider, useTranslation } from "../../../components/i18n";
import { createTranslator } from "../../../../lib/i18n/translate";
import { resolveCjLaunchPreviewLocale } from "../../../../lib/sandbox/cjLaunch/resolvePreviewLocale";

function CjLaunchPreviewFrameInner({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const { locale: requestLocale } = useTranslation();
  const preview = resolveCjLaunchPreviewLocale({
    requestLocale,
    dirParam: searchParams.get("dir"),
  });
  const t = createTranslator(preview.locale);

  useEffect(() => {
    const html = document.documentElement;
    const previousLang = html.lang;
    const previousDir = html.getAttribute("dir");
    html.lang = preview.locale;
    html.dir = preview.direction;
    return () => {
      html.lang = previousLang;
      if (previousDir) html.setAttribute("dir", previousDir);
      else html.removeAttribute("dir");
    };
  }, [preview.direction, preview.locale]);

  return (
    <I18nProvider locale={preview.locale}>
      <div dir={preview.direction}>
        <div className="border-b border-amber-400/40 bg-amber-500/10 px-4 py-2 text-center">
          <p className="text-[10px] font-black tracking-[0.2em] text-amber-100">
            {t("store.preview.sandboxBanner")}
          </p>
          <p className="mt-1 text-xs text-amber-50/80">{t("store.preview.sandboxSubtitle")}</p>
        </div>
        {children}
      </div>
    </I18nProvider>
  );
}

export default function CjLaunchPreviewFrame({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={children}>
      <CjLaunchPreviewFrameInner>{children}</CjLaunchPreviewFrameInner>
    </Suspense>
  );
}
