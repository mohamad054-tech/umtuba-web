import { LEGAL_DRAFT_BANNER_ENABLED } from "../../../lib/legal/company";

type LegalDraftBannerProps = {
  message: string;
};

/** Single switch: `LEGAL_DRAFT_BANNER_ENABLED` in lib/legal/company.ts. */
export default function LegalDraftBanner({ message }: LegalDraftBannerProps) {
  if (!LEGAL_DRAFT_BANNER_ENABLED) {
    return null;
  }

  return (
    <aside
      className="mt-8 rounded-2xl border border-amber-300/25 bg-amber-400/[0.07] px-4 py-4 text-sm leading-6 text-amber-50/90"
      role="status"
    >
      {message}
    </aside>
  );
}
