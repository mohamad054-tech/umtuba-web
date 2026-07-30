import { getKnowledgeAcquisitionService } from "../../../../lib/knowledgeAcquisition";
import KnowledgeAcquisitionShell from "../KnowledgeAcquisitionShell";
import { requireKnowledgeAcquisitionAdmin } from "../requireKnowledgeAcquisitionAdmin";

export const metadata = {
  title: "Acquisition History | UMTUBA",
};

export default async function KnowledgeHistoryPage() {
  await requireKnowledgeAcquisitionAdmin();
  const history = getKnowledgeAcquisitionService().listHistory();

  return (
    <KnowledgeAcquisitionShell title="Acquisition History">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h1 className="text-lg font-black">History</h1>
        <ul className="mt-4 divide-y divide-white/10">
          {history.map((h) => (
            <li key={h.id} className="py-3">
              <p className="font-mono text-xs text-blue-100">{h.id}</p>
              <p className="mt-1 text-sm">
                <span className="font-semibold">{h.action}</span> · {h.entityType}{" "}
                {h.entityId}
              </p>
              <p className="mt-1 text-[11px] text-white/40">
                {h.createdAt} · actor {h.actorId ?? "—"}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </KnowledgeAcquisitionShell>
  );
}
