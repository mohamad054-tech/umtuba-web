import { DEMO_USER_A_ID } from "../../../../lib/sandbox/digitalAsset/constants";
import { createDigitalAssetLab } from "../../../../lib/sandbox/digitalAsset/lab";
import { productUserPreview } from "../../../../lib/sandbox/digitalAsset/views";

export default function DigitalAssetUserPreviewPage() {
  const preview = productUserPreview(createDigitalAssetLab(), DEMO_USER_A_ID);

  return (
    <section>
      <h1 className="text-3xl font-black tracking-tight">User preview</h1>
      <p className="mt-2 text-sm text-white/60">{preview.notice}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Available TEST UM POINTS" value={preview.wallet.pointsAvailable} />
        <Stat label="Locked" value={preview.wallet.pointsLocked} />
        <Stat label="TEST_PLACEHOLDER" value={preview.wallet.tokenBalanceDisplay} />
      </div>
      <p className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/70">
        {preview.convertLabel}
      </p>
      <p className="mt-4 text-xs text-white/40">{preview.complianceNotice}</p>
      <p className="mt-2 text-xs text-white/40">
        {preview.legalClassification}
      </p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black">{String(value)}</p>
    </div>
  );
}
