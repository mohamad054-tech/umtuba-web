type LearningAlertProps = {
  tone: "success" | "error" | "info" | "warning";
  children: React.ReactNode;
  role?: "status" | "alert";
};

const TONE: Record<LearningAlertProps["tone"], string> = {
  success:
    "border-emerald-400/25 bg-emerald-500/10 text-emerald-50",
  error: "border-rose-400/25 bg-rose-500/10 text-rose-100",
  info: "border-sky-400/25 bg-sky-500/10 text-sky-50",
  warning: "border-amber-400/25 bg-amber-500/10 text-amber-50",
};

export default function LearningAlert({
  tone,
  children,
  role,
}: LearningAlertProps) {
  const resolvedRole = role ?? (tone === "error" ? "alert" : "status");
  return (
    <p
      role={resolvedRole}
      className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${TONE[tone]}`}
    >
      {children}
    </p>
  );
}
