import { getPrivateAiService } from "../../../../lib/privateAi";
import PrivateAiShell from "../PrivateAiShell";
import { requirePrivateAiAdmin } from "../requirePrivateAiAdmin";

export const metadata = { title: "Routing Contracts | UMTUBA" };

export default async function PrivateAiRoutingPage() {
  await requirePrivateAiAdmin();
  const routes = getPrivateAiService().listRouting();

  return (
    <PrivateAiShell title="Routing">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h2 className="text-lg font-black">Routing contracts</h2>
        <p className="mt-2 text-sm text-white/50">
          Future routing between providers and private models — not implemented
          at runtime.
        </p>
        <ul className="mt-4 divide-y divide-white/10">
          {routes.map((r) => (
            <li key={r.id} className="py-3">
              <p className="font-semibold">{r.name}</p>
              <p className="mt-2 text-[11px] text-white/45">
                {r.capabilityId} · primary {r.primary} · fallbacks{" "}
                {r.fallbacks.join(" → ") || "—"} · cost opt{" "}
                {r.costOptimization ? "yes" : "no"}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </PrivateAiShell>
  );
}
