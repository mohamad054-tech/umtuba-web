import { getKnowledgeAcquisitionService } from "../../../../lib/knowledgeAcquisition";
import KnowledgeAcquisitionShell from "../KnowledgeAcquisitionShell";
import { requireKnowledgeAcquisitionAdmin } from "../requireKnowledgeAcquisitionAdmin";

export const metadata = {
  title: "Knowledge Classification | UMTUBA",
};

export default async function KnowledgeClassificationPage() {
  await requireKnowledgeAcquisitionAdmin();
  const assets = getKnowledgeAcquisitionService().listAssets();

  return (
    <KnowledgeAcquisitionShell title="Classification">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h1 className="text-lg font-black">Domain classification</h1>
        <ul className="mt-4 divide-y divide-white/10">
          {assets.map((a) => (
            <li key={a.id} className="py-3">
              <p className="font-semibold">{a.title}</p>
              <p className="mt-1 text-sm text-white/55">
                domains: {a.domains.join(", ")}
              </p>
              <p className="mt-1 text-[11px] text-white/40">
                languages: {a.languages.join(", ") || "—"} · stage {a.stage}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </KnowledgeAcquisitionShell>
  );
}
