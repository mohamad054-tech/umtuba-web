import { DEMO_USER_A_ID } from "../../../../lib/sandbox/digitalAsset/constants";
import { createDigitalAssetLab } from "../../../../lib/sandbox/digitalAsset/lab";
import { userSandboxView } from "../../../../lib/sandbox/digitalAsset/views";

export default function DigitalAssetHistoryPage() {
  const view = userSandboxView(createDigitalAssetLab(), DEMO_USER_A_ID);

  return (
    <section>
      <h1 className="text-3xl font-black tracking-tight">History</h1>
      <p className="mt-2 text-sm text-white/60">{view.banner}</p>
      <pre className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-xs">
        {JSON.stringify(
          { points: view.history, conversions: view.conversions },
          null,
          2
        )}
      </pre>
    </section>
  );
}
