type Props = {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
};

export default function BootstrapField({
  label,
  required,
  hint,
  children,
}: Props) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold uppercase tracking-wide text-white/45">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
      {hint ? <span className="block text-xs text-white/40">{hint}</span> : null}
    </label>
  );
}

export const bootstrapInputClass =
  "watch-focus-ring w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30";

export const bootstrapSelectClass =
  "watch-focus-ring w-full rounded-lg border border-white/15 bg-[#0b0b14] px-3 py-2 text-sm text-white";
