import Link from "next/link";
import {
  APP_SHELL_NAMESPACES,
  getTranslationStudio,
  summarizeFindings,
  validateAppShellTerminology,
} from "../../../../lib/translationStudio";
import { requireTranslationStudioAdmin } from "../requireTranslationStudioAdmin";
import TranslationStudioShell, {
  TRANSLATION_STUDIO_BASE,
} from "../TranslationStudioShell";

export const metadata = {
  title: "App Shell · Translation Studio | UMTUBA",
};

export default async function TranslationStudioAppShellPage() {
  await requireTranslationStudioAdmin();
  const studio = getTranslationStudio();
  const snap = studio.getSnapshot();
  const findings = validateAppShellTerminology({
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    ...snap,
  });
  const summary = summarizeFindings(findings);

  return (
    <TranslationStudioShell
      title="App Shell review"
      subtitle="Terminology warnings — no auto-replace"
    >
      <section className="space-y-4">
        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h1 className="text-xl font-black">Findings summary</h1>
          <ul className="mt-3 grid gap-2 text-sm text-white/70 sm:grid-cols-2">
            <li>Terminology conflicts: {summary.conflictCount}</li>
            <li>English leakage in Arabic: {summary.leakageCount}</li>
            <li>EN capitalization issues: {summary.capitalizationIssues}</li>
            <li>
              Duplicate labels / different AR:{" "}
              {summary.duplicateTranslationIssues}
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            {APP_SHELL_NAMESPACES.map((ns) => (
              <Link
                key={ns}
                href={`${TRANSLATION_STUDIO_BASE}/keys?namespace=${ns}`}
                className="watch-focus-ring rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold"
              >
                {ns}
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h2 className="text-lg font-black">Arabic terminology conflicts</h2>
          {findings.conflictingArabic.length === 0 ? (
            <p className="mt-3 text-sm text-white/50">None detected.</p>
          ) : (
            <ul className="mt-3 space-y-3 text-sm">
              {findings.conflictingArabic.slice(0, 40).map((row) => (
                <li
                  key={row.key}
                  className="rounded-xl border border-amber-400/20 bg-amber-500/5 px-3 py-2"
                >
                  <Link
                    href={`${TRANSLATION_STUDIO_BASE}/keys/${encodeURIComponent(
                      `key_appshell_${row.key.replace(/\./g, "__")}`
                    )}`}
                    className="font-mono text-xs font-bold text-blue-100"
                  >
                    {row.key}
                  </Link>
                  <p className="mt-1 text-white/70" dir="auto">
                    {row.arabicValue}
                  </p>
                  <ul className="mt-1 list-disc pl-5 text-xs text-amber-100/80">
                    {row.conflicts.map((c) => (
                      <li key={`${c.term}-${c.expected}`}>
                        “{c.term}” → expected “{c.expected}”
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h2 className="text-lg font-black">English leakage in Arabic</h2>
          {findings.englishLeakageInArabic.length === 0 ? (
            <p className="mt-3 text-sm text-white/50">None detected.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-white/70">
              {findings.englishLeakageInArabic.slice(0, 40).map((row) => (
                <li key={row.key} className="font-mono text-xs">
                  {row.key}: “{row.arabicValue}”
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h2 className="text-lg font-black">
            Duplicate labels with different Arabic
          </h2>
          {findings.duplicateLabelsDifferentTranslations.length === 0 ? (
            <p className="mt-3 text-sm text-white/50">None detected.</p>
          ) : (
            <ul className="mt-3 space-y-3 text-sm">
              {findings.duplicateLabelsDifferentTranslations.map((row) => (
                <li
                  key={row.sourceText}
                  className="rounded-xl border border-white/10 px-3 py-2"
                >
                  <p className="font-bold">{row.sourceText}</p>
                  <ul className="mt-1 text-xs text-white/60">
                    {row.arabicVariants.map((v) => (
                      <li key={`${v.key}-${v.value}`} dir="auto">
                        {v.key}: {v.value}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </TranslationStudioShell>
  );
}
