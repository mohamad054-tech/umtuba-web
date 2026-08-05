import { getKnowledgeAcquisitionService } from "../../../../lib/knowledgeAcquisition";
import KnowledgeAcquisitionShell from "../KnowledgeAcquisitionShell";
import { requireKnowledgeAcquisitionAdmin } from "../requireKnowledgeAcquisitionAdmin";

export const metadata = {
  title: "Knowledge Sources | UMTUBA",
};

export default async function KnowledgeSourcesPage() {
  await requireKnowledgeAcquisitionAdmin();
  const sources = getKnowledgeAcquisitionService().listSources();

  return (
    <KnowledgeAcquisitionShell title="Knowledge Sources">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h1 className="text-lg font-black">Source registry</h1>
        <ul className="mt-4 divide-y divide-white/10">
          {sources.map((s) => (
            <li key={s.id} className="py-3">
              <p className="font-mono text-xs text-blue-100">{s.id}</p>
              <p className="mt-1 font-semibold">{s.name}</p>
              <p className="mt-1 text-sm text-white/55">{s.description}</p>
              <p className="mt-2 text-[11px] text-white/45">
                {s.kind} · stage {s.stage} · rights {s.rights.status} ·{" "}
                {s.languages.join(", ") || "no langs"} ·{" "}
                {s.domains.join(", ")}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </KnowledgeAcquisitionShell>
  );
}
