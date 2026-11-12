import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { brand, couples, ideas, partnerships, pkg, quietLuxury, reach, reachAsOf, socials, type Clip, type Partnership } from "./data";
import { Hero } from "./hero";
import { A, Display, Eyebrow, InstagramIcon, Reveal, Section, TikTokIcon, glassDark, media } from "./parts";
import { VISIT_URL, trackEvent, visitCode } from "./track";

const btn = "font-label inline-flex h-12 items-center gap-2 rounded-full px-7 text-[11px] tracking-[0.24em] uppercase transition-colors";

/* ───────── Shared structure: kit-style title with a hairline rule, and a centered grid ───────── */
const wrap = "mx-auto w-full max-w-7xl";
function Title({ eyebrow, children, size, className, light }: { eyebrow?: string; children: string; size?: string; className?: string; light?: boolean }) {
  return (
    <div className={className}>
      {eyebrow ? <Eyebrow className={light ? "text-background/60" : undefined}>{eyebrow}</Eyebrow> : null}
      <Display className={cn(eyebrow ? "mt-4" : "", size)}>{children}</Display>
      <div className={cn("mt-6 h-px w-full max-w-md", light ? "bg-background/25" : "bg-foreground/20")} />
    </div>
  );
}

/* ───────── About us (slide 2) ───────── */
function About() {
  return (
    <Section id="about">
      <div className={cn(wrap, "grid items-center gap-12 lg:grid-cols-12 lg:gap-16")}>
        <Reveal className="lg:col-span-5">
          <Title eyebrow="Meredith & Bernie">About us</Title>
          <p className="text-muted-foreground mt-8 max-w-xl text-lg leading-relaxed">{brand.about}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <A to="/#inquire" className={cn(btn, "bg-foreground text-background hover:bg-foreground/85")}>
              Work with us
            </A>
            <a href={brand.mediaKit} target="_blank" rel="noreferrer" className={cn(btn, "border-foreground/30 hover:border-foreground border")}>
              <Download className="size-4" strokeWidth={1.5} /> Media kit
            </a>
          </div>
        </Reveal>
        <Reveal delay={0.1} className="grid grid-cols-[1.15fr_1fr] gap-3 lg:col-span-7">
          <img src={media("about-pool")} alt="Meredith and Bernie at an infinity pool at sunset" loading="lazy" className="row-span-2 h-full w-full rounded-sm object-cover" />
          <img src={media("about-balcony")} alt="Meredith and Bernie on a balcony" loading="lazy" className="aspect-[4/5] w-full rounded-sm object-cover" />
          <img src={media("about-street")} alt="Meredith and Bernie walking in New York" loading="lazy" className="aspect-[4/5] w-full rounded-sm object-cover" />
        </Reveal>
      </div>
    </Section>
  );
}

/* ───────── Quiet luxury (slide 3) ───────── */
function QuietLuxury() {
  return (
    <Section className="bg-secondary">
      <div className={cn(wrap, "grid items-center gap-12 lg:grid-cols-12 lg:gap-16")}>
        <Reveal className="lg:col-span-6">
          <Title eyebrow="How we shoot">Quiet luxury</Title>
          <ol className="mt-10">
            {quietLuxury.map((l, i) => (
              <li key={l} className="border-foreground/15 flex gap-5 border-b py-5 first:pt-0">
                <span className="font-label text-ink w-6 shrink-0 pt-1 text-xs tabular-nums">0{i + 1}</span>
                <span className="text-lg leading-snug">{l}</span>
              </li>
            ))}
          </ol>
        </Reveal>
        <Reveal delay={0.1} className="lg:col-span-6">
          <img src={media("quiet-window")} alt="A cabin window looking out over a pond and pine trees" loading="lazy" className="aspect-[3/2] w-full rounded-sm object-cover" />
        </Reveal>
      </div>
    </Section>
  );
}

