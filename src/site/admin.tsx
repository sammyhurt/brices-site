import {
  ArrowUpRight,
  Check,
  Copy,
  ExternalLink,
  Lock,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Send,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { partnerships } from "./data";
import { Chip, InstagramIcon } from "./parts";

/**
 * Private admin for Meredith & Bernie: the hotel pipeline, site visits and sending settings.
 * Talks to the "Brices — Site visits and admin" n8n workflow with the Meredith Studio passcode.
 */
const ADMIN_URL = "https://subletlyco.app.n8n.cloud/webhook/brices-admin";
const PASS_KEY = "mb-admin-pass";
const TAB_KEY = "mb-admin-tab";
const GMAIL_USER = "meredithkbrice@gmail.com";

/* ---------- types ---------- */
type Status =
  | "new" | "approved" | "sent" | "follow_up_approved" | "followed_up" | "replied" | "inbound"
  | "negotiating" | "booked" | "shot" | "delivered" | "not_interested" | "skipped" | "bounced";
interface Prospect {
  prospect_key: string; origin: "scan" | "manual" | "inbound" | string; status: Status;
  property: string; property_type: string; city: string; state: string; region: string; website: string; domain: string;
  contact_name: string; contact_title: string; contact_email: string; email_source_url: string; email_verified: boolean; instagram: string;
  fit_reason: string; matched_partnership: string; idea: string; score: number;
  email_subject: string; email_draft: string; dm_draft: string; follow_up_draft: string; link_code: string;
  evidence: { property_excerpt?: string; detail_verified?: boolean; email_excerpt?: string };
  inquiry: { at?: string; name?: string; email?: string; property?: string; location?: string; role?: string; timing?: string; message?: string } | null;
  notes: string; created_at: string; approved_at: string; sent_at: string; follow_up_at: string; followed_up_at: string; replied_at: string;
  send_error: string; link_visits: number; link_last: string;
}
interface Win { visitors: number; views: number }
interface KN { k: string; n: number }
interface Sess { start: string; last: string; source: string; device: string; property: string; pages: string[]; events: string[] }
interface Stats { today: Win; week: Win; month: Win; byDay: { day: string; visitors: number; views: number }[]; sources: KN[]; pages: KN[]; events: KN[]; recent: Sess[]; total_rows: number }
type Settings = Record<string, string>;
interface Overview { ok: boolean; prospects: Prospect[]; settings: Settings; sent_today: number; stats: Stats; error?: string }
interface Resp { ok: boolean; error?: string; prospect?: Prospect; settings?: Settings }

/* ---------- helpers ---------- */
const when = (iso: string) =>
  iso ? new Date(iso).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
const dateOnly = (iso: string) => (iso ? new Date(iso).toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" }) : "");
const dayLabel = (d: string) => (d ? new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");
const read = (k: string) => {
  try {
    return localStorage.getItem(k) || "";
  } catch {
    return "";
  }
};
const write = (k: string, v: string) => {
  try {
    if (v) localStorage.setItem(k, v);
    else localStorage.removeItem(k);
  } catch {
    /* fine */
  }
};

const STATUS_LABEL: Record<Status, string> = {
  new: "To review", approved: "Approved, queued", sent: "Sent", follow_up_approved: "Follow up queued", followed_up: "Followed up",
  replied: "Replied", inbound: "Website inquiry", negotiating: "Talking dates", booked: "Booked", shot: "Shot", delivered: "Delivered",
  not_interested: "Not interested", skipped: "Skipped", bounced: "Bounced",
};
const FILTERS: { key: string; label: string; test: (p: Prospect, now: number) => boolean }[] = [
  { key: "review", label: "To review", test: (p) => p.status === "new" },
  { key: "queued", label: "Queued", test: (p) => p.status === "approved" || p.status === "follow_up_approved" },
  { key: "due", label: "Follow up due", test: (p, now) => p.status === "sent" && !!p.follow_up_at && Date.parse(p.follow_up_at) <= now },
  { key: "waiting", label: "Waiting", test: (p) => p.status === "sent" || p.status === "followed_up" },
  { key: "talking", label: "Conversations", test: (p) => ["replied", "inbound", "negotiating"].includes(p.status) },
  { key: "booked", label: "Booked", test: (p) => ["booked", "shot", "delivered"].includes(p.status) },
  { key: "closed", label: "Closed", test: (p) => ["not_interested", "skipped", "bounced"].includes(p.status) },
  { key: "all", label: "All", test: () => true },
];
const EVENT_LABEL: Record<string, string> = { kit: "Opened media kit", inquiry: "Sent an inquiry", tiktok: "Clicked TikTok", instagram: "Clicked Instagram", gallery: "Opened a gallery", email: "Clicked email" };
const SOURCE_LABEL: Record<string, string> = { instagram: "Instagram", tiktok: "TikTok", google: "Google", bing: "Bing", linkedin: "LinkedIn", facebook: "Facebook", pinterest: "Pinterest", email: "Email", direct: "Direct", other: "Other site", internal: "Internal", "outreach link": "Your outreach link" };
const pageLabel = (p: string) => {
  if (p === "/") return "Home";
  const m = p.match(/^\/partnerships\/(.+)$/);
  return m ? partnerships.find((x) => x.slug === m[1])?.name || m[1] : p.replace(/^\//, "");
};

function fillLink(s: string, p: Prospect, site: string) {
  return site ? s.split("{LINK}").join(`${site.replace(/\/+$/, "")}/?for=${p.link_code}`) : s;
}
function footer(st: Settings) {
  return st.postal_address ? `\n\n${st.postal_address}\nIf you would rather not hear from us, just reply "no thanks" and we will not email again.` : "";
}
function gmailCompose(to: string, subject: string, body: string) {
  const q = new URLSearchParams({ authuser: GMAIL_USER, view: "cm", fs: "1", to, su: subject, body });
  return `https://mail.google.com/mail/?${q.toString()}`;
}
const igUrl = (h: string) => (h ? `https://www.instagram.com/${h.replace(/^@/, "")}/` : "");

const btn = "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors disabled:opacity-50";
const solid = cn(btn, "bg-foreground text-background hover:bg-foreground/85");
const ghost = cn(btn, "border-border hover:bg-muted border bg-transparent");
const card = "border-border bg-card rounded-2xl border p-5";
const label = "text-muted-foreground text-[11px] tracking-[0.16em] uppercase";

/* ---------- the prospect card ---------- */
function ProspectCard({ p, st, onSave, busy }: { p: Prospect; st: Settings; onSave: (key: string, patch: Partial<Prospect> & Record<string, unknown>, action?: string) => Promise<boolean>; busy: boolean }) {
  const [tab, setTab] = useState<"email" | "dm" | "follow">(p.sent_at ? "follow" : p.email_draft && p.contact_email ? "email" : "dm");
  const [subject, setSubject] = useState(p.email_subject);
  const [email, setEmail] = useState(p.email_draft);
  const [dm, setDm] = useState(p.dm_draft);
  const [follow, setFollow] = useState(p.follow_up_draft);
  const [notes, setNotes] = useState(p.notes);
  const [addr, setAddr] = useState(p.contact_email);
  const [copied, setCopied] = useState("");
  useEffect(() => {
    setSubject(p.email_subject);
    setEmail(p.email_draft);
    setDm(p.dm_draft);
    setFollow(p.follow_up_draft);
    setNotes(p.notes);
    setAddr(p.contact_email);
  }, [p]);
  const dirty = subject !== p.email_subject || email !== p.email_draft || dm !== p.dm_draft || follow !== p.follow_up_draft || notes !== p.notes || addr !== p.contact_email;
  const patchDrafts = () => ({ email_subject: subject, email_draft: email, dm_draft: dm, follow_up_draft: follow, notes, contact_email: addr });
  const site = st.site_url || "";
  const needsLink = !site && [email, dm, follow].some((x) => x.includes("{LINK}"));
  const setStatus = (status: Status) => onSave(p.prospect_key, dirty ? { ...patchDrafts(), status } : { status });
  const copy = async (what: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(""), 1600);
    } catch {
      /* clipboard blocked */
    }
  };
  const hasEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr);
  const emailBadge = !p.contact_email ? (
    <Chip tone="warn">No email, DM only</Chip>
  ) : p.origin === "inbound" || p.email_source_url === "website inquiry" ? (
    <Chip tone="ok">From their inquiry</Chip>
  ) : p.email_verified ? (
    <a href={p.email_source_url} target="_blank" rel="noreferrer" title="Open the page where this email is printed">
      <Chip tone="ok">Email on their site ↗</Chip>
    </a>
  ) : (
    <Chip>Email added by you</Chip>
  );
  const followDue = p.status === "sent" && p.follow_up_at && Date.parse(p.follow_up_at) <= Date.now();
  const tabBtn = (k: typeof tab, t: string) => (
    <button type="button" onClick={() => setTab(k)} className={cn("rounded-full px-3 py-1 text-sm", tab === k ? "bg-foreground text-background" : "hover:bg-muted text-muted-foreground")}>
      {t}
    </button>
  );
  const firstBody = fillLink(email, p, site) + footer(st);
  const followBody = fillLink(follow, p, site) + footer(st);
  const followSubject = /^re:/i.test(subject) ? subject : `Re: ${subject}`;

  return (
    <article className={cn(card, "grid gap-4")} data-key={p.prospect_key}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-medium">{p.property}</h3>
            <Chip tone={p.status === "new" ? "primary" : ["booked", "shot", "delivered", "replied", "negotiating", "inbound"].includes(p.status) ? "ok" : "muted"}>{STATUS_LABEL[p.status] || p.status}</Chip>
            {p.origin === "scan" ? <Chip>Found by scan</Chip> : p.origin === "manual" ? <Chip>Added by you</Chip> : null}
            {p.score ? <span className="text-muted-foreground text-xs tabular-nums">Fit {p.score}/100</span> : null}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {[p.property_type, [p.city, p.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
            {p.website ? (
              <>
                {" · "}
                <a href={p.website} target="_blank" rel="noreferrer" className="hover:text-foreground underline underline-offset-2">
                  {p.domain || "website"}
                </a>
              </>
            ) : null}
            {p.instagram ? (
              <>
                {" · "}
                <a href={igUrl(p.instagram)} target="_blank" rel="noreferrer" className="hover:text-foreground underline underline-offset-2">
                  {p.instagram}
                </a>
              </>
            ) : null}
          </p>
        </div>
        <div className="text-muted-foreground text-right text-xs">
          <p>Added {dateOnly(p.created_at)}</p>
          {p.sent_at ? <p>Sent {when(p.sent_at)}</p> : null}
          {p.followed_up_at ? <p>Followed up {when(p.followed_up_at)}</p> : null}
          {p.replied_at ? <p>Replied {when(p.replied_at)}</p> : null}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {emailBadge}
        {p.contact_name ? (
          <span className="text-muted-foreground">
            {p.contact_name}
            {p.contact_title ? `, ${p.contact_title}` : ""}
          </span>
        ) : null}
        {p.link_visits ? (
          <Chip tone="ok">
            Opened your link {p.link_visits}× · {when(p.link_last)}
          </Chip>
        ) : null}
        {followDue ? <Chip tone="warn">Follow up due</Chip> : null}
      </div>

      {p.inquiry ? (
        <div className="bg-secondary/70 grid gap-1 rounded-xl p-4 text-sm">
          <p className={label}>Their inquiry · {when(p.inquiry.at || "")}</p>
          <p>
            <strong className="font-medium">{p.inquiry.name}</strong>
            {p.inquiry.role ? `, ${p.inquiry.role}` : ""} · {p.inquiry.email}
            {p.inquiry.location ? ` · ${p.inquiry.location}` : ""}
          </p>
          {p.inquiry.timing ? <p>Dates: {p.inquiry.timing}</p> : null}
          {p.inquiry.message ? <p className="whitespace-pre-wrap">{p.inquiry.message}</p> : null}
        </div>
      ) : null}

      {p.fit_reason || p.evidence?.property_excerpt ? (
        <div className="grid gap-1 text-sm">
          {p.fit_reason ? <p>{p.fit_reason}</p> : null}
          {p.evidence?.property_excerpt ? (
            <p className="text-muted-foreground">
              From their site: “{p.evidence.property_excerpt}” {p.evidence.detail_verified ? <span className="text-emerald-700">· checked</span> : <span>· not checked, open the site</span>}
            </p>
          ) : null}
          {p.matched_partnership ? (
            <p className="text-muted-foreground">
              Pitch uses: {p.matched_partnership}
              {p.idea ? ` · ${p.idea}` : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      {p.send_error ? <p className="text-destructive text-sm">Last send didn't go through: {p.send_error}</p> : null}

      {p.email_draft || p.dm_draft ? (
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-1">
            {tabBtn("email", "Email")}
            {tabBtn("dm", "Instagram DM")}
            {tabBtn("follow", "Follow up")}
          </div>
          {tab === "email" ? (
            <div className="grid gap-2">
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Subject" />
              <Textarea value={email} onChange={(e) => setEmail(e.target.value)} rows={12} aria-label="Email" className="text-sm leading-relaxed" />
            </div>
          ) : tab === "dm" ? (
            <Textarea value={dm} onChange={(e) => setDm(e.target.value)} rows={6} aria-label="Instagram DM" className="text-sm leading-relaxed" />
          ) : (
            <Textarea value={follow} onChange={(e) => setFollow(e.target.value)} rows={7} aria-label="Follow up" className="text-sm leading-relaxed" />
          )}
          {needsLink ? <p className="text-xs text-amber-800">The {"{LINK}"} spot fills in with your tracked site link once you add your site address in Settings.</p> : null}
          {st.postal_address ? (
            <p className="text-muted-foreground text-xs">Your mailing address and a one-line opt-out are added under the signature when it sends.</p>
          ) : (
            <p className="text-xs text-amber-800">Add your mailing address in Settings. Marketing emails need one, and it's added under the signature.</p>
          )}
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className={label}>Send to</span>
          <Input value={addr} onChange={(e) => setAddr(e.target.value.trim())} placeholder="Only an email the property publishes" type="email" />
        </label>
        <label className="grid gap-1">
          <span className={label}>Notes</span>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Dates, rates, who you spoke with…" />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {dirty ? (
          <button type="button" className={solid} disabled={busy} onClick={() => void onSave(p.prospect_key, patchDrafts())}>
            <Check className="size-4" /> Save changes
          </button>
        ) : null}

        {p.status === "new" ? (
          <>
            <button type="button" className={solid} disabled={busy || !hasEmail} title={hasEmail ? "" : "Add an email first"} onClick={() => void setStatus("approved")}>
              <Send className="size-4" /> Approve to send
            </button>
            {hasEmail ? (
              <a className={ghost} href={gmailCompose(addr, subject, firstBody)} target="_blank" rel="noreferrer">
                <Mail className="size-4" /> Open in Gmail
              </a>
            ) : null}
            {hasEmail ? (
              <button type="button" className={ghost} disabled={busy} onClick={() => void setStatus("sent")}>
                I sent it myself
              </button>
            ) : null}
          </>
        ) : null}
        {p.status === "approved" ? (
          <button type="button" className={ghost} disabled={busy} onClick={() => void setStatus("new")}>
            Unapprove
          </button>
        ) : null}
        {p.status === "sent" ? (
          <>
            <button type="button" className={followDue ? solid : ghost} disabled={busy || !follow} onClick={() => void setStatus("follow_up_approved")}>
              <Send className="size-4" /> Approve follow up
            </button>
            <a className={ghost} href={gmailCompose(addr, followSubject, followBody)} target="_blank" rel="noreferrer">
              <Mail className="size-4" /> Follow up in Gmail
            </a>
            <button type="button" className={ghost} disabled={busy} onClick={() => void setStatus("followed_up")}>
              I followed up myself
            </button>
          </>
        ) : null}
        {p.status === "follow_up_approved" ? (
          <button type="button" className={ghost} disabled={busy} onClick={() => void setStatus("sent")}>
            Unapprove follow up
          </button>
        ) : null}
        {["sent", "followed_up", "approved", "follow_up_approved"].includes(p.status) ? (
          <button type="button" className={ghost} disabled={busy} onClick={() => void setStatus("replied")}>
            They replied
          </button>
        ) : null}
        {["replied", "inbound"].includes(p.status) ? (
          <>
            <a className={solid} href={gmailCompose(addr, p.inquiry ? `Re: ${p.property} x Meredith & Bernie` : followSubject, "")} target="_blank" rel="noreferrer">
              <Mail className="size-4" /> Reply in Gmail
            </a>
            <button type="button" className={ghost} disabled={busy} onClick={() => void setStatus("negotiating")}>
              Talking dates
            </button>
          </>
        ) : null}
        {["replied", "inbound", "negotiating"].includes(p.status) ? (
          <button type="button" className={ghost} disabled={busy} onClick={() => void setStatus("booked")}>
            Booked
          </button>
        ) : null}
        {p.status === "booked" ? (
          <button type="button" className={ghost} disabled={busy} onClick={() => void setStatus("shot")}>
            Shoot done
          </button>
        ) : null}
        {p.status === "shot" ? (
          <button type="button" className={ghost} disabled={busy} onClick={() => void setStatus("delivered")}>
            Content delivered
          </button>
        ) : null}

        {p.dm_draft ? (
          <button
            type="button"
            className={ghost}
            onClick={() => {
              void copy("dm", fillLink(dm, p, site));
              if (p.instagram) window.open(igUrl(p.instagram), "_blank", "noopener");
            }}
          >
            <InstagramIcon className="size-4" /> {copied === "dm" ? "Copied" : p.instagram ? "Copy DM + open Instagram" : "Copy DM"}
          </button>
        ) : null}
        {p.status === "new" && (p.origin === "manual" || p.origin === "scan") ? (
          <button type="button" className={ghost} disabled={busy} onClick={() => void onSave(p.prospect_key, {}, "redraft")}>
            <RefreshCw className="size-4" /> Rewrite draft
          </button>
        ) : null}
        {["new", "approved", "inbound"].includes(p.status) ? (
          <button type="button" className={cn(ghost, "text-muted-foreground")} disabled={busy} onClick={() => void setStatus("skipped")}>
            Skip
          </button>
        ) : null}
        {["sent", "followed_up", "replied", "inbound", "negotiating"].includes(p.status) ? (
          <button type="button" className={cn(ghost, "text-muted-foreground")} disabled={busy} onClick={() => void setStatus("not_interested")}>
            Not interested
          </button>
        ) : null}
        {["skipped", "not_interested"].includes(p.status) ? (
          <button type="button" className={ghost} disabled={busy} onClick={() => void setStatus(p.sent_at ? "sent" : "new")}>
            Reopen
          </button>
        ) : null}
        {p.email_draft ? (
          <button type="button" className={cn(ghost, "text-muted-foreground")} onClick={() => void copy("email", `${subject}\n\n${firstBody}`)}>
            <Copy className="size-4" /> {copied === "email" ? "Copied" : "Copy email"}
          </button>
        ) : null}
      </div>
    </article>
  );
}

/* ---------- add a hotel ---------- */
function AddHotel({ onAdd, busy, onClose }: { onAdd: (f: Record<string, string>) => Promise<boolean>; busy: boolean; onClose: () => void }) {
  const [f, setF] = useState({ property: "", website: "", city: "", state: "", contact_email: "", contact_name: "", instagram: "", detail: "", notes: "" });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  return (
    <form
      className={cn(card, "grid gap-3")}
      onSubmit={(e) => {
        e.preventDefault();
        void onAdd(f).then((ok) => ok && onClose());
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Add a hotel</h3>
        <button type="button" className="hover:bg-muted rounded-full p-1.5" onClick={onClose} aria-label="Close">
          <X className="size-4" />
        </button>
      </div>
      <p className="text-muted-foreground text-sm">We'll write the email, DM and follow up for you. Use only an email the property publishes, or one they gave you.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input required placeholder="Property name *" value={f.property} onChange={set("property")} />
        <Input placeholder="Website" value={f.website} onChange={set("website")} />
        <Input placeholder="City" value={f.city} onChange={set("city")} />
        <Input placeholder="State" value={f.state} onChange={set("state")} />
        <Input placeholder="Email (optional)" type="email" value={f.contact_email} onChange={set("contact_email")} />
        <Input placeholder="Contact name (optional)" value={f.contact_name} onChange={set("contact_name")} />
        <Input placeholder="Instagram handle (optional)" value={f.instagram} onChange={set("instagram")} />
        <Input placeholder="Notes (private)" value={f.notes} onChange={set("notes")} />
      </div>
      <Textarea placeholder="What caught your eye? One true detail, like the rooftop pool or the cedar sauna. Leave blank and we'll read their site." value={f.detail} onChange={set("detail")} rows={2} />
      <div className="flex gap-2">
        <button type="submit" className={solid} disabled={busy || f.property.trim().length < 2}>
          <Plus className="size-4" /> {busy ? "Writing the draft…" : "Add and draft"}
        </button>
      </div>
    </form>
  );
}

/* ---------- site stats ---------- */
function StatsPanel({ st }: { st: Stats }) {
  const max = Math.max(1, ...st.byDay.map((d) => d.visitors));
  const List = ({ title, rows, fmt }: { title: string; rows: KN[]; fmt: (k: string) => string }) => (
    <div className={card}>
      <h3 className={label}>{title}</h3>
      {rows.length ? (
        <ul className="mt-3 grid gap-1.5 text-sm">
          {rows.map((r) => (
            <li key={r.k} className="flex justify-between gap-3">
              <span className="truncate">{fmt(r.k)}</span>
              <span className="text-muted-foreground tabular-nums">{r.n}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground mt-3 text-sm">Nothing yet.</p>
      )}
    </div>
  );
  return (
    <section className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {([["Today", st.today], ["Last 7 days", st.week], ["Last 30 days", st.month]] as const).map(([t, w]) => (
          <div key={t} className={card}>
            <p className={label}>{t}</p>
            <p className="mt-2 text-4xl font-light tabular-nums">{w.visitors}</p>
            <p className="text-muted-foreground text-sm">
              visitor{w.visitors === 1 ? "" : "s"} · {w.views} page view{w.views === 1 ? "" : "s"}
            </p>
          </div>
        ))}
      </div>
      <div className={card}>
        <div className="flex items-baseline justify-between">
          <h3 className={label}>Visitors per day · last 30 days</h3>
          <span className="text-muted-foreground text-xs">New York time</span>
        </div>
        <div className="mt-4 flex h-32 items-end gap-[3px]" role="img" aria-label="Visitors per day for the last 30 days">
          {st.byDay.map((d) => (
            <div key={d.day} className="group relative flex h-full flex-1 items-end" title={`${dayLabel(d.day)}: ${d.visitors} visitor${d.visitors === 1 ? "" : "s"}, ${d.views} views`}>
              <div className="bg-foreground/80 group-hover:bg-foreground w-full rounded-t-[3px]" style={{ height: `${d.visitors ? Math.max(6, (d.visitors / max) * 100) : 2}%`, opacity: d.visitors ? 1 : 0.25 }} />
            </div>
          ))}
        </div>
        <div className="text-muted-foreground mt-1.5 flex justify-between text-[11px]">
          <span>{dayLabel(st.byDay[0]?.day || "")}</span>
          <span>Today</span>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <List title="Where visitors came from" rows={st.sources} fmt={(k) => SOURCE_LABEL[k] || k} />
        <List title="Top pages" rows={st.pages} fmt={pageLabel} />
        <List title="What they did" rows={st.events} fmt={(k) => EVENT_LABEL[k] || k} />
      </div>
      <div className={card}>
        <h3 className={label}>Recent visits</h3>
        {st.recent.length ? (
          <ul className="mt-2 divide-y text-sm">
            {st.recent.map((v, i) => (
              <li key={i} className="grid gap-1 py-2.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-medium tabular-nums">{when(v.start)}</span>
                  <Chip>{SOURCE_LABEL[v.source] || v.source}</Chip>
                  {v.device ? <span className="text-muted-foreground">{v.device}</span> : null}
                  {v.property ? <Chip tone="ok">{v.property}</Chip> : null}
                </div>
                <p className="text-muted-foreground">
                  {v.pages.length ? v.pages.map(pageLabel).join(" → ") : "—"}
                  {v.events.length ? <span className="text-foreground"> · {v.events.map((e) => EVENT_LABEL[e] || e).join(", ")}</span> : null}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground mt-3 text-sm">No visits yet. They'll show up here as people open your site.</p>
        )}
      </div>
      <p className="text-muted-foreground text-xs">Bots and repeat refreshes are skipped. Your own visits aren't counted on any browser where you've opened this page. No names, emails, IP addresses or cookies are stored for visits.</p>
    </section>
  );
}

/* ---------- settings ---------- */
function SettingsPanel({ st, sentToday, onSave, busy }: { st: Settings; sentToday: number; onSave: (v: Record<string, string | boolean>) => Promise<boolean>; busy: boolean }) {
  const [site, setSite] = useState(st.site_url || "");
  const [addr, setAddr] = useState(st.postal_address || "");
  const [cap, setCap] = useState(st.daily_cap || "15");
  useEffect(() => {
    setSite(st.site_url || "");
    setAddr(st.postal_address || "");
    setCap(st.daily_cap || "15");
  }, [st]);
  const on = st.sending_on === "true";
  const paused = st.paused_scan === "true";
  const ready = !!st.site_url && !!st.postal_address;
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <form
        className={cn(card, "grid gap-4")}
        onSubmit={(e) => {
          e.preventDefault();
          void onSave({ site_url: site.trim(), postal_address: addr.trim(), daily_cap: cap });
        }}
      >
        <h3 className="text-lg font-medium">Before you send</h3>
        <label className="grid gap-1.5">
          <span className={label}>Site address</span>
          <Input value={site} onChange={(e) => setSite(e.target.value)} placeholder="https://yoursite.com" />
          <span className="text-muted-foreground text-xs">Used for the tracked link in each email, so you can see when a hotel opens your site.</span>
        </label>
        <label className="grid gap-1.5">
          <span className={label}>Mailing address</span>
          <Textarea value={addr} onChange={(e) => setAddr(e.target.value)} rows={2} placeholder="A business address or PO box" />
          <span className="text-muted-foreground text-xs">US law (CAN-SPAM) asks for a postal address in marketing emails. It's added under your signature with a one-line opt-out.</span>
        </label>
        <label className="grid gap-1.5">
          <span className={label}>Emails per day</span>
          <Input value={cap} onChange={(e) => setCap(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" className="w-28" />
          <span className="text-muted-foreground text-xs">Sent in 4 small batches on weekdays. 10 to 15 keeps a personal Gmail healthy.</span>
        </label>
        <div>
          <button type="submit" className={solid} disabled={busy}>
            <Check className="size-4" /> Save
          </button>
        </div>
      </form>
      <div className="grid content-start gap-4">
        <div className={cn(card, "grid gap-3")}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-medium">Sending</h3>
            <Chip tone={on ? "ok" : "muted"}>{on ? `On · ${sentToday} sent today` : "Off"}</Chip>
          </div>
          <p className="text-muted-foreground text-sm">Only emails you approve are sent, from {GMAIL_USER}, weekdays at 9:37, 11:37, 1:37 and 3:37 New York time. Replies are checked four times a day; anyone who says no thanks is never emailed again.</p>
          {!ready ? <p className="text-sm text-amber-800">Add your site address and mailing address first.</p> : null}
          <div>
            <button type="button" className={on ? ghost : solid} disabled={busy || (!on && !ready)} onClick={() => void onSave({ sending_on: !on })}>
              {on ? "Turn sending off" : "Turn sending on"}
            </button>
          </div>
        </div>
        <div className={cn(card, "grid gap-3")}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-medium">Daily hotel scan</h3>
            <Chip tone={paused ? "muted" : "ok"}>{paused ? "Paused" : "On · 10:41 AM daily"}</Chip>
          </div>
          <p className="text-muted-foreground text-sm">Each day it looks at a new US region for up to 6 boutique hotels and unique stays, keeps only emails printed on the property's own site, and drafts a pitch for you to review. Nothing is sent from the scan.</p>
          <div>
            <button type="button" className={ghost} disabled={busy} onClick={() => void onSave({ paused_scan: !paused })}>
              {paused ? "Resume scan" : "Pause scan"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- page ---------- */
export default function Admin() {
  const [pass, setPass] = useState(() => read(PASS_KEY));
  const [typed, setTyped] = useState("");
  const [data, setData] = useState<Overview | null>(null);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"pipeline" | "site" | "settings">(() => (["site", "settings"].includes(read(TAB_KEY)) ? (read(TAB_KEY) as "site" | "settings") : "pipeline"));
  const [filter, setFilter] = useState("review");
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const pick = (t: typeof tab) => {
    setTab(t);
    write(TAB_KEY, t);
  };

  const call = useCallback(
    async <T extends { ok: boolean; error?: string },>(body: Record<string, unknown>, p = pass): Promise<T | null> => {
      setBusy(true);
      setErr("");
      try {
        const r = await fetch(ADMIN_URL, { method: "POST", headers: { "Content-Type": "application/json", "X-Studio-Key": p }, body: JSON.stringify(body) });
        if (r.status === 401 || r.status === 403) throw new Error("That passcode didn't work.");
        const d = (await r.json()) as T;
        if (!d.ok) throw new Error(d.error || "Something went wrong.");
        return d;
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Something went wrong.");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [pass],
  );
  const load = useCallback(
    async (p = pass) => {
      const d = await call<Overview>({ action: "overview" }, p);
      if (d) setData(d);
      return d;
    },
    [call, pass],
  );
  useEffect(() => {
    if (pass) void load(pass);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const flash = (m: string) => {
    setOk(m);
    setTimeout(() => setOk(""), 2500);
  };
  const saveProspect = async (key: string, patch: Record<string, unknown>, action = "update") => {
    const d = await call<Resp>(action === "redraft" ? { action, prospect_key: key } : { action, prospect_key: key, patch });
    if (!d) return false;
    if (d.prospect) setData((cur) => (cur ? { ...cur, prospects: cur.prospects.map((x) => (x.prospect_key === key ? { ...x, ...d.prospect } : x)) } : cur));
    flash(action === "redraft" ? "New draft written." : "Saved.");
    return true;
  };
  const addHotel = async (f: Record<string, string>) => {
    const d = await call<Resp>({ action: "add", ...f });
    if (!d) return false;
    await load();
    setFilter("review");
    flash("Added. The draft is at the top of To review.");
    return true;
  };
  const saveSettings = async (v: Record<string, string | boolean>) => {
    const d = await call<Resp>({ action: "settings", values: v });
    if (!d) return false;
    if (d.settings) setData((cur) => (cur ? { ...cur, settings: d.settings! } : cur));
    flash("Settings saved.");
    return true;
  };

  const now = Date.now();
  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.key, (data?.prospects || []).filter((p) => f.test(p, now)).length])), [data, now]);
  const shown = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter) || FILTERS[0];
    const t = q.trim().toLowerCase();
    return (data?.prospects || [])
      .filter((p) => f.test(p, now))
      .filter((p) => !t || [p.property, p.city, p.state, p.region, p.contact_email, p.instagram].join(" ").toLowerCase().includes(t))
      .sort((a, b) => (filter === "review" ? b.score - a.score || b.created_at.localeCompare(a.created_at) : b.created_at.localeCompare(a.created_at)));
  }, [data, filter, q, now]);

  if (!pass || (!data && err === "That passcode didn't work.")) {
    return (
      <main className="font-label grid min-h-[80dvh] place-items-center px-5 pt-24">
        <form
          className={cn(card, "grid w-full max-w-sm gap-4")}
          onSubmit={(e) => {
            e.preventDefault();
            const p = typed.trim();
            if (!p) return;
            void load(p).then((d) => {
              if (d) {
                write(PASS_KEY, p);
                setPass(p);
              }
            });
          }}
        >
          <Lock className="size-6" strokeWidth={1.5} />
          <h1 className="font-serif text-2xl tracking-[0.04em] uppercase">Your admin</h1>
          <p className="text-muted-foreground text-sm">Use the same passcode as your Meredith Studio.</p>
          <Input type="password" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Passcode" autoFocus />
          {err ? <p className="text-destructive text-sm">{err}</p> : null}
          <button type="submit" className={solid} disabled={busy}>
            {busy ? "Checking…" : "Open"}
          </button>
          <p className="text-muted-foreground text-xs">This browser stops counting as a visitor once you're in.</p>
        </form>
      </main>
    );
  }

  const st = data?.settings || {};
  return (
    <main className="font-label mx-auto w-full max-w-6xl px-5 pt-24 pb-16 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={label}>Meredith &amp; Bernie</p>
          <h1 className="mt-1 font-serif text-3xl tracking-[0.04em] uppercase">Partnerships admin</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={st.sending_on === "true" ? "ok" : "muted"}>{st.sending_on === "true" ? `Sending on · ${data?.sent_today ?? 0}/${st.daily_cap || 15} today` : "Sending off"}</Chip>
          <button type="button" className={ghost} disabled={busy} onClick={() => void load()}>
            <RefreshCw className={cn("size-4", busy && "animate-spin")} /> Refresh
          </button>
          <button
            type="button"
            className={cn(ghost, "text-muted-foreground")}
            onClick={() => {
              write(PASS_KEY, "");
              setPass("");
              setData(null);
            }}
          >
            Lock
          </button>
        </div>
      </div>

      <nav className="border-border mt-8 flex gap-1 border-b" aria-label="Admin sections">
        {(
          [
            ["pipeline", "Hotel pipeline"],
            ["site", "Site visits"],
            ["settings", "Settings"],
          ] as const
        ).map(([k, t]) => (
          <button key={k} type="button" onClick={() => pick(k)} className={cn("-mb-px border-b-2 px-4 py-2.5 text-sm", tab === k ? "border-foreground font-medium" : "text-muted-foreground hover:text-foreground border-transparent")}>
            {t}
          </button>
        ))}
      </nav>

      <div className="mt-4 min-h-6" aria-live="polite">
        {err ? <p className="text-destructive text-sm">{err}</p> : ok ? <p className="text-sm text-emerald-700">{ok}</p> : null}
      </div>

      {!data ? (
        <p className="text-muted-foreground mt-6">Loading…</p>
      ) : tab === "site" ? (
        <StatsPanel st={data.stats} />
      ) : tab === "settings" ? (
        <SettingsPanel st={st} sentToday={data.sent_today} onSave={saveSettings} busy={busy} />
      ) : (
        <section className="grid gap-4">
          {!st.site_url || !st.postal_address ? (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              Before anything sends: add your site address and mailing address in{" "}
              <button type="button" className="underline" onClick={() => pick("settings")}>
                Settings
              </button>
              . You can review and edit drafts now.
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1">
              {FILTERS.map((f) => (
                <button key={f.key} type="button" onClick={() => setFilter(f.key)} className={cn("rounded-full px-3 py-1.5 text-sm", filter === f.key ? "bg-foreground text-background" : "hover:bg-muted")}>
                  {f.label} <span className="tabular-nums opacity-70">{counts[f.key] || 0}</span>
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <label className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="h-9 w-44 pl-9" />
              </label>
              <button type="button" className={solid} onClick={() => setAdding(true)}>
                <Plus className="size-4" /> Add a hotel
              </button>
            </div>
          </div>
          {adding ? <AddHotel onAdd={addHotel} busy={busy} onClose={() => setAdding(false)} /> : null}
          {shown.length ? (
            shown.map((p) => <ProspectCard key={p.prospect_key} p={p} st={st} onSave={saveProspect} busy={busy} />)
          ) : (
            <div className={cn(card, "text-muted-foreground text-sm")}>
              {filter === "review" ? "Nothing to review right now. The daily scan adds new hotels at 10:41 AM, or add one yourself." : "Nothing here yet."}
            </div>
          )}
          <p className="text-muted-foreground text-xs">
            Every scanned email was checked on the property's own website before it shows here. Nothing sends until you approve it.{" "}
            <a href="/" className="inline-flex items-center gap-1 underline underline-offset-2">
              View site <ArrowUpRight className="size-3" />
            </a>{" "}
            <a href="https://mail.google.com/mail/?authuser=meredithkbrice@gmail.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2">
              Gmail <ExternalLink className="size-3" />
            </a>
          </p>
        </section>
      )}
    </main>
  );
}

