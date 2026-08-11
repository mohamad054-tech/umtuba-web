import { getPrivateAiService } from "../../../../lib/privateAi";
import PrivateAiShell from "../PrivateAiShell";
import { requirePrivateAiAdmin } from "../requirePrivateAiAdmin";

export const metadata = { title: "Hardware Contracts | UMTUBA" };

export default async function PrivateAiHardwarePage() {
  await requirePrivateAiAdmin();
  const hardware = getPrivateAiService().listHardware();

  return (
    <PrivateAiShell title="Hardware">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h2 className="text-lg font-black">Hardware contracts</h2>
        <p className="mt-2 text-sm text-white/50">
          Future runtime requirements — no provisioning in V1.
        </p>
        <ul className="mt-4 divide-y divide-white/10">
          {hardware.map((h) => (
            <li key={h.id} className="py-3">
              <p className="font-mono text-xs text-blue-100">{h.id}</p>
              <p className="mt-1 font-semibold">{h.label}</p>
              <p className="mt-2 text-[11px] text-white/45">
                CPU ≥{h.cpuCoresMin} · RAM ≥{h.ramGbMin}GB · storage ≥
                {h.storageGbMin}GB · GPU {h.gpuRequired ? h.gpuClass : "no"} ·
                VRAM {h.vramGbMin ?? "—"} · container {h.containerProfile}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </PrivateAiShell>
  );
}
