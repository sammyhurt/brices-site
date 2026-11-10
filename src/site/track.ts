/**
 * Visit log for the Meredith & Bernie partnership site. Every page view and a few key actions (media kit opened,
 * inquiry sent, TikTok / Instagram / gallery / email clicks) are sent with: page, device type, where the visitor came
 * from, a random per-visit session id and, for tracked outreach links (?for=code), the link code.
 * No names, emails, IP addresses or cookies are stored. Your own browser is skipped once you've opened /admin.
 */
export const VISIT_URL = "https://subletlyco.app.n8n.cloud/webhook/brices-visit";
const KEY = "mb-for";
const SESSION_KEY = "mb-session";
const SOURCE_KEY = "mb-source";
const OWNER_KEY = "mb-admin-pass";

export function visitCode(): string {
  try {
    const q = new URLSearchParams(location.search).get("for");
    if (q) {
      const c = q.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
      if (c) sessionStorage.setItem(KEY, c);
    }
    return sessionStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
}

function session(): string {
  try {
    let s = sessionStorage.getItem(SESSION_KEY);
    if (!s) {
      s = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-6);
      sessionStorage.setItem(SESSION_KEY, s);
    }
    return s;
  } catch {
    return Math.random().toString(36).slice(2, 12);
  }
}

function source(): string {
  try {
    const saved = sessionStorage.getItem(SOURCE_KEY);
    if (saved) return saved;
    const utm = (new URLSearchParams(location.search).get("utm_source") || "").toLowerCase();
    let host = "";
    try {
      host = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, "") : "";
    } catch {
      host = "";
    }
    const pick = (h: string) =>
      /instagram/.test(h) ? "instagram" : /tiktok/.test(h) ? "tiktok" : /google\./.test(h) ? "google" : /bing\./.test(h) ? "bing" : /linkedin|lnkd\.in/.test(h) ? "linkedin" :
      /facebook|fb\.com/.test(h) ? "facebook" : /pinterest/.test(h) ? "pinterest" : /mail\.|outlook|gmail/.test(h) ? "email" : "";
    let s = utm ? pick(utm) || (utm === "email" ? "email" : "other") : "";
    if (!s && host) s = host === location.hostname ? "internal" : pick(host) || "other";
    if (!s) s = visitCode() ? "email" : "direct";
    sessionStorage.setItem(SOURCE_KEY, s);
    return s;
  } catch {
    return "direct";
  }
}

function isOwnerOrBot(): boolean {
  if (/bot|crawl|spider|preview|facebookexternalhit|slurp|headless|lighthouse/i.test(navigator.userAgent)) return true;
  try {
    return !!localStorage.getItem(OWNER_KEY);
  } catch {
    return false;
  }
}

const device = () => (/iPad|Tablet/i.test(navigator.userAgent) ? "tablet" : /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "phone" : "desktop");
const sent = new Set<string>();

function send(kind: "page" | "event", page: string) {
  const key = kind + ":" + page;
  if (sent.has(key) || isOwnerOrBot()) return;
  sent.add(key);
  const body = JSON.stringify({ kind, page: page.slice(0, 80), code: visitCode(), session: session(), source: source(), device: device() });
  try {
    void fetch(VISIT_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => undefined);
  } catch {
    /* tracking never blocks the page */
  }
}

/** Counted only once the page is actually on screen (not background tabs or prerendering). */
function whenSeen(fn: () => void) {
  const d = document as Document & { prerendering?: boolean };
  const seen = () => !d.prerendering && d.visibilityState === "visible";
  if (seen()) return fn();
  const check = () => {
    if (!seen()) return;
    document.removeEventListener("visibilitychange", check);
    document.removeEventListener("prerenderingchange", check);
    fn();
  };
  document.addEventListener("visibilitychange", check);
  document.addEventListener("prerenderingchange", check);
}

export function logVisit(page: string) {
  source();
  whenSeen(() => send("page", page));
}

export type EventName = "kit" | "inquiry" | "tiktok" | "instagram" | "gallery" | "email";
export function trackEvent(name: EventName) {
  send("event", name);
}

/** Media kit, TikTok, Instagram, Pixieset gallery and email clicks anywhere on the site. */
export function watchClicks() {
  document.addEventListener(
    "click",
    (e) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a") as HTMLAnchorElement | null;
      if (!a) return;
      const h = a.getAttribute("href") || "";
      if (/\.pdf($|\?)/i.test(h)) trackEvent("kit");
      else if (/tiktok\.com/i.test(h)) trackEvent("tiktok");
      else if (/instagram\.com/i.test(h)) trackEvent("instagram");
      else if (/pixieset\.com/i.test(h)) trackEvent("gallery");
      else if (h.startsWith("mailto:")) trackEvent("email");
    },
    { capture: true },
  );
}
