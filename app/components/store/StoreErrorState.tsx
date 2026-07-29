type StoreErrorStateProps = {
  message: string;
};

export default function StoreErrorState({ message }: StoreErrorStateProps) {
  return (
    <div
      role="alert"
      className="rounded-[var(--sf-radius)] border border-[rgba(240,168,168,0.35)] bg-[rgba(240,168,168,0.08)] px-5 py-8 text-sm text-[var(--sf-danger)]"
    >
      {message}
    </div>
  );
}
