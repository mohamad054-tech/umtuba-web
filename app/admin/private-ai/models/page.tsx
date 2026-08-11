import { getPrivateAiService } from "../../../../lib/privateAi";
import PrivateAiShell from "../PrivateAiShell";
import { requirePrivateAiAdmin } from "../requirePrivateAiAdmin";

export const metadata = { title: "Private Models | UMTUBA" };

export default async function PrivateAiModelsPage() {
  await requirePrivateAiAdmin();
  const models = getPrivateAiService().listModels();

  return (
    <PrivateAiShell title="Private Models">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h2 className="text-lg font-black">Model registry</h2>
        <ul className="mt-4 divide-y divide-white/10">
          {models.map((m) => (
            <li key={m.id} className="py-3">
              <p className="font-mono text-xs text-blue-100">{m.id}</p>
              <p className="mt-1 font-semibold">
                {m.name} · {m.version}
              </p>
              <p className="mt-2 text-[11px] text-white/45">
                {m.modelClass} · {m.family} · lifecycle {m.lifecycle} ·{" "}
                {m.capabilities.join(", ") || "no capabilities"}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </PrivateAiShell>
  );
}
