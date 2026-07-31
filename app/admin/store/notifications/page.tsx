import { redirect } from "next/navigation";
import {
  ADMIN_STORE_UNAUTHORIZED,
  assertPlatformAdminDb,
} from "../../../../lib/store/adminAuth";
import {
  EXTERNAL_CHANNEL_CONTRACT,
  buildAdminNotificationDiagnostics,
} from "../../../../lib/store/commerceNotifications";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import { APP_ROUTES } from "../../../lib/nav";
import AdminStoreShell, { StatusChip } from "../AdminStoreShell";

export const metadata = {
  title: "Store notifications | UMTUBA Admin",
};

const PATH = APP_ROUTES.adminStoreNotifications;

export default async function AdminStoreNotificationsPage() {
  const user = await getServerUser();
  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${encodeURIComponent(PATH)}`);
  }
  const supabase = await createClient();
  const isAdmin = await assertPlatformAdminDb(supabase);
  if (!isAdmin) {
    redirect(
      `${APP_ROUTES.home}?error=${encodeURIComponent(ADMIN_STORE_UNAUTHORIZED)}`
    );
  }

  const diagnostics = buildAdminNotificationDiagnostics(40);

  return (
    <AdminStoreShell title="Commerce notifications">
      <section className="space-y-4">
        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h1 className="text-2xl font-black tracking-tight">
            Transactional notifications
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Process diagnostics for commerce notification events and intents.
            External email/SMS/push remain disabled. No sends from this page.
          </p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
            <Stat label="Events" value={String(diagnostics.events.length)} />
            <Stat label="Intents" value={String(diagnostics.intents.length)} />
            <Stat
              label="Templates"
              value={String(diagnostics.templates.length)}
            />
            <Stat label="Email/SMS/Push" value="disabled" />
          </dl>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
          <h2 className="text-lg font-black">Channel contracts</h2>
          <ul className="mt-3 space-y-1 text-sm text-white/70">
            {Object.entries(EXTERNAL_CHANNEL_CONTRACT).map(([channel, meta]) => (
              <li key={channel}>
                <code className="text-cyan-200/80">{channel}</code> —{" "}
                {meta.enabled ? "enabled" : "disabled"} ({meta.reason})
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
          <h2 className="text-lg font-black">Recent events</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {diagnostics.events.length === 0 ? (
              <li className="text-white/45">No in-process events yet.</li>
            ) : (
              diagnostics.events
                .slice()
                .reverse()
                .map((event) => (
                  <li
                    key={event.eventId}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white">
                        {event.eventType}
                      </span>
                      <StatusChip status="event" />
                    </div>
                    <p className="mt-1 text-xs text-white/45">
                      {event.eventId} · order {event.orderId ?? "—"} · store{" "}
                      {event.storeId ?? "—"} · {event.idempotencyKey}
                    </p>
                  </li>
                ))
            )}
          </ul>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
          <h2 className="text-lg font-black">Generated intents</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {diagnostics.intents.length === 0 ? (
              <li className="text-white/45">No intents yet.</li>
            ) : (
              diagnostics.intents
                .slice()
                .reverse()
                .map((intent) => (
                  <li
                    key={intent.intentId}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white">
                        {intent.recipientRole} → {intent.channel}
                      </span>
                      <StatusChip status={intent.status} />
                    </div>
                    <p className="mt-1 text-xs text-white/45">
                      {intent.templateId} · {intent.dedupeKey}
                      {intent.deepLink ? ` · ${intent.deepLink}` : ""}
                      {intent.suppressedReason
                        ? ` · ${intent.suppressedReason}`
                        : ""}
                    </p>
                  </li>
                ))
            )}
          </ul>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
          <h2 className="text-lg font-black">Templates</h2>
          <ul className="mt-3 grid gap-2 text-xs text-white/60 sm:grid-cols-2">
            {diagnostics.templates.map((t) => (
              <li key={t.templateId}>
                <code>{t.templateId}</code> · {t.eventType} · {t.recipientRole}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </AdminStoreShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-white/40">
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-white/90">{value}</dd>
    </div>
  );
}
