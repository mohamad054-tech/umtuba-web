import { getPrivateAiService } from "../../../lib/privateAi";
import PrivateAiShell from "./PrivateAiShell";
import { requirePrivateAiAdmin } from "./requirePrivateAiAdmin";

export const metadata = { title: "Private AI | UMTUBA" };

export default async function PrivateAiOverviewPage() {
  await requirePrivateAiAdmin();
  const svc = getPrivateAiService();
  const state = svc.getState();

  return (
    <PrivateAiShell title="Private AI" subtitle="Foundation V1 — read-only">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h1 className="text-xl font-black">Private AI Foundation</h1>
        <p className="mt-2 text-sm text-white/55">
          Architecture for UMTUBA-owned private AI models. Registries and
          contracts only — no training, fine-tuning, inference, or weights.
        </p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          {[
            ["Models", state.models.length],
            ["Capabilities", state.capabilities.length],
            ["Deployments", state.deploymentProfiles.length],
            ["Hardware", state.hardwareContracts.length],
            ["Routing", state.routingContracts.length],
            ["Permissions", state.permissions.length],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                {label}
              </dt>
              <dd className="mt-1 text-2xl font-black">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </PrivateAiShell>
  );
}
