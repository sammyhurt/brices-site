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
import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ImgHTMLAttributes, type MutableRefObject, type ReactNode } from "react";

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
}
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
}
const LayoutCtx = createContext<Ctx>({ L: BASE, editing: false, changed: false, canUndo: false, setEditing() {}, change() {}, undo() {}, reset() {}, picker: null, pick() {}, lists: { current: {} } });
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
  useEffect(() => setAllowed(canEdit()), []);

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
    () => ({ L: draft || BASE, editing, changed: !!draft, canUndo: past.current.length > 0, setEditing, change, undo, reset, picker, pick, lists }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft, editing, change, undo, reset, picker, past.current.length],
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
  const { L, editing } = useLayout();
  const shown = L.swap?.[slot] || name;
  const pos = L.focus?.[slot] || focus;
  const s: CSSProperties = { ...style, ...(pos ? { objectPosition: pos } : null) };
  if (shown !== name) {
    // a swapped photo has no smaller copies prepared for it
    delete (rest as ImgHTMLAttributes<HTMLImageElement>).srcSet;
    delete (rest as ImgHTMLAttributes<HTMLImageElement>).sizes;
  }
  if (!editing) return <img src={media(shown)} className={className} style={s} {...rest} />;
  return <img src={media(shown)} {...rest} className={className} style={s} draggable={false} data-ed="pic" data-slot={slot} data-name={shown} data-size={size ? JSON.stringify(size) : undefined} />;
}

/**
 * One movable thing: a photo, a video or a whole section. Outside edit mode it is just a box with the item's layout
 * classes. In edit mode it carries what the editor needs to know about it.
 * `flow` says which way its list runs: "x" side by side, "y" stacked.
 */
export function Item({ k, id, ids, type = "photo", flow = "x", label, size, group, className, children }: { k: string; id: string; ids: string[]; type?: "photo" | "clip" | "section"; flow?: "x" | "y"; label?: string; size?: SizeSpec; group?: SizeSpec; className?: string; children: ReactNode }) {
  const { editing, lists } = useLayout();
  if (!editing) return <div className={cn("relative", className)}>{children}</div>;
  lists.current[k] = ids;
  return (
    <div className={cn("relative", className)} data-ed="item" data-k={k} data-id={id} data-type={type} data-flow={flow} data-label={label} data-size={size ? JSON.stringify(size) : undefined} data-group={group ? JSON.stringify(group) : undefined}>
      {children}
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
