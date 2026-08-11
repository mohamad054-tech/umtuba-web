import { getKnowledgeAcquisitionService } from "../../../../lib/knowledgeAcquisition";
import KnowledgeAcquisitionShell from "../KnowledgeAcquisitionShell";
import { requireKnowledgeAcquisitionAdmin } from "../requireKnowledgeAcquisitionAdmin";

export const metadata = {
  title: "Knowledge Eligibility | UMTUBA",
};

export default async function KnowledgeEligibilityPage() {
  await requireKnowledgeAcquisitionAdmin();
  const { assets, datasets } = getKnowledgeAcquisitionService().getState();

  return (
    <KnowledgeAcquisitionShell title="Eligibility">
      <section className="space-y-4">
        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h2 className="text-lg font-black">Eligibility decisions</h2>
          <p className="mt-2 text-sm text-white/50">
            Flags are metadata for future reuse. Training is never executed here.
          </p>
        </div>
        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h2 className="font-black">Assets</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {assets.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-white/10 px-3 py-2"
              >
                <p className="font-semibold">{a.title}</p>
                <p className="mt-1 text-xs text-white/50">
                  {a.eligibility.join(" · ")}
                </p>
                {a.privacy.blocking ? (
                  <p className="mt-1 text-xs text-amber-200">
                    privacy blocking ·{" "}
                    {a.privacy.findings.map((f) => f.kind).join(", ")}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h2 className="font-black">Datasets</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {datasets.map((d) => (
              <li
                key={d.id}
                className="rounded-xl border border-white/10 px-3 py-2"
              >
                <p className="font-semibold">{d.name}</p>
                <p className="mt-1 text-xs text-white/50">
                  {d.eligibility.join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </KnowledgeAcquisitionShell>
  );
}
