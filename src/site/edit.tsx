/**
 * Edit mode for the preview site.
 *
 * The arrangement of the site (order of sections, photos and videos, which part of a photo shows, which photo is in
 * which spot, sizes, hidden items, added photos) lives in one small object, the Layout. The committed default is
 * layout.json. On a preview link, after signing in at /admin, Bernie or Meredith can switch on edit mode and change it;
 * their changes are a draft kept in their browser and saved to n8n ("Save draft") so they can be made permanent.
 * On thebrices.co itself there is no edit button and only layout.json applies.
 *
 * This file only describes the pieces (which box is a photo, a video, a section). Everything you do in edit mode,
 * selecting, dragging, resizing, the toolbars, lives in editor.tsx, which visitors never download.
 */
import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ImgHTMLAttributes, type MutableRefObject, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import defaults from "./layout.json";
import { media } from "./parts";

export interface Layout {
  v?: number;
  order?: Record<string, string[]>; // list -> ids in the order to show them
  hidden?: Record<string, string[]>; // list -> ids not shown
  added?: Record<string, string[]>; // photo list -> extra photo names
  focus?: Record<string, string>; // photo spot -> "x% y%" (which part of the photo stays in view)
  swap?: Record<string, string>; // photo spot -> photo name shown there instead
  size?: Record<string, string>; // list or photo -> "s" | "m" | "l"
  moved?: Record<string, string[]>; // list -> ids dragged out of it into another list
  style?: Record<string, Sty>; // "p|<photo spot>" or "i|<list>|<id>" -> look and free position
}
/** A free position for one screen size: how far it is moved from its normal spot, and how much it is scaled. */
export interface Free {
  x: number;
  y: number;
  s?: number;
}
/** The look of one photo, video or section. Everything is optional; nothing set means "as designed". */
export interface Sty {
  bri?: number; // exposure, 100 = unchanged
  con?: number; // contrast
  sat?: number; // saturation
  blur?: number; // layer blur, px
  bg?: number; // background blur, px (shows through see-through things)
  op?: number; // opacity, 100 = solid
  blend?: string; // blend mode
  mask?: "round" | "circle" | "arch";
  ar?: string; // frame shape, e.g. "1 / 1"
  shadow?: "s" | "m" | "l";
  inner?: "s" | "m" | "l";
  fill?: string; // a color or gradient behind a section
  free?: { d?: Free; t?: Free; p?: Free }; // free position on desktop, tablet, phone
  box?: { d?: Box; t?: Box; p?: Box }; // a width and/or height set by hand, per screen size
  rad?: number; // corner roundness, px
  text?: string; // words: what it says instead
  fs?: number; // words: size, 100 = as designed
  align?: "left" | "center" | "right";
  color?: string;
  hide?: boolean; // words: not shown
}
export interface Box {
  w?: number;
  h?: number;
}
const SHADOW = { s: "0 6px 16px -6px rgb(0 0 0 / 0.35)", m: "0 18px 40px -14px rgb(0 0 0 / 0.5)", l: "0 34px 70px -18px rgb(0 0 0 / 0.65)" };
export const INNER = { s: "inset 0 0 18px rgb(0 0 0 / 0.3)", m: "inset 0 0 40px rgb(0 0 0 / 0.45)", l: "inset 0 0 80px rgb(0 0 0 / 0.6)" };
/** Turn a saved look into styles. Free positions go into variables that global.css applies per screen size. */
export function look(s?: Sty): CSSProperties | undefined {
  if (!s) return undefined;
  const o: Record<string, string | number> = {};
  const f = [s.bri != null && s.bri !== 100 && `brightness(${s.bri}%)`, s.con != null && s.con !== 100 && `contrast(${s.con}%)`, s.sat != null && s.sat !== 100 && `saturate(${s.sat}%)`, s.blur && `blur(${s.blur}px)`].filter(Boolean);
  if (f.length) o.filter = f.join(" ");
  if (s.bg) o.backdropFilter = o.WebkitBackdropFilter = `blur(${s.bg}px)`;
  if (s.op != null && s.op !== 100) o.opacity = s.op / 100;
  if (s.blend) o.mixBlendMode = s.blend;
  if (s.rad != null) o.borderRadius = `${s.rad}px`;
  if (s.mask) o.borderRadius = s.mask === "round" ? "1.5rem" : s.mask === "circle" ? "9999px" : "9999px 9999px 0 0";
  if (s.ar || s.mask === "circle") o.aspectRatio = s.ar || "1 / 1";
  if (s.shadow) o.boxShadow = SHADOW[s.shadow];
  if (s.fill) o["--fill"] = s.fill;
  for (const d of ["d", "t", "p"] as const) {
    const fr = s.free?.[d];
    if (!fr) continue;
    o[`--fx-${d}`] = `${fr.x}px`;
    o[`--fy-${d}`] = `${fr.y}px`;
    o[`--fs-${d}`] = fr.s ?? 1;
  }
  for (const d of ["d", "t", "p"] as const) {
    const b = s.box?.[d];
    if (b?.w) o[`--w-${d}`] = `${b.w}px`;
    if (b?.h) o[`--h-${d}`] = `${b.h}px`;
  }
  return o as CSSProperties;
}
/** Marks that tell global.css on which screen sizes a hand-set width or height applies. */
function boxed(s?: Sty): Record<string, string> | undefined {
  if (!s?.box) return undefined;
  const o: Record<string, string> = {};
  for (const d of ["d", "t", "p"] as const) {
    if (s.box[d]?.w) o[`data-w${d}`] = "";
    if (s.box[d]?.h) o[`data-h${d}`] = "";
  }
  return o;
}

