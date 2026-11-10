import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { brand, socials } from "./data";

/* ---------- tiny router (history API; Netlify serves index.html for every path) ---------- */
export function usePath() {
  const [path, setPath] = useState(location.pathname + location.hash);
  useEffect(() => {
    const on = () => setPath(location.pathname + location.hash);
    addEventListener("popstate", on);
    return () => removeEventListener("popstate", on);
  }, []);
  return path;
}
export function go(to: string) {
  const [p, h] = to.split("#");
  const keep = location.search;
  if (p && p !== location.pathname) {
    history.pushState(null, "", p + keep + (h ? "#" + h : ""));
    dispatchEvent(new PopStateEvent("popstate"));
    if (!h) scrollTo({ top: 0 });
  } else if (h) history.replaceState(null, "", location.pathname + keep + "#" + h);
  if (h) setTimeout(() => document.getElementById(h)?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
}
export function A({ to, className, children, ...rest }: { to: string; className?: string; children: ReactNode; "aria-label"?: string }) {
  return (
    <a
      href={to}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        go(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

export const media = (name: string) => `/media/${name}.jpg`;

export function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-4", className)} fill="currentColor" aria-hidden>
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48Z" />
    </svg>
  );
}
export function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-4", className)} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

const NAV = [
  { to: "/#about", label: "About" },
  { to: "/#reach", label: "Reach" },
  { to: "/#partnerships", label: "Partnerships" },
  { to: "/#couples", label: "Couples content" },
  { to: "/#package", label: "The package" },
];

/** Frosted-glass pills: clear over the video, light glass over the linen sections. */
export const glassDark = "border border-white/25 bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_10px_30px_-12px_rgba(0,0,0,0.45)] backdrop-blur-xl backdrop-saturate-150";
export const glassLight = "border border-white/70 bg-[#fbf8f4]/55 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_32px_-16px_rgba(31,28,25,0.4)] backdrop-blur-xl backdrop-saturate-150";

export function Header({ overHero }: { overHero: boolean }) {
  const [solid, setSolid] = useState(!overHero);
  const [active, setActive] = useState("");
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => {
      const hero = document.getElementById("top");
      setSolid(!overHero || scrollY > (hero ? hero.offsetHeight - 80 : innerHeight * 0.6));
      let cur = "";
      for (const n of NAV) {
        const el = document.getElementById(n.to.split("#")[1]);
        if (el && el.getBoundingClientRect().top < innerHeight * 0.4) cur = n.to;
      }
      setActive(cur);
    };
    on();
    addEventListener("scroll", on, { passive: true });
    return () => removeEventListener("scroll", on);
  }, [overHero]);
  const glass = solid ? glassLight : glassDark;
  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-8 lg:px-12">
        <A to="/" className={cn(glass, "rounded-full px-5 py-2.5 text-[13px] tracking-[0.14em] whitespace-nowrap uppercase transition-colors duration-500 sm:text-[14px] sm:tracking-[0.18em]")} aria-label={`${brand.name}, home`}>
          Meredith &amp; Bernie
        </A>
        <nav aria-label="Primary" className={cn(glass, "font-label hidden items-center gap-1 rounded-full p-1 text-[11px] tracking-[0.2em] uppercase transition-colors duration-500 lg:flex")}>
          {NAV.map((n) => (
            <A
              key={n.to}
              to={n.to}
              className={cn(
                "rounded-full px-4 py-2 transition-colors",
                active === n.to ? (solid ? "bg-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_8px_-2px_rgba(31,28,25,0.25)]" : "bg-white/25") : "opacity-80 hover:opacity-100",
              )}
            >
              {n.label}
            </A>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <A to="/#inquire" className={cn("font-label rounded-full px-4 py-2.5 text-[11px] tracking-[0.2em] whitespace-nowrap uppercase transition-colors duration-500", solid ? "bg-foreground text-background hover:bg-foreground/85 shadow-[0_10px_24px_-12px_rgba(31,28,25,0.6)]" : "bg-white text-black hover:bg-white/90")}>
            <span className="sm:hidden">Inquire</span>
            <span className="hidden sm:inline">Work with us</span>
          </A>
          <button type="button" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)} className={cn(glass, "grid size-10 place-items-center rounded-full transition-colors duration-500 lg:hidden")}>
            <span className="grid gap-1">
              <span className={cn("block h-px w-4 bg-current transition-transform", open && "translate-y-[2.5px] rotate-45")} />
              <span className={cn("block h-px w-4 bg-current transition-transform", open && "-translate-y-[2.5px] -rotate-45")} />
            </span>
          </button>
        </div>
      </div>
      {open ? (
        <nav aria-label="Menu" className={cn(glassLight, "font-label mx-4 mt-2 grid rounded-3xl p-2 text-[12px] tracking-[0.2em] uppercase sm:mx-8 lg:hidden")}>
          {NAV.map((n) => (
            <A key={n.to} to={n.to} className={cn("rounded-2xl px-4 py-3", active === n.to && "bg-white/80")}>
              <span onClick={() => setOpen(false)}>{n.label}</span>
            </A>
          ))}
        </nav>
      ) : null}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="bg-foreground text-background/80">
      <div className="grid gap-10 px-5 py-14 sm:px-8 md:grid-cols-3 lg:px-12">
        <div>
          <p className="text-background text-[15px] tracking-[0.2em] uppercase">Meredith &amp; Bernie</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed">Luxury travel, fashion and couples content from NYC. Styled, shot and edited by us.</p>
        </div>
        <div className="grid gap-2 text-sm">
          <p className="font-label text-background/50 text-[11px] tracking-[0.22em] uppercase">Follow</p>
          {socials.map((s) => (
            <a key={s.label + s.handle} href={s.href} target="_blank" rel="noreferrer" className="hover:text-background inline-flex items-center gap-2">
              {s.label === "TikTok" ? <TikTokIcon /> : <InstagramIcon />} {s.handle}
            </a>
          ))}
        </div>
        <div className="grid content-start gap-2 text-sm">
          <p className="font-label text-background/50 text-[11px] tracking-[0.22em] uppercase">Partnerships</p>
          <a href={`mailto:${brand.email}`} className="hover:text-background break-all">
            {brand.email}
          </a>
          <a href={brand.mediaKit} className="hover:text-background" target="_blank" rel="noreferrer">
            Media kit (PDF)
          </a>
        </div>
      </div>
      <p className="text-background/40 border-background/10 border-t px-5 py-5 text-xs sm:px-8 lg:px-12">© {new Date().getFullYear()} Meredith &amp; Bernie Brice. All photos and video are our own work.</p>
    </footer>
  );
}

