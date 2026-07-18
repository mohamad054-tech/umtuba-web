type StoreErrorStateProps = {
  message: string;
};

export default function StoreErrorState({ message }: StoreErrorStateProps) {
  return (
    <div
      role="alert"
      className="rounded-[24px] border border-red-400/30 bg-red-500/10 px-5 py-8 text-sm text-red-100"
    >
      {message}
    </div>
  );
}
