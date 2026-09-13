import { createDigitalAssetLab } from "../../../../lib/sandbox/digitalAsset/lab";
import { adminSandboxView } from "../../../../lib/sandbox/digitalAsset/views";

export default function DigitalAssetTreasuryPage() {
  const admin = adminSandboxView(createDigitalAssetLab());

  return (
    <section>
      <h1 className="text-3xl font-black tracking-tight">Treasury sandbox</h1>
      <p className="mt-2 text-sm text-white/60">{admin.treasuryNotice}</p>
      <dl className="mt-6 grid gap-3">
        <Row label="Address" value={admin.treasury.treasuryAddress} />
        <Row label="Balance" value={admin.treasury.tokenBalanceDisplay} />
        <Row label="TOKEN_SUPPLY" value={admin.treasury.supplyPolicy} />
        <Row label="TOKEN_PRICE" value={admin.treasury.pricePolicy} />
        <Row
          label="CONVERSION_RATE"
          value={admin.treasury.conversionRatePolicy}
        />
      </dl>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-white/40">
        {label}
      </dt>
      <dd className="mt-1 break-all font-mono text-sm">{value}</dd>
    </div>
  );
}
