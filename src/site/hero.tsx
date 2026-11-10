import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { heroChapters } from "./data";
import { A } from "./parts";

/** Wide video for landscape screens, tall for phones. Chosen once on load. */
function pickVideo() {
  const tall = typeof matchMedia !== "undefined" && matchMedia("(max-aspect-ratio: 1/1)").matches;
  return tall ? { src: "/media/hero-tall.mp4", poster: "/media/hero-tall.jpg" } : { src: "/media/hero-wide.mp4", poster: "/media/hero-wide.jpg" };
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
      <p className="text-[11px] tracking-[0.34em] uppercase opacity-85">Hotel partnerships</p>
      <h1 className="display mt-5 text-[clamp(2.6rem,9vw,7.5rem)] leading-[0.95] font-light tracking-[0.08em] uppercase">
        <span className="text-[1.25em]">M</span>eredith <span className="font-extralight">&amp;</span> <span className="text-[1.25em]">B</span>ernie
      </h1>
      <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed font-light opacity-90 sm:text-lg">Luxury travel, fashion and couples content. Every shoot is styled, shot and edited by us.</p>
    </div>
  );
}

function Chapter({ p, from, to, value, label, place }: { p: number } & (typeof heroChapters)[number]) {
  const o = fade(p, from, to);
  const y = (p - (from + to) / 2) * -80;
  return (
    <div className="absolute inset-x-0 bottom-[16vh] px-5 text-white sm:px-8 lg:px-12" style={{ opacity: o, transform: `translateY(${y}px)`, visibility: o === 0 ? "hidden" : "visible" }} aria-hidden={o === 0}>
      <p className="text-[11px] tracking-[0.28em] uppercase opacity-80">{place}</p>
      <p className="mt-2 text-[clamp(4rem,14vw,10rem)] leading-none font-extralight tracking-[-0.02em] tabular-nums">{value}</p>
      <p className="mt-2 text-sm tracking-[0.12em] uppercase opacity-90 sm:text-base">{label}</p>
    </div>
  );
}

function ScrubHero() {
  const wrapRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [p, setP] = useState(0);
  const [hint, setHint] = useState(true);
  const [v] = useState(pickVideo);

  useEffect(() => {
    const wrap = wrapRef.current,
      vid = videoRef.current;
    if (!wrap || !vid) return;
    let cur = 0,
      lastSeek = -1,
      lastP = -1,
      raf = 0,
      last = 0,
      unlocked = false;
    const unlock = () => {
      // iOS shows only the poster until the video has been played once
      if (unlocked) return;
      unlocked = true;
      const pr = vid.play();
      if (pr && typeof pr.then === "function") pr.then(() => vid.pause()).catch(() => undefined);
      else vid.pause();
    };
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
      const aim = gap > 0.12 ? target : cur;
      if (Math.abs(cur - lastP) > 0.002) {
        lastP = cur;
        setP(cur);
      }
      const d = vid.duration;
      if (vid.readyState >= 2 && Number.isFinite(d) && d > 0 && !vid.seeking) {
        const t = aim * (d - 0.05);
        if (Math.abs(t - lastSeek) > 1 / 30) {
          lastSeek = t;
          vid.currentTime = t;
          unlock();
        }
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
        <video ref={videoRef} src={v.src} poster={v.poster} muted playsInline preload="auto" className="absolute inset-0 h-full w-full object-cover" aria-hidden="true" />
        <div className="absolute inset-0 bg-black" style={{ opacity: 0.22 + p * 0.12 }} />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent" />
        <Title p={p} />
        {heroChapters.map((c) => (
          <Chapter key={c.value} p={p} {...c} />
        ))}
        <motion.div animate={{ opacity: hint ? 1 : 0 }} transition={{ duration: 0.5 }} className="absolute inset-x-0 bottom-8 mx-auto flex w-fit flex-col items-center gap-2 text-[11px] tracking-[0.28em] text-white/85 uppercase" style={{ pointerEvents: "none" }}>
          Scroll
          <ArrowDown className="size-4 animate-bounce" strokeWidth={1.5} />
        </motion.div>
      </div>
    </section>
  );
}

/** Reduced motion: a still with the three numbers. */
function StaticHero() {
  const [v] = useState(pickVideo);
  return (
    <section id="top" className="relative min-h-dvh bg-black" aria-label="Meredith and Bernie">
      <img src={v.poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-black/35" />
      <Title />
      <div className="relative grid min-h-dvh content-end gap-8 px-5 pt-32 pb-14 text-white sm:grid-cols-3 sm:px-8 lg:px-12">
        {heroChapters.map((c) => (
          <div key={c.value}>
            <p className="text-6xl leading-none font-extralight">{c.value}</p>
            <p className="mt-2 text-sm tracking-[0.12em] uppercase">{c.label}</p>
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