/* ---------- words ---------- */

/**
 * The words on a page (headings, paragraphs, buttons, the numbers) are not wrapped one by one in the page code.
 * Instead each gets a name from where it sits: its section, its kind and its count there ("t|about|p1"), and a saved
 * look for that name is put on it here, straight after the page draws. In edit mode they are also marked selectable.
 */
const WORDS = "h1,h2,h3,h4,p,li,dd,blockquote,figcaption,a[class*='rounded-full']";
const original = new WeakMap<Element, string>();
const put = (el: HTMLElement, prop: string, v: string | undefined) => {
  if (v) {
    if (el.style.getPropertyValue(prop) !== v) el.style.setProperty(prop, v);
  } else if (el.style.getPropertyValue(prop)) el.style.removeProperty(prop);
};
/** Set what a piece of text says, keeping a headline's decorative first letter in its own span. */
export function setWords(el: HTMLElement, text: string) {
  const [a, b] = Array.from(el.children) as HTMLElement[];
  if (el.children.length === 2 && a.tagName === "SPAN" && b.tagName === "SPAN" && !a.children.length && !b.children.length) {
    if (a.textContent !== text.charAt(0)) a.textContent = text.charAt(0);
    if (b.textContent !== text.slice(1)) b.textContent = text.slice(1);
  } else if (el.textContent !== text) el.textContent = text;
}
export function applyWords(L: Layout, editing: boolean) {
  const main = document.querySelector("main");
  if (!main) return;
  const styles = L.style || {};
  if (!editing && !main.querySelector("[data-tk]") && !Object.keys(styles).some((k) => k.startsWith("t|"))) return;
  const count: Record<string, number> = {};
  main.querySelectorAll<HTMLElement>(WORDS).forEach((el) => {
    if (el.closest("[data-edit-ui],form") || el.querySelector(WORDS) || el.classList.contains("sr-only")) return;
    const sec = el.closest<HTMLElement>("[data-sec]")?.dataset.sec || "page:" + location.pathname;
    const tag = el.tagName.toLowerCase();
    const n = (count[sec + tag] = (count[sec + tag] ?? -1) + 1);
    const key = `t|${sec}|${tag}${n}`;
    const st = styles[key];
    if (el.dataset.tk !== key) el.dataset.tk = key;
    if (editing) el.dataset.ed = "text";
    else delete el.dataset.ed;
    if (el.isContentEditable) return; // being typed in right now
    for (const d of ["d", "t", "p"] as const) {
      const fr = st?.free?.[d];
      put(el, `--fx-${d}`, fr ? `${fr.x}px` : undefined);
      put(el, `--fy-${d}`, fr ? `${fr.y}px` : undefined);
      put(el, `--fs-${d}`, fr ? String(fr.s ?? 1) : undefined);
    }
    const free = !!(st?.free && (st.free.d || st.free.t || st.free.p));
    if (free !== (el.dataset.free !== undefined)) free ? (el.dataset.free = "") : delete el.dataset.free;
    put(el, "opacity", st?.op != null && st.op !== 100 ? String(st.op / 100) : undefined);
    const f = [st?.blur && `blur(${st.blur}px)`, st?.shadow && `drop-shadow(${st.shadow === "s" ? "0 2px 4px rgb(0 0 0 / 0.35)" : st.shadow === "m" ? "0 6px 12px rgb(0 0 0 / 0.45)" : "0 12px 24px rgb(0 0 0 / 0.55)"})`].filter(Boolean).join(" ");
    put(el, "filter", f || undefined);
    put(el, "zoom", st?.fs && st.fs !== 100 ? String(st.fs / 100) : undefined);
    put(el, "text-align", st?.align);
    put(el, "color", st?.color);
    put(el, "display", st?.hide ? "none" : undefined);
    if (st?.text != null) {
      if (!original.has(el)) original.set(el, el.textContent || "");
      setWords(el, st.text);
    } else if (original.has(el)) {
      setWords(el, original.get(el)!);
      original.delete(el);
    }
  });
}
/** What a piece of text said before it was reworded in edit mode. */
export const wordsBefore = (el: Element) => original.get(el);
const isFree = (s?: Sty) => (s?.free && (s.free.d || s.free.t || s.free.p) ? "" : undefined);
/** How an item can be resized: where the size is stored, its value now, and the choices from small to large. */
export interface SizeSpec {
  k: string;
  v: string;
  o: string[];
  label?: string;
}
type Picker = { title: string; onPick: (name: string) => void } | null;

