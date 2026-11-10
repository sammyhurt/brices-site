import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { brand, couples, ideas, partnerships, pkg, quietLuxury, reach, reachAsOf, type Clip } from "./data";
import { Hero } from "./hero";
import { A, Display, Eyebrow, Reveal, Section, TikTokIcon, media } from "./parts";
import { VISIT_URL, trackEvent, visitCode } from "./track";

const btn = "inline-flex h-12 items-center gap-2 rounded-full px-7 text-[11px] tracking-[0.24em] uppercase transition-colors";

/* ───────── About ───────── */
function About() {
  return (
    <Section id="about">
      <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
        <Reveal className="grid grid-cols-3 gap-3 lg:col-span-6">
          {["about-pool", "about-balcony", "about-street"].map((m, i) => (
            <img key={m} src={media(m)} alt="" loading="lazy" className={cn("aspect-[3/5] w-full rounded-sm object-cover", i === 1 && "translate-y-8")} />
          ))}
        </Reveal>
        <Reveal delay={0.1} className="lg:col-span-6">
          <Eyebrow>About us</Eyebrow>
          <Display className="mt-4">Who we are</Display>
          <p className="text-muted-foreground mt-8 max-w-xl text-lg leading-relaxed font-light">{brand.about}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <A to="/#inquire" className={cn(btn, "bg-foreground text-background hover:bg-foreground/85")}>
              Work with us
            </A>
            <a href={brand.mediaKit} target="_blank" rel="noreferrer" className={cn(btn, "border-foreground/30 hover:border-foreground border")}>
              <Download className="size-4" strokeWidth={1.5} /> Media kit
            </a>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}

/* ───────── Quiet luxury ───────── */
function QuietLuxury() {
  return (
    <section className="bg-secondary">
      <div className="grid lg:grid-cols-2">
        <img src={media("quiet-window")} alt="" loading="lazy" className="h-72 w-full object-cover sm:h-[28rem] lg:h-full" />
        <div className="px-5 py-20 sm:px-8 lg:px-16 lg:py-28">
          <Reveal>
            <Eyebrow>How we shoot</Eyebrow>
            <Display className="mt-4">Quiet luxury</Display>
          </Reveal>
          <ol className="mt-12 grid gap-0">
            {quietLuxury.map((l, i) => (
              <Reveal key={l} delay={i * 0.06}>
                <li className="border-foreground/15 flex gap-6 border-t py-6">
                  <span className="text-ink w-6 shrink-0 text-sm tabular-nums">0{i + 1}</span>
                  <span className="text-lg leading-snug font-light">{l}</span>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ───────── Partnerships ───────── */
function Partnerships() {
  return (
    <Section id="partnerships">
      <Reveal className="mb-14 flex flex-wrap items-end justify-between gap-6">
        <div>
          <Eyebrow>Past partnerships</Eyebrow>
          <Display className="mt-4">Stays we've shot</Display>
        </div>
        <p className="text-muted-foreground max-w-sm font-light">Photos and video we made on property. Open one to see the full set.</p>
      </Reveal>
      <ul className="grid gap-6 md:grid-cols-3">
        {partnerships.map((p, i) => (
          <Reveal key={p.slug} delay={i * 0.08}>
            <li>
              <A to={`/partnerships/${p.slug}`} className="group block">
                <div className="overflow-hidden rounded-sm">
                  <img src={media(p.cover)} alt={`${p.name}, ${p.place}`} loading="lazy" className="aspect-[4/5] w-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.04]" />
                </div>
                <div className="mt-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-ink text-[11px] tracking-[0.24em] uppercase">
                      {p.kind} · {p.place}
                    </p>
                    <h3 className="mt-2 text-2xl font-light tracking-[0.06em] uppercase">{p.name}</h3>
                  </div>
                  <ArrowUpRight className="mt-6 size-5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={1.25} />
                </div>
              </A>
            </li>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}

/* ───────── Vertical video tiles ───────── */
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
        {c.href ? null : <span className="text-[10px] tracking-[0.18em] text-white/75 uppercase">Still from the video</span>}
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

function Couples() {
  return (
    <section id="couples" className="bg-foreground text-background scroll-mt-16 px-5 py-20 sm:px-8 lg:px-12 lg:py-32">
      <Reveal className="mb-14 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-background/60 text-[11px] tracking-[0.28em] uppercase">On our channels</p>
          <Display className="mt-4">Couples content</Display>
        </div>
        <p className="text-background/70 max-w-sm font-light">Travel, fashion and the two of us. Tap any video to watch it on TikTok.</p>
      </Reveal>
      <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-6">
        {couples.map((c, i) => (
          <Reveal key={c.title} delay={i * 0.05} className="w-[62vw] shrink-0 snap-start sm:w-auto">
            <ClipTile c={c} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ───────── Reach ───────── */
function Reach() {
  return (
    <Section id="reach">
      <Reveal className="mb-14">
        <Eyebrow>Our reach · {reachAsOf}</Eyebrow>
        <Display className="mt-4">The numbers</Display>
      </Reveal>
      <dl className="grid gap-px overflow-hidden sm:grid-cols-2 lg:grid-cols-5">
        {reach.map((r, i) => (
          <Reveal key={r.label} delay={i * 0.06} className="border-foreground/15 border-t pt-6 pb-8 sm:pr-6">
            <dt className="sr-only">{r.label}</dt>
            <dd className="text-[clamp(3rem,6vw,4.6rem)] leading-none font-extralight tabular-nums">{r.value}</dd>
            <dd className="text-muted-foreground mt-3 max-w-[14rem] text-sm leading-snug">{r.label}</dd>
          </Reveal>
        ))}
      </dl>
    </Section>
  );
}

/* ───────── Ideas ───────── */
function Ideas() {
  return (
    <section className="bg-secondary">
      <div className="grid lg:grid-cols-12">
        <div className="px-5 py-20 sm:px-8 lg:col-span-7 lg:px-12 lg:py-28">
          <Reveal>
            <Eyebrow>For your property</Eyebrow>
            <Display className="mt-4">Ideas to film</Display>
          </Reveal>
          <ol className="mt-12">
            {ideas.map((it, i) => (
              <Reveal key={it.n} delay={i * 0.05}>
                <li className="border-foreground/15 grid gap-1 border-t py-6 sm:grid-cols-[4rem_14rem_1fr] sm:gap-6">
                  <span className="text-ink text-sm tabular-nums">{it.n}</span>
                  <span className="text-lg tracking-[0.04em] uppercase">{it.title}</span>
                  <span className="text-muted-foreground font-light">{it.body}</span>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
        <img src={media("couples-santorini")} alt="" loading="lazy" className="h-80 w-full object-cover sm:h-[30rem] lg:col-span-5 lg:h-full" />
      </div>
    </section>
  );
}

/* ───────── Package ───────── */
function Package() {
  return (
    <Section id="package">
      <div className="grid gap-12 lg:grid-cols-12">
        <Reveal className="lg:col-span-5">
          <Eyebrow>The package</Eyebrow>
          <Display className="mt-4 text-[clamp(2rem,3.8vw,3.4rem)]">Scroll stopping content, ready to run</Display>
          <p className="text-muted-foreground mt-8 max-w-md font-light">Everything is shot and edited by us, delivered for your channels and posted on ours. Tell us what your property needs and we'll shape the shoot around it.</p>
        </Reveal>
        <dl className="lg:col-span-7">
          {pkg.map((p, i) => (
            <Reveal key={p.what} delay={i * 0.06} className="border-foreground/15 grid grid-cols-[5.5rem_1fr] gap-x-6 gap-y-1 border-t py-8 sm:grid-cols-[7rem_14rem_1fr]">
              <dt className="row-span-2 text-6xl leading-none font-extralight tabular-nums sm:row-span-1">{p.count}</dt>
              <dt className="self-center text-lg tracking-[0.06em] uppercase">{p.what}</dt>
              <dd className="text-muted-foreground font-light sm:self-center">{p.detail}</dd>
            </Reveal>
          ))}
          <div className="border-foreground/15 border-t" />
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
      <label className="grid gap-2 text-[11px] tracking-[0.2em] uppercase">
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
        <div className="relative hidden lg:col-span-5 lg:block">
          <img src={media("closing-balcony")} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        </div>
        <div className="px-5 py-20 sm:px-8 lg:col-span-7 lg:px-16 lg:py-28">
          <Reveal>
            <Eyebrow>Hotels, resorts and stays</Eyebrow>
            <Display className="mt-4">Let's work together</Display>
            <p className="text-muted-foreground mt-6 max-w-lg font-light">
              Tell us about your property and when you'd like content. We'll reply by email, or write to us directly at{" "}
              <a href={`mailto:${brand.email}`} className="text-foreground underline underline-offset-4">
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
              <label className="grid gap-2 text-[11px] tracking-[0.2em] uppercase sm:col-span-2">
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
      <Partnerships />
      <Couples />
      <Reach />
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
  const nav = "grid size-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20";
  return (
    <motion.div role="dialog" aria-modal="true" aria-label={`${label} photos`} className="fixed inset-0 z-50 grid place-items-center bg-black/92" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <img src={media(photos[at])} alt={`${label}, photo ${at + 1} of ${photos.length}`} className="max-h-[86dvh] max-w-[92vw] object-contain" onClick={(e) => e.stopPropagation()} />
      <p className="absolute top-5 left-5 text-[11px] tracking-[0.24em] text-white/70 uppercase tabular-nums">
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
          <A to="/#partnerships" className="mb-8 inline-flex items-center gap-2 text-[11px] tracking-[0.24em] uppercase opacity-80 hover:opacity-100">
            <ArrowLeft className="size-4" strokeWidth={1.5} /> All partnerships
          </A>
          <p className="text-[11px] tracking-[0.28em] uppercase opacity-85">
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
          <p className="text-[11px] tracking-[0.28em] uppercase opacity-75">Next partnership</p>
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
