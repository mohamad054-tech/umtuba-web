import {
  getPrivateAiService,
  PRIVATE_AI_LIFECYCLE_ORDER,
} from "../../../../lib/privateAi";
import PrivateAiShell from "../PrivateAiShell";
import { requirePrivateAiAdmin } from "../requirePrivateAiAdmin";

export const metadata = { title: "Private AI Lifecycle | UMTUBA" };

export default async function PrivateAiLifecyclePage() {
  await requirePrivateAiAdmin();
  const models = getPrivateAiService().listModels();

  return (
    <PrivateAiShell title="Lifecycle">
      <section className="space-y-4">
        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h1 className="text-lg font-black">Lifecycle states</h1>
          <p className="mt-2 text-sm text-white/50">
            Metadata only — training_running never executes training.
          </p>
          <p className="mt-3 text-xs text-white/45">
            {PRIVATE_AI_LIFECYCLE_ORDER.join(" → ")}
          </p>
        </div>
        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h2 className="font-black">Models by lifecycle</h2>
          <ul className="mt-3 divide-y divide-white/10 text-sm">
            {models.map((m) => (
              <li key={m.id} className="py-2">
                <p className="font-semibold">{m.name}</p>
                <p className="mt-1 text-[11px] text-white/45">
                  {m.lifecycle} · class {m.modelClass}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </PrivateAiShell>
  );
}