const DRAFT_KEY = "mb-layout-draft";
const PASS_KEY = "mb-admin-pass";
const BASE = defaults as Layout;

const store = {
  get(k: string) {
    try {
      return localStorage.getItem(k) || "";
    } catch {
      return "";
    }
  },
  set(k: string, v: string) {
    try {
      if (v) localStorage.setItem(k, v);
      else localStorage.removeItem(k);
    } catch {
      /* private window: the draft just won't survive a reload */
    }
  },
};
const live = () => typeof location !== "undefined" && /^(www\.)?thebrices\.co$/.test(location.hostname);
/** Editing is offered on preview links only, to someone who has signed in to the admin there. */
export const canEdit = () => !live() && !!store.get(PASS_KEY);
export const passcode = () => store.get(PASS_KEY);

function loadDraft(): Layout | null {
  if (live()) return null;
  try {
    const d = JSON.parse(store.get(DRAFT_KEY) || "null") as Layout | null;
    return d && (d.v || 0) === (BASE.v || 0) ? d : null; // a draft made against an older saved layout is dropped
  } catch {
    return null;
  }
}

interface Ctx {
  L: Layout;
  editing: boolean;
  changed: boolean;
  canUndo: boolean;
  setEditing(on: boolean): void;
  /** Change the draft. Changes that share a tag (one drag of a resize handle) count as one step for Undo. */
  change(fn: (l: Layout) => void, tag?: string): void;
  undo(): void;
  reset(): void;
  picker: Picker;
  pick(p: Picker): void;
  /** The ids each list is showing right now, in order (filled in by the items as they render). */
  lists: MutableRefObject<Record<string, string[]>>;
  /** The address of a photo by name: a site photo, or one uploaded in this browser. */
  src(name: string): string;
  addUpload(name: string, url: string): void;
  uploads: Record<string, string>;
}
const LayoutCtx = createContext<Ctx>({ L: BASE, editing: false, changed: false, canUndo: false, setEditing() {}, change() {}, undo() {}, reset() {}, picker: null, pick() {}, lists: { current: {} }, src: media, addUpload() {}, uploads: {} });
export const useLayout = () => useContext(LayoutCtx);

