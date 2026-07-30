import { getPrivateAiService } from "../../../../lib/privateAi";
import PrivateAiShell from "../PrivateAiShell";
import { requirePrivateAiAdmin } from "../requirePrivateAiAdmin";

export const metadata = { title: "Deployments | UMTUBA" };

export default async function PrivateAiDeploymentsPage() {
  await requirePrivateAiAdmin();
  const profiles = getPrivateAiService().listDeployments();

  return (
    <PrivateAiShell title="Deployments">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h1 className="text-lg font-black">Deployment profiles</h1>
        <p className="mt-2 text-sm text-white/50">
          Contracts only — no infrastructure provisioning.
        </p>
        <ul className="mt-4 divide-y divide-white/10">
          {profiles.map((p) => (
            <li key={p.id} className="py-3">
              <p className="font-semibold">{p.label}</p>
              <p className="mt-1 text-sm text-white/55">{p.description}</p>
              <p className="mt-2 text-[11px] text-white/45">
                external {p.allowsExternalProviders ? "yes" : "no"} · air-gap{" "}
                {p.requiresAirGap ? "required" : "n/a"} · hardware{" "}
                {p.hardwareContractId ?? "—"}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </PrivateAiShell>
  );
}