/** Fade-up on scroll. Respects reduced motion. */
export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div className={className} initial={reduced ? false : { opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("font-label text-ink text-[11px] tracking-[0.28em] uppercase", className)}>{children}</p>;
}

/** The media kit's headline: a Pinyon Script first letter, then Playfair Display capitals. */
export function Display({ children, as: Tag = "h2", className }: { children: string; as?: "h1" | "h2" | "h3"; className?: string }) {
  return (
    <Tag className={cn("text-[clamp(2.1rem,5vw,4rem)] leading-[1.15] font-normal tracking-[0.02em] text-balance uppercase", className)}>
      <span className="font-script relative inline-block pr-[0.24em] align-[-0.2em] text-[2.15em] leading-[0] tracking-normal normal-case">{children.charAt(0)}</span>
      <span>{children.slice(1)}</span>
    </Tag>
  );
}

export function Section({ id, children, className }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={cn("scroll-mt-16 px-5 py-20 sm:px-8 lg:px-12 lg:py-32", className)}>
      {children}
    </section>
  );
}

export function Chip({ children, tone = "muted", className }: { children: ReactNode; tone?: "muted" | "primary" | "ok" | "warn"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "primary" ? "bg-foreground text-background" : tone === "ok" ? "bg-emerald-600/12 text-emerald-800" : tone === "warn" ? "bg-amber-500/15 text-amber-900" : "bg-muted text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
