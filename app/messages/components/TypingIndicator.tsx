export default function TypingIndicator() {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2 backdrop-blur"
      aria-label="Typing"
    >
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-300"
          style={{ animationDelay: `${index * 120}ms` }}
        />
      ))}
    </div>
  );
}
