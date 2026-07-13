type ConversationSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function ConversationSearch({
  value,
  onChange,
}: ConversationSearchProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/35">
        ⌕
      </span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search conversations"
        aria-label="Search conversations"
        className="w-full rounded-2xl border border-white/10 bg-black/40 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/30"
      />
    </div>
  );
}
