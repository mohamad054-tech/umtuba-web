export type ProductKind = "bag" | "phone" | "cup" | "book" | "shoe" | "lamp" | "watch" | "plant";

export default function ProductMark({ kind }: { kind: string }) {
  return (
    <svg className="um-product-mark" viewBox="0 0 72 72" aria-hidden="true">
      <rect width="72" height="72" rx="12" fill="#12182f" />
      {kind === "bag" ? (
        <>
          <path d="M24 28 H48 L52 58 H20 Z" fill="#c4a574" />
          <path d="M28 28 C28 18 44 18 44 28" fill="none" stroke="#f0a93b" strokeWidth="3" />
        </>
      ) : null}
      {kind === "phone" ? (
        <>
          <rect x="22" y="12" width="28" height="48" rx="6" fill="#7ed9b8" />
          <circle cx="36" cy="52" r="2" fill="#12182f" />
        </>
      ) : null}
      {kind === "cup" ? (
        <>
          <path d="M20 22 H46 L42 54 H24 Z" fill="#d7ece4" />
          <path d="M46 28 H54 A8 8 0 0 1 46 42" fill="none" stroke="#f0a93b" strokeWidth="3" />
        </>
      ) : null}
      {kind === "book" ? (
        <>
          <path d="M16 16 H38 L52 24 V56 H16 Z" fill="#e7d7a1" />
          <path d="M38 16 V24 H52" fill="none" stroke="#9a6e22" strokeWidth="2" />
        </>
      ) : null}
      {kind === "shoe" ? (
        <path d="M14 40 H34 L40 32 H58 L62 46 H14 Z" fill="#d46a5e" />
      ) : null}
      {kind === "lamp" ? (
        <>
          <path d="M24 18 H48 L42 36 H30 Z" fill="#f0a93b" />
          <rect x="34" y="36" width="4" height="16" fill="#eef1fb" />
          <rect x="26" y="52" width="20" height="4" fill="#eef1fb" />
        </>
      ) : null}
      {kind === "watch" ? (
        <>
          <rect x="30" y="10" width="12" height="10" rx="2" fill="#9aa4c7" />
          <circle cx="36" cy="38" r="16" fill="#eef1fb" />
          <circle cx="36" cy="38" r="12" fill="none" stroke="#1c2748" strokeWidth="2" />
          <path d="M36 38 L36 30 L42 40" fill="none" stroke="#1c2748" strokeWidth="2" />
          <rect x="30" y="52" width="12" height="10" rx="2" fill="#9aa4c7" />
        </>
      ) : null}
      {kind === "plant" ? (
        <>
          <path d="M28 58 H44 L40 40 H32 Z" fill="#c4a574" />
          <circle cx="28" cy="32" r="10" fill="#2f8f62" />
          <circle cx="42" cy="28" r="12" fill="#3cbf78" />
          <circle cx="36" cy="20" r="8" fill="#7ed9b8" />
        </>
      ) : null}
    </svg>
  );
}