const Editor = lazy(() => import("./editor"));

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Layout | null>(loadDraft);
  const [editing, setEditing] = useState(false);
  const [picker, pick] = useState<Picker>(null);
  const [allowed, setAllowed] = useState(false);
  const past = useRef<(Layout | null)[]>([]);
  const lastTag = useRef("");
  const lists = useRef<Record<string, string[]>>({});
  const [, bump] = useState(0);
  const [uploads, setUploads] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!canEdit()) return;
    setAllowed(true);
    if (/[?&]edit=1/.test(location.search)) setEditing(true); // the tablet and phone previews open straight into editing
    import("./uploads").then((m) => m.loadAll()).then(setUploads);
    // the tablet and phone previews are the same page in a frame: pick up what was changed there (and the other way)
    const sync = (e: StorageEvent) => {
      if (e.key === DRAFT_KEY) setDraft(loadDraft());
      if (e.key === "mb-uploads-at") import("./uploads").then((m) => m.loadAll()).then(setUploads);
    };
    addEventListener("storage", sync);
    return () => removeEventListener("storage", sync);
  }, []);
  // put saved looks on the words after every draw, and again whenever the page changes under us
  const L0 = draft || BASE;
  useLayoutEffect(() => {
    applyWords(L0, editing);
    if (!editing && !Object.keys(L0.style || {}).some((k) => k.startsWith("t|"))) return;
    let raf = 0;
    const mo = new MutationObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => applyWords(L0, editing));
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [L0, editing]);
  const src = useCallback((name: string) => (name.startsWith("up:") ? uploads[name] || "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" : media(name)), [uploads]);
  const addUpload = useCallback((name: string, url: string) => {
    setUploads((u) => ({ ...u, [name]: url }));
    store.set("mb-uploads-at", String(Date.now()));
  }, []);

  const change = useCallback((fn: (l: Layout) => void, tag?: string) => {
    const again = !!tag && tag === lastTag.current;
    lastTag.current = tag || "";
    setDraft((cur) => {
      if (!again) past.current.push(cur);
      if (past.current.length > 80) past.current.shift();
      const next = JSON.parse(JSON.stringify(cur || BASE)) as Layout;
      fn(next);
      next.v = BASE.v || 0;
      store.set(DRAFT_KEY, JSON.stringify(next));
      return next;
    });
    bump((n) => n + 1);
  }, []);
  const undo = useCallback(() => {
    if (!past.current.length) return;
    const prev = past.current.pop() ?? null;
    store.set(DRAFT_KEY, prev ? JSON.stringify(prev) : "");
    setDraft(prev);
    bump((n) => n + 1);
  }, []);
  const reset = useCallback(() => {
    past.current.push(draft);
    store.set(DRAFT_KEY, "");
    setDraft(null);
    bump((n) => n + 1);
  }, [draft]);

  const value = useMemo<Ctx>(
    () => ({ L: draft || BASE, editing, changed: !!draft, canUndo: past.current.length > 0, setEditing, change, undo, reset, picker, pick, lists, src, addUpload, uploads }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft, editing, change, undo, reset, picker, past.current.length, src, addUpload, uploads],
  );
  return (
    <LayoutCtx.Provider value={value}>
      {children}
      {allowed ? (
        <Suspense fallback={null}>
          <Editor />
        </Suspense>
      ) : null}
    </LayoutCtx.Provider>
  );
}

/* ---------- reading the layout ---------- */

/** Items of a list in the saved order, without the hidden ones. New items the layout doesn't know yet keep their place at the end. */
export function arranged<T>(L: Layout, k: string, items: T[], idOf: (t: T) => string): T[] {
  const order = L.order?.[k];
  const gone = new Set([...(L.hidden?.[k] || []), ...(L.moved?.[k] || [])]);
  let out = items;
  if (order) {
    const pos = new Map(order.map((id, i) => [id, i]));
    out = items.slice().sort((a, b) => (pos.get(idOf(a)) ?? 1e6 + items.indexOf(a)) - (pos.get(idOf(b)) ?? 1e6 + items.indexOf(b)));
  }
  return out.filter((t) => !gone.has(idOf(t)));
}
/** A list of things (videos, sections): its own items plus any dragged in from another list, in the saved order. */
export function useArranged<T>(k: string, items: T[], idOf: (t: T) => string, pool?: Map<string, T>): T[] {
  const { L } = useLayout();
  return useMemo(() => {
    const have = new Set(items.map(idOf));
    const extra = pool ? ((L.added?.[k] || []).filter((id) => !have.has(id)).map((id) => pool.get(id)).filter(Boolean) as T[]) : [];
    return arranged(L, k, extra.length ? [...items, ...extra] : items, idOf);
  }, [L, k, items]); // eslint-disable-line react-hooks/exhaustive-deps
}
/** A photo list: its own photos plus any added or dragged in, in the saved order. */
export function usePhotos(k: string, names: string[]): string[] {
  const { L } = useLayout();
  return useMemo(() => arranged(L, k, [...names, ...(L.added?.[k] || []).filter((n) => !names.includes(n))], (n) => n), [L, k, names]);
}
export function useSize(k: string, fallback: "s" | "m" | "l" = "m"): "s" | "m" | "l" {
  const { L } = useLayout();
  const v = L.size?.[k];
  return v === "s" || v === "m" || v === "l" ? v : fallback;
}

