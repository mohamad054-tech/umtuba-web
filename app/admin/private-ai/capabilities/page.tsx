import { getPrivateAiService } from "../../../../lib/privateAi";
import PrivateAiShell from "../PrivateAiShell";
import { requirePrivateAiAdmin } from "../requirePrivateAiAdmin";

export const metadata = { title: "AI Capabilities | UMTUBA" };

export default async function PrivateAiCapabilitiesPage() {
  await requirePrivateAiAdmin();
  const caps = getPrivateAiService().listCapabilities();

  return (
    <PrivateAiShell title="Capabilities">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h2 className="text-lg font-black">Capability registry</h2>
        <ul className="mt-4 divide-y divide-white/10">
          {caps.map((c) => (
            <li key={c.id} className="py-3">
              <p className="font-semibold">
                {c.label}{" "}
                <span className="font-mono text-xs text-white/40">({c.id})</span>
              </p>
              <p className="mt-1 text-sm text-white/55">{c.description}</p>
              <p className="mt-2 text-[11px] text-white/45">
                {c.status} · models {c.mappedModelIds.join(", ") || "—"}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </PrivateAiShell>
  );
}
