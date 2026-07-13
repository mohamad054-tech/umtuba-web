"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type HeroCTAButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
  children: ReactNode;
};

export default function HeroCTAButton({
  variant = "primary",
  children,
  className = "",
  ...props
}: HeroCTAButtonProps) {
  const base =
    "landing-hero-cta group relative inline-flex items-center justify-center overflow-hidden rounded-full px-8 py-4 text-sm font-semibold tracking-wide transition-all duration-300 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80";

  const variants = {
    primary:
      "landing-hero-cta--primary landing-hero-cta--pulse bg-white text-[#050510] shadow-[0_0_0_1px_rgba(255,255,255,0.08)] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(59,130,246,0.28)] active:translate-y-0 active:scale-[0.98]",
    secondary:
      "landing-hero-cta--secondary border border-white/20 bg-white/[0.06] text-white backdrop-blur-xl hover:-translate-y-0.5 hover:border-white/35 hover:bg-white/[0.12] hover:shadow-[0_12px_36px_rgba(37,99,235,0.18)] active:translate-y-0 active:scale-[0.98]",
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      <span className="relative z-10">{children}</span>
      {variant === "primary" ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(circle at 50% 120%, rgba(59,130,246,0.22), transparent 55%)",
          }}
        />
      ) : null}
    </button>
  );
}
