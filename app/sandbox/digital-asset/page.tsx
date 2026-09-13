import Link from "next/link";
import { CONVERSION_UNAVAILABLE_COPY } from "../../../lib/sandbox/digitalAsset/copy";
import { createDigitalAssetLab } from "../../../lib/sandbox/digitalAsset/lab";

export default function DigitalAssetSandboxHubPage() {
  const lab = createDigitalAssetLab();
  const firewall = lab.productFirewall();

  return (
    <section>
      <h1 className="text-3xl font-black tracking-tight">
        Private digital-asset lab
      </h1>
      <p className="mt-2 text-sm text-white/60">
        {CONVERSION_UNAVAILABLE_COPY}
      </p>
      <dl className="mt-6 grid gap-3 sm:grid-cols-2">
        {Object.entries(firewall).map(([key, value]) => (
          <div
            key={key}
            className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
          >
            <dt className="text-[10px] font-bold uppercase tracking-wider text-white/40">
              {key}
            </dt>
            <dd className="mt-1 font-mono text-sm">{String(value)}</dd>
          </div>
        ))}
      </dl>
      <nav className="mt-8 flex flex-wrap gap-3 text-sm font-bold">
        <Link className="underline underline-offset-2" href="/sandbox/digital-asset/user">
          User preview
        </Link>
        <Link className="underline underline-offset-2" href="/sandbox/digital-asset/admin">
          Admin console
        </Link>
        <Link className="underline underline-offset-2" href="/sandbox/digital-asset/history">
          History
        </Link>
        <Link className="underline underline-offset-2" href="/sandbox/digital-asset/treasury">
          Treasury
        </Link>
      </nav>
    </section>
  );
}