/* ---------- pieces used by the pages ---------- */

/**
 * A photo in a named spot. Shows the photo chosen for that spot (if it was swapped) and keeps the chosen part in view.
 * In edit mode it can be selected, reframed, swapped, and other photos can be dropped onto it.
 */
export function Pic({ slot, name, focus, size, className, style, ...rest }: { slot: string; name: string; focus?: string; size?: SizeSpec } & Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "slot">) {
  const { L, editing, src } = useLayout();
  const shown = L.swap?.[slot] || name;
  const pos = L.focus?.[slot] || focus;
  const sty = L.style?.["p|" + slot];
  const s: CSSProperties = { ...style, ...(pos ? { objectPosition: pos } : null), ...look(sty) };
  if (shown !== name) {
    // a swapped photo has no smaller copies prepared for it
    delete (rest as ImgHTMLAttributes<HTMLImageElement>).srcSet;
    delete (rest as ImgHTMLAttributes<HTMLImageElement>).sizes;
  }
  if (!editing) return <img src={src(shown)} className={className} style={s} data-free={isFree(sty)} {...boxed(sty)} {...rest} />;
  return <img src={src(shown)} {...rest} className={className} style={s} data-free={isFree(sty)} {...boxed(sty)} draggable={false} data-ed="pic" data-slot={slot} data-name={shown} data-size={size ? JSON.stringify(size) : undefined} />;
}

/**
 * One movable thing: a photo, a video or a whole section. Outside edit mode it is just a box with the item's layout
 * classes. In edit mode it carries what the editor needs to know about it.
 * `flow` says which way its list runs: "x" side by side, "y" stacked.
 */
export function Item({ k, id, ids, type = "photo", flow = "x", label, size, group, className, children }: { k: string; id: string; ids: string[]; type?: "photo" | "clip" | "section"; flow?: "x" | "y"; label?: string; size?: SizeSpec; group?: SizeSpec; className?: string; children: ReactNode }) {
  const { L, editing, lists } = useLayout();
  const sty = L.style?.[`i|${k}|${id}`];
  const st = look(sty);
  const veil = sty?.inner ? <div aria-hidden className="pointer-events-none absolute inset-0 z-[1]" style={{ boxShadow: INNER[sty.inner], borderRadius: "inherit" }} /> : null;
  if (!editing)
    return (
      <div className={cn("relative", className)} style={st} data-free={isFree(sty)} data-fill={sty?.fill ? "" : undefined} data-sec={type === "section" ? id : undefined} {...boxed(sty)}>
        {children}
        {veil}
      </div>
    );
  lists.current[k] = ids;
  return (
    <div className={cn("relative", className)} style={st} data-free={isFree(sty)} data-fill={sty?.fill ? "" : undefined} data-sec={type === "section" ? id : undefined} {...boxed(sty)} data-ed="item" data-k={k} data-id={id} data-type={type} data-flow={flow} data-label={label} data-size={size ? JSON.stringify(size) : undefined} data-group={group ? JSON.stringify(group) : undefined}>
      {children}
      {veil}
    </div>
  );
}

/** Edit-only: a tile at the end of a photo list. Click it to add a photo from the library, or drop a photo on it. */
export function AddPhoto({ k, className }: { k: string; className?: string }) {
  const { editing, change, pick } = useLayout();
  if (!editing) return null;
  return (
    <button
      type="button"
      data-edit-ui
      data-drop-list={k}
      style={{ fontFamily: "system-ui, sans-serif" }}
      className={cn("grid min-h-24 place-items-center rounded-sm border-2 border-dashed border-sky-500/70 bg-sky-500/10 text-sm font-semibold text-sky-700", className)}
      onClick={() =>
        pick({
          title: "Add a photo here",
          onPick: (n) =>
            change((l) => {
              const a = ((l.added ||= {})[k] ||= []);
              if (!a.includes(n)) a.push(n);
              for (const key of ["hidden", "moved"] as const) {
                const h = l[key]?.[k];
                if (h) l[key]![k] = h.filter((x) => x !== n);
              }
            }),
        })
      }
    >
      + Add photo
    </button>
  );
}
