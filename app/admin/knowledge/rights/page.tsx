import { getKnowledgeAcquisitionService } from "../../../../lib/knowledgeAcquisition";
import KnowledgeAcquisitionShell from "../KnowledgeAcquisitionShell";
import { requireKnowledgeAcquisitionAdmin } from "../requireKnowledgeAcquisitionAdmin";

export const metadata = {
  title: "Knowledge Rights | UMTUBA",
};

export default async function KnowledgeRightsPage() {
  await requireKnowledgeAcquisitionAdmin();
  const { sources, assets } = getKnowledgeAcquisitionService().getState();

  return (
    <KnowledgeAcquisitionShell title="Rights">
      <section className="space-y-4">
        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h1 className="text-lg font-black">Rights engine (fail closed)</h1>
          <p className="mt-2 text-sm text-white/50">
            Unknown or restricted rights never become training eligible.
          </p>
        </div>
        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h2 className="font-black">Sources</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {sources.map((s) => (
              <li
                key={s.id}
                className="rounded-xl border border-white/10 px-3 py-2"
              >
                <p className="font-semibold">{s.name}</p>
                <p className="mt-1 text-xs text-white/50">
                  status {s.rights.status} · owner {s.rights.owner ?? "—"} ·
                  license {s.rights.license ?? "—"} · training{" "}
                  {s.rights.trainingPermission ? "yes" : "no"} · customization{" "}
                  {s.rights.modelCustomizationPermission ? "yes" : "no"} ·
                  redistribute {s.rights.redistributionPermission ? "yes" : "no"}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h2 className="font-black">Assets</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {assets.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-white/10 px-3 py-2"
              >
                <p className="font-semibold">{a.title}</p>
                <p className="mt-1 text-xs text-white/50">
                  {a.rights.status} · training{" "}
                  {a.rights.trainingPermission ? "yes" : "no"} · attribution{" "}
                  {a.rights.attributionRequired ? "required" : "n/a"}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </KnowledgeAcquisitionShell>
  );
}
