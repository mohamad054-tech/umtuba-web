"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type HeroSlide = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  tone: "violet" | "indigo" | "fuchsia";
};

const TONE_CLASS: Record<HeroSlide["tone"], string> = {
  violet: "from-violet-700/70 via-[#12081f] to-[#050510]",
  indigo: "from-indigo-700/70 via-[#0a1024] to-[#050510]",
  fuchsia: "from-fuchsia-700/60 via-[#1a0820] to-[#050510]",
};

type HeroCarouselProps = {
  slides: HeroSlide[];
};

export default function HeroCarousel({ slides }: HeroCarouselProps) {
  const [index, setIndex] = useState(0);
  const safeSlides = slides.length > 0 ? slides : [];

  useEffect(() => {
    if (safeSlides.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % safeSlides.length);
    }, 5500);
    return () => window.clearInterval(id);
  }, [safeSlides.length]);

  if (safeSlides.length === 0) return null;

  const slide = safeSlides[index] ?? safeSlides[0];

  return (
    <section
      className="relative mt-6 overflow-hidden rounded-[28px] border border-violet-400/20"
      aria-roledescription="carousel"
      aria-label="Featured store banners"
    >
      <div
        className={`relative min-h-[240px] bg-gradient-to-br p-6 transition-all duration-700 md:min-h-[320px] md:p-10 ${TONE_CLASS[slide.tone]}`}
      >
        <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden>
          <div className="absolute -right-10 top-8 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-violet-400/20 blur-2xl" />
        </div>

        <div className="relative z-10 max-w-xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-violet-200/80">
            UMTUBA Store
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            {slide.title}
          </h1>
          <p className="mt-3 text-sm text-white/65 md:text-base">{slide.subtitle}</p>
          <Link
            href={slide.href}
            className="watch-focus-ring mt-6 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-black text-black transition hover:bg-violet-100"
          >
            Explore
          </Link>
        </div>
      </div>

      {safeSlides.length > 1 ? (
        <div className="absolute bottom-4 right-4 flex gap-2" role="tablist" aria-label="Banner slides">
          {safeSlides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Show slide ${i + 1}: ${s.title}`}
              onClick={() => setIndex(i)}
              className={`watch-focus-ring h-2.5 w-2.5 rounded-full transition ${
                i === index ? "bg-white" : "bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
