import { createDigitalAssetLab } from "../../../../lib/sandbox/digitalAsset/lab";
import { adminSandboxView } from "../../../../lib/sandbox/digitalAsset/views";

export default function DigitalAssetAdminPage() {
  const admin = adminSandboxView(createDigitalAssetLab());

  return (
    <section>
      <h1 className="text-3xl font-black tracking-tight">Admin console</h1>
      <p className="mt-2 text-sm text-white/60">{admin.subtitle}</p>
      <p className="mt-4 text-sm">
        Token {admin.token.name} / {admin.token.symbol} · paused={" "}
        {String(admin.token.paused)}
      </p>
      <p className="mt-2 text-xs text-white/40">{admin.legal}</p>
      <h2 className="mt-8 text-lg font-black">Roles</h2>
      <pre className="mt-2 overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-xs">
        {JSON.stringify(admin.roles, null, 2)}
      </pre>
      <h2 className="mt-8 text-lg font-black">Audit trail</h2>
      <pre className="mt-2 overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-xs">
        {JSON.stringify(admin.audit.slice(0, 12), null, 2)}
      </pre>
    </section>
  );
}