/* ───────── Our reach, by the numbers (slide 4) ───────── */
function Reach() {
  return (
    <Section id="reach">
      <div className={wrap}>
        <Reveal className="mb-12">
          <Title eyebrow={`Influencer report · ${reachAsOf}`}>Our reach, by the numbers</Title>
        </Reveal>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-6">
          {reach.map((r, i) => (
            <Reveal key={r.label} delay={i * 0.05} className={cn("bg-secondary rounded-sm p-5 sm:p-8", i < 3 ? "sm:col-span-2" : "sm:col-span-3", i === 4 && "col-span-2")}>
              <dt className="sr-only">{r.label}</dt>
              <dd className="text-[clamp(2.8rem,5vw,4.2rem)] leading-none tabular-nums">{r.value}</dd>
              <dd className="font-label text-muted-foreground mt-4 text-sm leading-snug">{r.label}</dd>
            </Reveal>
          ))}
        </dl>
        <p className="font-label text-muted-foreground mt-6 text-sm">
          {socials.filter((s) => s.label === "TikTok").map((s) => s.handle).join(" + ")} on TikTok · {socials.filter((s) => s.label === "Instagram").map((s) => s.handle).join(" + ")} on Instagram
        </p>
      </div>
    </Section>
  );
}

/* ───────── Phone-frame video (slides 7, 9, 12, 15) ───────── */
function PhoneTile({ c }: { c: Clip }) {
  const screen = (
    <span className="relative block aspect-[9/19] overflow-hidden rounded-[1.6rem] bg-black">
      <img src={media(c.img)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
      <span className="absolute top-2 left-1/2 h-4 w-14 -translate-x-1/2 rounded-full bg-black" />
      {c.href ? (
        <span className={cn(glassDark, "absolute right-3 bottom-3 grid size-8 place-items-center rounded-full")}>
          <TikTokIcon className="size-3.5" />
        </span>
      ) : null}
    </span>
  );
  const frame = <span className="block rounded-[2rem] bg-[#1d1b18] p-[6px] shadow-[0_18px_40px_-20px_rgb(31_28_25/0.6)]">{screen}</span>;
  const caption = <span className="font-label text-muted-foreground mx-auto mt-4 block max-w-[13rem] text-center text-xs leading-snug">{c.title}</span>;
  return c.href ? (
    <a href={c.href} target="_blank" rel="noreferrer" className="group block" aria-label={`${c.title} on TikTok`}>
      {frame}
      {caption}
    </a>
  ) : (
    <div className="group block">
      {frame}
      {caption}
    </div>
  );
}

/* ───────── One partnership, as in the kit: title slide, Photo, Video content ───────── */
function PartnershipChapter({ p, i, first }: { p: Partnership; i: number; first?: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  const flip = i % 2 === 1;
  const shown = p.photos.slice(0, 6);
  const title = `${p.name} partnership`;
  return (
    <section id={first ? "partnerships" : undefined} className={cn("scroll-mt-16 px-5 py-20 sm:px-8 lg:px-12 lg:py-28", i % 2 === 0 ? "bg-secondary" : "")}>
      <div className={wrap}>
        {first ? <Eyebrow className="mb-10">Past partnerships</Eyebrow> : null}
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
          <Reveal className={cn("lg:col-span-6", flip && "lg:order-2")}>
            <img src={media(p.cover)} alt={`${p.name}, ${p.place}`} loading="lazy" className="aspect-[4/5] w-full rounded-sm object-cover lg:aspect-[5/6]" />
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-6">
            <p className="font-label text-ink text-[11px] tracking-[0.24em] uppercase">
              {p.kind} · {p.place}
            </p>
            <Display className="mt-4">{title}</Display>
            <div className="bg-foreground/20 mt-6 h-px w-full max-w-md" />
            <p className="text-muted-foreground mt-6 max-w-md text-lg leading-relaxed">{p.summary}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <A to={`/partnerships/${p.slug}`} className={cn(btn, "bg-foreground text-background hover:bg-foreground/85")}>
                See the full shoot <ArrowRight className="size-4" strokeWidth={1.5} />
              </A>
              {p.gallery ? (
                <a href={p.gallery} target="_blank" rel="noreferrer" className={cn(btn, "border-foreground/30 hover:border-foreground border")}>
                  Full gallery <ArrowUpRight className="size-4" strokeWidth={1.5} />
                </a>
              ) : null}
            </div>
          </Reveal>
        </div>

        <div className="mt-20 grid gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <Title size="text-[clamp(1.7rem,3vw,2.5rem)]">Photo</Title>
            <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-3">
              {shown.map((ph, k) => (
                <button key={ph} type="button" onClick={() => setOpen(k)} className={cn("group overflow-hidden rounded-sm", k === 0 && "col-span-2 row-span-2")} aria-label={`Open photo ${k + 1} of ${p.name}`}>
                  <img src={media(ph)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04] aspect-[4/5]" />
                </button>
              ))}
            </div>
          </div>
          <div className="lg:col-span-5">
            <Title size="text-[clamp(1.7rem,3vw,2.5rem)]">Video content</Title>
            <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-5">
              {p.clips.map((c) => (
                <PhoneTile key={c.title} c={c} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {open !== null ? <Lightbox photos={shown} at={open} label={p.name} onClose={() => setOpen(null)} onMove={(d) => setOpen((o) => (o === null ? o : (o + d + shown.length) % shown.length))} /> : null}
      </AnimatePresence>
    </section>
  );
}

/* ───────── Vertical video tiles (partnership pages) ───────── */
function ClipTile({ c, className }: { c: Clip; className?: string }) {
  const inner = (
    <>
      <img src={media(c.img)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0" />
      {c.href ? (
        <span className="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-white/85 text-black backdrop-blur">
          <TikTokIcon />
        </span>
      ) : null}
      <span className="absolute inset-x-3 bottom-3 grid gap-0.5 text-[13px] leading-snug text-white">
        {c.href ? null : <span className="font-label text-[10px] tracking-[0.18em] text-white/75 uppercase">Still from the video</span>}
        {c.title}
      </span>
    </>
  );
  const cls = cn("group relative block aspect-[9/16] overflow-hidden rounded-xl bg-black/10", className);
  return c.href ? (
    <a href={c.href} target="_blank" rel="noreferrer" className={cls} aria-label={`${c.title} on TikTok`}>
      {inner}
    </a>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

/* ───────── Couples content (slide 15) ───────── */
function Couples() {
  return (
    <Section id="couples">
      <div className={wrap}>
        <Reveal className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <Title eyebrow="On our channels">Couples content</Title>
          <p className="text-muted-foreground max-w-sm">Travel, fashion and the two of us. Tap any video to watch it on TikTok.</p>
        </Reveal>
        <div className="-mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-6">
          {couples.map((c, i) => (
            <Reveal key={c.title} delay={i * 0.05} className="w-[46vw] shrink-0 snap-start sm:w-auto">
              <PhoneTile c={c} />
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ───────── Ideas to film (slide 16) ───────── */
function Ideas() {
  return (
    <Section className="bg-secondary">
      <div className={cn(wrap, "grid items-center gap-12 lg:grid-cols-12 lg:gap-16")}>
        <Reveal className="lg:col-span-7">
          <Title eyebrow="For your property">Ideas to film</Title>
          <ol className="mt-10">
            {ideas.map((it) => (
              <li key={it.n} className="border-foreground/15 grid gap-1 border-b py-5 first:pt-0 sm:grid-cols-[3rem_13rem_1fr] sm:gap-5">
                <span className="font-label text-ink pt-1 text-xs tabular-nums">{it.n}</span>
                <span className="text-lg tracking-[0.03em] uppercase">{it.title}</span>
                <span className="text-muted-foreground">{it.body}</span>
              </li>
            ))}
          </ol>
        </Reveal>
        <Reveal delay={0.1} className="lg:col-span-5">
          <img src={media("ideas-beach")} alt="A beach with rows of umbrellas from above" loading="lazy" className="aspect-[3/2] w-full rounded-sm object-cover" />
        </Reveal>
      </div>
    </Section>
  );
}

/* ───────── Scroll stopping content, ready to run (slide 17) ───────── */
function Package() {
  return (
    <Section id="package">
      <div className={wrap}>
        <Reveal className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <Title eyebrow="Collaboration" size="text-[clamp(2rem,4.2vw,3.6rem)]">Scroll stopping content, ready to run</Title>
          <p className="text-muted-foreground max-w-sm">Shot and edited by us, delivered for your channels and posted on ours. Tell us what your property needs and we'll shape the shoot around it.</p>
        </Reveal>
        <dl className="grid gap-3 md:grid-cols-3">
          {pkg.map((p, i) => (
            <Reveal key={p.what} delay={i * 0.06} className="bg-secondary rounded-sm p-7 sm:p-9">
              <dt className="text-[clamp(3.6rem,6vw,5rem)] leading-none tabular-nums">{p.count}</dt>
              <dt className="mt-5 text-xl tracking-[0.03em] uppercase">{p.what}</dt>
              <dd className="font-label text-muted-foreground mt-3 text-sm leading-relaxed">{p.detail}</dd>
            </Reveal>
          ))}
        </dl>
      </div>
    </Section>
  );
}

/* ───────── Inquiry ───────── */
type Form = { name: string; email: string; property: string; location: string; role: string; timing: string; message: string; company_website: string };
function Inquire() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [f, setF] = useState<Form>({ name: "", email: "", property: "", location: "", role: "", timing: "", message: "", company_website: "" });
  const [tried, setTried] = useState(false);
  const errors = {
    name: f.name.trim().length < 2 ? "Add your name." : "",
    email: !f.email.trim() ? "Add your email so we can reply." : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()) ? "That email doesn't look right." : "",
    property: f.property.trim().length < 2 ? "Add the property name." : "",
  };
  const ok = !errors.name && !errors.email && !errors.property;
  const show = (k: keyof typeof errors) => (tried ? errors[k] : "");
  const send = async () => {
    setState("sending");
    const code = visitCode();
    const body = new URLSearchParams({ "form-name": "inquiry", ...f, came_from: code || "direct" });
    // Two copies: Netlify Forms (emails Meredith) and the admin (inbound lead). Either one landing counts.
    const toNetlify = fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString() })
      .then((r) => r.ok)
      .catch(() => false);
    const toAdmin = f.company_website
      ? Promise.resolve(false)
      : fetch(VISIT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "inquiry", page: "inquiry", code, name: f.name, email: f.email, property: f.property, location: f.location, role: f.role, timing: f.timing, message: f.message.slice(0, 2000) }),
          keepalive: true,
        })
          .then((r) => r.ok)
          .catch(() => false);
    const [a, b] = await Promise.all([toNetlify, toAdmin]);
    setState(a || b ? "sent" : "error");
    if (a || b) trackEvent("inquiry");
  };
  const field = (k: keyof Form, label: string, opts: { type?: string; req?: boolean; ph?: string; auto?: string } = {}) => {
    const err = k in errors ? show(k as keyof typeof errors) : "";
    return (
      <label className="font-label grid gap-2 text-[11px] tracking-[0.2em] uppercase">
        <span>
          {label}
          {opts.req ? <span className="text-ink"> *</span> : null}
        </span>
        <Input
          name={k}
          type={opts.type || "text"}
          autoComplete={opts.auto}
          placeholder={opts.ph}
          value={f[k]}
          aria-invalid={!!err}
          onChange={(e) => setF({ ...f, [k]: e.target.value })}
          className="border-foreground/25 h-12 rounded-none border-0 border-b bg-transparent px-0 text-base tracking-normal normal-case shadow-none focus-visible:ring-0"
        />
        {err ? <span className="text-destructive text-xs tracking-normal normal-case">{err}</span> : null}
      </label>
    );
  };
  return (
    <section id="inquire" className="bg-secondary scroll-mt-16">
      <div className="grid lg:grid-cols-12">
        <div className="relative h-80 sm:h-[28rem] lg:order-2 lg:col-span-5 lg:h-auto">
          <img src={media("closing-balcony")} alt="Meredith and Bernie on a balcony in Italy" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        </div>
        <div className="px-5 py-20 sm:px-8 lg:col-span-7 lg:px-16 lg:py-28">
          <Reveal>
            <Title eyebrow="Hotels, resorts and stays">Let's plan your next partnership</Title>
            <p className="text-muted-foreground mt-6 max-w-lg">
              Tell us about your property and when you'd like content. We'll reply by email, or write to us directly at{" "}
              <a href={`mailto:${brand.email}`} className="text-foreground py-2.5 underline underline-offset-4">
                {brand.email}
              </a>
              .
            </p>
          </Reveal>
          {state === "sent" ? (
            <div className="mt-12 grid max-w-lg gap-3">
              <span className="bg-foreground text-background grid size-12 place-items-center rounded-full">
                <Check className="size-6" strokeWidth={1.5} />
              </span>
              <p className="text-2xl font-light tracking-[0.06em] uppercase">Thank you</p>
              <p className="text-muted-foreground font-light">We have your note and will reply by email. In the meantime, our media kit has everything in one place.</p>
              <a href={brand.mediaKit} target="_blank" rel="noreferrer" className={cn(btn, "border-foreground/30 hover:border-foreground mt-3 w-fit border")}>
                <Download className="size-4" strokeWidth={1.5} /> Media kit
              </a>
            </div>
          ) : (
            <form
              name="inquiry"
              className="mt-12 grid gap-8 sm:grid-cols-2"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                setTried(true);
                if (ok) return void send();
                const first = (["name", "email", "property"] as const).find((k) => errors[k]);
                if (first) (e.currentTarget.elements.namedItem(first) as HTMLInputElement | null)?.focus();
              }}
            >
              {field("name", "Your name", { req: true, auto: "name" })}
              {field("email", "Email", { type: "email", req: true, auto: "email" })}
              {field("property", "Property", { req: true, ph: "Hotel, resort or stay", auto: "organization" })}
              {field("location", "City and state")}
              {field("role", "Your role", { ph: "Marketing, owner, GM…", auto: "organization-title" })}
              {field("timing", "Dates or season", { ph: "Flexible is fine" })}
              <label className="font-label grid gap-2 text-[11px] tracking-[0.2em] uppercase sm:col-span-2">
                <span>What you have in mind</span>
                <Textarea
                  name="message"
                  rows={4}
                  value={f.message}
                  onChange={(e) => setF({ ...f, message: e.target.value })}
                  className="border-foreground/25 min-h-28 rounded-none border-0 border-b bg-transparent px-0 text-base tracking-normal normal-case shadow-none focus-visible:ring-0"
                />
              </label>
              <label className="hidden" aria-hidden>
                Leave blank <input name="company_website" tabIndex={-1} autoComplete="off" value={f.company_website} onChange={(e) => setF({ ...f, company_website: e.target.value })} />
              </label>
              <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
                <button type="submit" disabled={state === "sending"} className={cn(btn, "bg-foreground text-background hover:bg-foreground/85 disabled:opacity-60")}>
                  {state === "sending" ? "Sending…" : "Send inquiry"} <ArrowRight className="size-4" strokeWidth={1.5} />
                </button>
                {state === "error" ? (
                  <span className="text-destructive text-sm">
                    That didn't go through. Email us at <a href={`mailto:${brand.email}`} className="underline">{brand.email}</a>.
                  </span>
                ) : null}
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

export function Home() {
  return (
    <main>
      <Hero />
      <About />
      <QuietLuxury />
      <Reach />
      {partnerships.map((p, i) => (
        <PartnershipChapter key={p.slug} p={p} i={i} first={i === 0} />
      ))}
      <Couples />
      <Ideas />
      <Package />
      <Inquire />
    </main>
  );
}

/* ───────── Partnership page with lightbox ───────── */
function Lightbox({ photos, at, onClose, onMove, label }: { photos: string[]; at: number; onClose: () => void; onMove: (d: number) => void; label: string }) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onMove(1);
      if (e.key === "ArrowLeft") onMove(-1);
    };
    addEventListener("keydown", on);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      removeEventListener("keydown", on);
      document.body.style.overflow = prev;
    };
  }, [onClose, onMove]);
  const nav = cn(glassDark, "grid size-12 place-items-center rounded-full hover:bg-white/20");
  return (
    <motion.div role="dialog" aria-modal="true" aria-label={`${label} photos`} className="fixed inset-0 z-50 grid place-items-center bg-black/92" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <img src={media(photos[at])} alt={`${label}, photo ${at + 1} of ${photos.length}`} className="max-h-[86dvh] max-w-[92vw] object-contain" onClick={(e) => e.stopPropagation()} />
      <p className="font-label absolute top-5 left-5 text-[11px] tracking-[0.24em] text-white/70 uppercase tabular-nums">
        {at + 1} / {photos.length}
      </p>
      <button type="button" aria-label="Close" className={cn(nav, "absolute top-4 right-4")} onClick={onClose}>
        <X className="size-5" strokeWidth={1.5} />
      </button>
      <button type="button" aria-label="Previous photo" className={cn(nav, "absolute bottom-6 left-1/2 -translate-x-[calc(100%+0.5rem)] sm:top-1/2 sm:bottom-auto sm:left-4 sm:translate-x-0 sm:-translate-y-1/2")} onClick={(e) => (e.stopPropagation(), onMove(-1))}>
        <ChevronLeft className="size-5" />
      </button>
      <button type="button" aria-label="Next photo" className={cn(nav, "absolute bottom-6 left-1/2 translate-x-2 sm:top-1/2 sm:right-4 sm:bottom-auto sm:left-auto sm:translate-x-0 sm:-translate-y-1/2")} onClick={(e) => (e.stopPropagation(), onMove(1))}>
        <ChevronRight className="size-5" />
      </button>
    </motion.div>
  );
}

export function PartnershipPage({ slug }: { slug: string }) {
  const i = partnerships.findIndex((p) => p.slug === slug);
  const [open, setOpen] = useState<number | null>(null);
  if (i < 0) return <NotFound />;
  const p = partnerships[i];
  const next = partnerships[(i + 1) % partnerships.length];
  return (
    <main>
      <section className="relative h-[82dvh] min-h-[32rem] bg-black">
        <img src={media(p.cover)} alt={`${p.name}, ${p.place}`} className="absolute inset-0 h-full w-full object-cover opacity-85" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />
        <div className="absolute inset-x-0 bottom-0 px-5 pb-12 text-white sm:px-8 lg:px-12">
          <A to="/#partnerships" className={cn(glassDark, "font-label mb-8 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] tracking-[0.24em] uppercase hover:bg-white/20")}>
            <ArrowLeft className="size-4" strokeWidth={1.5} /> All partnerships
          </A>
          <p className="font-label text-[11px] tracking-[0.28em] uppercase opacity-85">
            {p.kind} · {p.place}
          </p>
          <Display as="h1" className="mt-3">
            {p.name}
          </Display>
        </div>
      </section>
      <Section>
        <div className="grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <Eyebrow>The shoot</Eyebrow>
            <p className="mt-5 text-2xl leading-snug font-light">{p.summary}</p>
            {p.gallery ? (
              <a href={p.gallery} target="_blank" rel="noreferrer" className={cn(btn, "border-foreground/30 hover:border-foreground mt-8 border")}>
                Full photo gallery <ArrowUpRight className="size-4" strokeWidth={1.5} />
              </a>
            ) : null}
          </Reveal>
          <div className="grid grid-cols-3 gap-3 lg:col-span-7">
            {p.clips.map((c) => (
              <ClipTile key={c.title} c={c} />
            ))}
          </div>
        </div>
      </Section>
      <section className="px-5 pb-20 sm:px-8 lg:px-12 lg:pb-32">
        <Eyebrow className="mb-6">Photography · {p.photos.length} images</Eyebrow>
        <div className="columns-2 gap-3 md:columns-3 [&>*]:mb-3">
          {p.photos.map((ph, k) => (
            <button key={ph} type="button" className="group block w-full overflow-hidden rounded-sm" onClick={() => setOpen(k)} aria-label={`Open photo ${k + 1}`}>
              <img src={media(ph)} alt="" loading="lazy" className="w-full transition-transform duration-700 group-hover:scale-[1.03]" />
            </button>
          ))}
        </div>
      </section>
      <A to={`/partnerships/${next.slug}`} className="bg-foreground text-background group relative block overflow-hidden">
        <img src={media(next.cover)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-35 transition-opacity group-hover:opacity-50" />
        <div className="relative px-5 py-20 sm:px-8 lg:px-12">
          <p className="font-label text-[11px] tracking-[0.28em] uppercase opacity-75">Next partnership</p>
          <p className="mt-3 inline-flex items-center gap-4 text-[clamp(2rem,5vw,4rem)] font-light tracking-[0.06em] uppercase">
            {next.name} <ArrowRight className="size-8 transition-transform group-hover:translate-x-1" strokeWidth={1} />
          </p>
        </div>
      </A>
      <Inquire />
      <AnimatePresence>
        {open !== null ? (
          <Lightbox photos={p.photos} at={open} label={p.name} onClose={() => setOpen(null)} onMove={(d) => setOpen((o) => (o === null ? o : (o + d + p.photos.length) % p.photos.length))} />
        ) : null}
      </AnimatePresence>
    </main>
  );
}

export function NotFound() {
  return (
    <main className="grid min-h-[70dvh] place-content-center gap-6 px-5 pt-24 text-center">
      <Display as="h1">Page not found</Display>
      <A to="/" className={cn(btn, "bg-foreground text-background mx-auto")}>
        Back home
      </A>
    </main>
  );
}
