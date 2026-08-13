"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export type HeroSlide = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  imageUrl?: string | null;
  ctaLabel?: string;
};

type HeroCarouselProps = {
  slides: HeroSlide[];
};

export default function HeroCarousel({ slides }: HeroCarouselProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const safeSlides = slides.length > 0 ? slides : [];

  const go = useCallback(
    (next: number) => {
      if (safeSlides.length === 0) return;
      const len = safeSlides.length;
      setIndex(((next % len) + len) % len);
    },
    [safeSlides.length]
  );

  useEffect(() => {
    if (safeSlides.length <= 1 || paused) return;
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % safeSlides.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, [safeSlides.length, paused]);

  if (safeSlides.length === 0) return null;

  const slide = safeSlides[index] ?? safeSlides[0];

  return (
    <section
      className="relative mt-6 overflow-hidden rounded-[var(--sf-radius-lg)] border border-[var(--sf-line)] bg-[var(--sf-surface)]"
      aria-roledescription="carousel"
      aria-label="Featured storefront"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <div className="relative min-h-[280px] md:min-h-[420px] lg:min-h-[480px]">
        {slide.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={slide.id}
            src={slide.imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            aria-hidden
            style={{
              backgroundImage:
                "linear-gradient(135deg, #12121a 0%, #0a0a10 48%, #1a1712 100%), radial-gradient(circle at 78% 22%, rgba(214,196,161,0.22), transparent 42%)",
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

        <div className="relative z-10 flex min-h-[280px] flex-col justify-end p-6 md:min-h-[420px] md:p-10 lg:min-h-[480px] lg:p-14">
          <p className="sf-eyebrow">UMTUBA Store</p>
          <h1 className="sf-display mt-3 max-w-2xl text-3xl font-semibold leading-[1.05] break-words md:text-5xl lg:text-6xl">
            {slide.title}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/70 md:text-base">
            {slide.subtitle}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href={slide.href} className="sf-btn sf-btn-primary">
              {slide.ctaLabel ?? "Explore"}
            </Link>
            <Link href="/store/search" className="sf-btn sf-btn-secondary text-white">
              Browse catalog
            </Link>
          </div>
        </div>
      </div>

      {safeSlides.length > 1 ? (
        <>
          <button
            type="button"
            className="sf-gallery-nav watch-focus-ring left-3 md:left-5"
            aria-label="Previous featured slide"
            onClick={() => go(index - 1)}
          >
            ‹
          </button>
          <button
            type="button"
            className="sf-gallery-nav watch-focus-ring right-3 md:right-5"
            aria-label="Next featured slide"
            onClick={() => go(index + 1)}
          >
            ›
          </button>
          <div
            className="absolute bottom-4 right-4 z-20 flex items-center gap-2 md:bottom-6 md:right-6"
            role="tablist"
            aria-label="Featured slides"
          >
            {safeSlides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Show slide ${i + 1}: ${s.title}`}
                onClick={() => setIndex(i)}
                className={`watch-focus-ring h-2.5 rounded-full transition-all ${
                  i === index
                    ? "w-7 bg-[var(--sf-accent-strong)]"
                    : "w-2.5 bg-white/35 hover:bg-white/55"
                }`}
              />
            ))}
            <button
              type="button"
              className="watch-focus-ring ml-1 rounded-full border border-white/20 bg-black/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/80"
              aria-pressed={paused}
              onClick={() => setPaused((v) => !v)}
            >
              {paused ? "Play" : "Pause"}
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
