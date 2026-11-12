import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { heroChapters } from "./data";
import { cn } from "@/lib/utils";

import { A, glassDark } from "./parts";

/** The Casa Bianca house: a wide photo for landscape screens, a tall one for phones. */
function House({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <picture>
      <source media="(max-aspect-ratio: 1/1)" srcSet="/media/hero-house-tall.jpg" />
      <img src="/media/hero-house-wide.jpg" alt="" fetchPriority="high" decoding="async" className={className} style={style} />
    </picture>
  );
}

function fade(p: number, from: number, to: number) {
  const f = 0.05;
  if (p < from - f || p > to + f) return 0;
  if (p < from) return (p - (from - f)) / f;
  if (p > to) return (to + f - p) / f;
  return 1;
}

function Title({ p = 0 }: { p?: number }) {
  const o = Math.max(0, 1 - p / 0.17);
  return (
    <div className="absolute inset-x-0 top-[22vh] px-5 text-center text-white sm:px-8" style={{ opacity: o, visibility: o === 0 ? "hidden" : "visible" }}>
      <h1 className="relative mx-auto mt-10 w-fit text-[clamp(2.4rem,7.4vw,6.2rem)] leading-[1.02] tracking-[0.02em] uppercase">
        <span className="absolute right-0 bottom-full mb-[0.15em] text-[max(11px,0.17em)] tracking-[0.04em] opacity-90">Hotel partnership with</span>
        <span className="block whitespace-nowrap">
          <span className="font-script inline-block pr-[0.07em] align-[-0.22em] text-[2.3em] leading-[0] tracking-normal normal-case">M</span>
          eredith
        </span>
        <span className="block text-right">&amp; Bernie</span>
      </h1>
      <p className="mx-auto mt-8 max-w-xl text-base leading-relaxed opacity-90 sm:text-lg">Luxury travel, fashion and couples content. Every shoot is styled, shot and edited by us.</p>
    </div>
  );
}

function Chapter({ p, from, to, value, label, place }: { p: number } & (typeof heroChapters)[number]) {
  const o = fade(p, from, to);
  const y = (p - (from + to) / 2) * -80;
  return (
    <div className="absolute inset-x-0 bottom-[16vh] px-5 text-white sm:px-8 lg:px-12" style={{ opacity: o, transform: `translateY(${y}px)`, visibility: o === 0 ? "hidden" : "visible" }} aria-hidden={o === 0}>
      {place ? <p className={cn(glassDark, "font-label inline-block rounded-full px-3.5 py-1.5 text-[11px] tracking-[0.24em] uppercase")}>{place}</p> : null}
      <p className="mt-2 text-[clamp(4rem,13vw,9rem)] leading-none tracking-[-0.01em] tabular-nums">{value}</p>
      <p className="font-label mt-2 text-sm tracking-[0.12em] uppercase opacity-90 sm:text-base">{label}</p>
    </div>
  );
}

function ScrubHero() {
  const wrapRef = useRef<HTMLElement>(null);
  const [p, setP] = useState(0);
  const [hint, setHint] = useState(true);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    let cur = 0,
      lastP = -1,
      raf = 0,
      last = 0;
    const tick = (now: number) => {
      const dt = Math.min(64, last ? now - last : 16);
      last = now;
      const span = wrap.offsetHeight - innerHeight;
      const target = span > 0 ? Math.min(1, Math.max(0, -wrap.getBoundingClientRect().top / span)) : 0;
      const gap = Math.abs(target - cur);
      // time-based smoothing: quick catch-up after a flick, silky when scrolling slowly
      const tau = 30 + 110 * Math.exp(-gap / 0.01);
      cur += (target - cur) * (1 - Math.exp(-dt / tau));
      if (gap < 0.0008) cur = target;
      if (Math.abs(cur - lastP) > 0.001) {
        lastP = cur;
        setP(cur);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const hide = () => setHint(false);
    const o: AddEventListenerOptions = { passive: true, once: true };
    addEventListener("wheel", hide, o);
    addEventListener("touchstart", hide, o);
    addEventListener("keydown", hide, o);
    addEventListener("scroll", hide, o);
    return () => {
      removeEventListener("wheel", hide);
      removeEventListener("touchstart", hide);
      removeEventListener("keydown", hide);
      removeEventListener("scroll", hide);
    };
  }, []);

  return (
    <section ref={wrapRef} id="top" className="relative h-[320vh] bg-black" aria-label="Meredith and Bernie" data-scrub-progress={p.toFixed(3)}>
      <div className="sticky top-0 h-dvh overflow-hidden">
        {/* a slow zoom as you scroll, so the still photo doesn't feel flat */}
        <House className="absolute inset-0 h-full w-full object-cover will-change-transform" style={{ transform: `scale(${1 + p * 0.1})` }} />
        <div className="absolute inset-0 bg-black" style={{ opacity: 0.22 + p * 0.12 }} />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent" />
        <Title p={p} />
        {heroChapters.map((c) => (
          <Chapter key={c.value} p={p} {...c} />
        ))}
        <motion.div animate={{ opacity: hint ? 1 : 0 }} transition={{ duration: 0.5 }} className="font-label absolute inset-x-0 bottom-8 mx-auto flex w-fit flex-col items-center gap-2 text-[11px] tracking-[0.28em] text-white/85 uppercase" style={{ pointerEvents: "none" }}>
          Scroll
          <ArrowDown className="size-4 animate-bounce" strokeWidth={1.5} />
        </motion.div>
      </div>
    </section>
  );
}

/** Reduced motion: a still with the three numbers. */
function StaticHero() {
  return (
    <section id="top" className="relative min-h-dvh bg-black" aria-label="Meredith and Bernie">
      <House className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-black/35" />
      <Title />
      <div className="relative grid min-h-dvh content-end gap-8 px-5 pt-32 pb-14 text-white sm:grid-cols-3 sm:px-8 lg:px-12">
        {heroChapters.map((c) => (
          <div key={c.value}>
            <p className="text-6xl leading-none font-extralight">{c.value}</p>
            <p className="font-label mt-2 text-sm tracking-[0.12em] uppercase">{c.label}</p>
          </div>
        ))}
      </div>
      <A to="/#inquire" className="sr-only">
        Work with us
      </A>
    </section>
  );
}

export function Hero() {
  const reduced = useReducedMotion();
  return reduced ? <StaticHero /> : <ScrubHero />;
}
