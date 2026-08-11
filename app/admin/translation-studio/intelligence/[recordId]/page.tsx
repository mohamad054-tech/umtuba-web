import { notFound } from "next/navigation";
import {
  buildMediaIntelligenceContract,
  createEmptyMediaMetadata,
  getStyleProfile,
  getTranslationIntelligenceService,
} from "../../../../../lib/translationStudio";
import { requireTranslationStudioAdmin } from "../../requireTranslationStudioAdmin";
import TranslationStudioShell from "../../TranslationStudioShell";

export const metadata = {
  title: "Intelligence record · Translation Studio | UMTUBA",
};

type PageProps = {
  params: Promise<{ recordId: string }>;
};

export default async function TranslationIntelligenceRecordPage({
  params,
}: PageProps) {
  await requireTranslationStudioAdmin();
  const { recordId } = await params;
  const record = getTranslationIntelligenceService()
    .listRecords()
    .find((r) => r.id === recordId);
  if (!record) notFound();

  const style = getStyleProfile(record.styleProfileId);
  const mediaPreview = buildMediaIntelligenceContract(
    record.media ??
      createEmptyMediaMetadata({
        mediaAssetId: "preview-none",
        segmentId: "n/a",
      })
  );

  return (
    <TranslationStudioShell title="Intelligence record" subtitle={record.id}>
      <section className="space-y-4">
        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h2 className="text-xl font-black">{record.sourceText}</h2>
          <p className="mt-2 text-lg" dir="auto">
            {record.approvedTargetText}
          </p>
          <p className="mt-3 text-xs text-white/45">
            {record.sourceLocale} → {record.targetLocale} · v
            {record.approvedVersion} · {record.contentType}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
            <h2 className="font-black">Provenance & rights</h2>
            <ul className="mt-3 space-y-1 text-sm text-white/70">
              <li>Provenance: {record.provenance.type}</li>
              <li>Provider: {record.provenance.providerName ?? "—"}</li>
              <li>
                Suggestion: {record.suggestionProvenance?.type ?? "—"}
              </li>
              <li>Rights: {record.usageRights.status}</li>
              <li>
                Reuse internal:{" "}
                {String(record.usageRights.permissionReuseInternally)}
              </li>
              <li>
                Model customization:{" "}
                {String(record.usageRights.permissionModelCustomization)}
              </li>
              <li>Trust: {record.trustLevel}</li>
              <li>Sensitivity: {record.sensitivity}</li>
            </ul>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
            <h2 className="font-black">Eligibility</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-white/70">
              {record.eligibility.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
            <h2 className="mt-4 font-black">Style</h2>
            <p className="mt-2 text-sm text-white/70">
              {style.label} — {style.tone}
            </p>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h2 className="font-black">
            Quality · {record.quality.overallScore.toFixed(2)} (
            {record.quality.scoringMode})
          </h2>
          <p className="mt-1 text-xs text-white/45">{record.quality.notes}</p>
          <ul className="mt-3 space-y-2 text-sm">
            {record.quality.dimensions.map((d) => (
              <li
                key={d.id}
                className="rounded-xl border border-white/10 px-3 py-2"
              >
                <div className="flex justify-between gap-2">
                  <span className="font-bold">{d.id}</span>
                  <span>{d.score.toFixed(2)}</span>
                </div>
                <p className="mt-1 text-xs text-white/50">{d.detail}</p>
                {d.warning ? (
                  <p className="mt-1 text-xs text-amber-200">{d.warning}</p>
                ) : null}
                {d.blocking ? (
                  <p className="mt-1 text-xs text-rose-200">Blocking</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h2 className="font-black">Reviewer corrections</h2>
          {record.feedback ? (
            <ul className="mt-3 space-y-1 text-sm text-white/70">
              <li>Outcome: {record.feedback.outcome}</li>
              <li>Edit distance: {record.feedback.editDistance}</li>
              <li>Candidate: {record.feedback.candidateText ?? "—"}</li>
              <li>Approved: {record.feedback.approvedText}</li>
            </ul>
          ) : (
            <p className="mt-3 text-sm text-white/50">No feedback recorded.</p>
          )}
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h2 className="font-black">Audio / video metadata preview</h2>
          <p className="mt-2 text-xs text-white/45">
            Contracts only — processingImplemented=
            {String(mediaPreview.processingImplemented)}
          </p>
          <pre className="mt-3 overflow-auto rounded-xl border border-white/10 bg-black/40 p-3 text-[11px] text-white/60">
            {JSON.stringify(mediaPreview.metadata, null, 2)}
          </pre>
        </div>
      </section>
    </TranslationStudioShell>
  );
}
