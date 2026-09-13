import { LEGAL_DRAFT_BANNER_ENABLED } from "../../../lib/legal/draftBanner";

export default function LegalDraftBanner({ message }: { message: string }) {
  if (!LEGAL_DRAFT_BANNER_ENABLED) {
    return null;
  }

  return (
    <aside
      className="mt-8 rounded-2xl border border-amber-300/25 bg-amber-400/[0.07] px-4 py-4 text-sm leading-6 text-amber-50/90"
      role="note"
    >
      {message}
    </aside>
  );
}
