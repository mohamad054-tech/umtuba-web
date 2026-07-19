import AdminStoreShell from "./AdminStoreShell";

export default function AdminStoreLoading() {
  return (
    <AdminStoreShell title="Store admin">
      <div
        className="animate-pulse space-y-4"
        role="status"
        aria-label="Loading store moderation"
      >
        <div className="h-28 rounded-[28px] bg-white/5" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-24 rounded-2xl bg-white/5" />
          <div className="h-24 rounded-2xl bg-white/5" />
        </div>
      </div>
    </AdminStoreShell>
  );
}
