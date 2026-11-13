/**
 * Edit mode for the preview site.
 *
 * The arrangement of the site (order of sections, photos and videos, which part of a photo shows, which photo is in
 * which spot, sizes, hidden items, added photos) lives in one small object, the Layout. The committed default is
 * layout.json. On a preview link, after signing in at /admin, Bernie or Meredith can switch on edit mode and change it;
 * their changes are a draft kept in their browser and saved to n8n ("Save draft") so they can be made permanent.
 * On thebrices.co itself there is no edit button and only layout.json applies.
 */
import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ImgHTMLAttributes, type ReactNode } from "react";

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
}
export type Mode = "arrange" | "reframe" | "swap";
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
  mode: Mode;
  changed: boolean;
  canUndo: boolean;
  setMode(m: Mode): void;
  setEditing(on: boolean): void;
  change(fn: (l: Layout) => void): void;
  undo(): void;
  reset(): void;
  picker: Picker;
  pick(p: Picker): void;
}
const LayoutCtx = createContext<Ctx>({ L: BASE, editing: false, mode: "arrange", changed: false, canUndo: false, setMode() {}, setEditing() {}, change() {}, undo() {}, reset() {}, picker: null, pick() {} });
export const useLayout = () => useContext(LayoutCtx);

const Editor = lazy(() => import("./editor"));

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Layout | null>(loadDraft);
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<Mode>("arrange");
  const [picker, pick] = useState<Picker>(null);
  const [allowed, setAllowed] = useState(false);
  const past = useRef<(Layout | null)[]>([]);
  const [, bump] = useState(0);
  useEffect(() => setAllowed(canEdit()), []);

  const change = useCallback((fn: (l: Layout) => void) => {
    setDraft((cur) => {
      past.current.push(cur);
      if (past.current.length > 60) past.current.shift();
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

  // While editing, clicks on the site itself don't follow links or open photos; only the edit controls respond.
  useEffect(() => {
    if (!editing) return;
    const stop = (e: Event) => {
      const t = e.target as Element | null;
      if (t?.closest?.("[data-edit-ui]")) return;
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener("click", stop, true);
    document.documentElement.classList.add("editing");
    return () => {
      document.removeEventListener("click", stop, true);
      document.documentElement.classList.remove("editing");
    };
  }, [editing]);

  const value = useMemo<Ctx>(
    () => ({ L: draft || BASE, editing, mode, changed: !!draft, canUndo: past.current.length > 0, setMode, setEditing, change, undo, reset, picker, pick }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft, editing, mode, change, undo, reset, picker, past.current.length],
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
  const hidden = new Set(L.hidden?.[k] || []);
  let out = items;
  if (order) {
    const pos = new Map(order.map((id, i) => [id, i]));
    out = items.slice().sort((a, b) => (pos.get(idOf(a)) ?? 1e6 + items.indexOf(a)) - (pos.get(idOf(b)) ?? 1e6 + items.indexOf(b)));
  }
  return out.filter((t) => !hidden.has(idOf(t)));
}
export function useArranged<T>(k: string, items: T[], idOf: (t: T) => string): T[] {
  const { L } = useLayout();
  return useMemo(() => arranged(L, k, items, idOf), [L, k, items]); // eslint-disable-line react-hooks/exhaustive-deps
}
/** A photo list: its own photos plus any added in edit mode, in the saved order. */
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

const chip = "grid h-7 min-w-7 place-items-center rounded-full bg-black/80 px-2 text-[11px] font-semibold text-white shadow hover:bg-black";

/**
 * A photo in a named spot. Shows the photo chosen for that spot (if it was swapped) and keeps the chosen part in view.
 * In edit mode: "Reframe" lets you drag the photo inside its frame; "Swap photo" lets you click it to pick another.
 */
export function Pic({ slot, name, focus, className, style, ...rest }: { slot: string; name: string; focus?: string } & Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "slot">) {
  const { L, editing, mode, change, pick } = useLayout();
  const shown = L.swap?.[slot] || name;
  const pos = L.focus?.[slot] || focus;
  const drag = useRef<{ x: number; y: number; fx: number; fy: number } | null>(null);
  const s: CSSProperties = { ...style, ...(pos ? { objectPosition: pos } : null) };
  if (shown !== name) {
    // a swapped photo has no smaller copies prepared for it
    delete (rest as ImgHTMLAttributes<HTMLImageElement>).srcSet;
    delete (rest as ImgHTMLAttributes<HTMLImageElement>).sizes;
  }
  if (!editing) return <img src={media(shown)} className={className} style={s} {...rest} />;
  const parse = () => {
    const m = (pos || "50% 50%").match(/([\d.]+)%\s+([\d.]+)%/);
    return m ? [Number(m[1]), Number(m[2])] : [50, 50];
  };
  return (
    <img
      src={media(shown)}
      {...rest}
      data-slot={slot}
      data-edit-ui={mode === "swap" || mode === "reframe" ? "" : undefined}
      draggable={false}
      className={cn(className, mode === "reframe" && "cursor-move touch-none outline outline-2 -outline-offset-2 outline-sky-400/70", mode === "swap" && "cursor-pointer outline outline-2 -outline-offset-2 outline-amber-400/80")}
      style={s}
      onClick={
        mode === "swap"
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              pick({ title: "Choose a photo for this spot", onPick: (n) => change((l) => ((l.swap ||= {})[slot] = n)) });
            }
          : undefined
      }
      onPointerDown={
        mode === "reframe"
          ? (e) => {
              const [fx, fy] = parse();
              drag.current = { x: e.clientX, y: e.clientY, fx, fy };
              (e.target as Element).setPointerCapture?.(e.pointerId);
            }
          : undefined
      }
      onPointerMove={
        mode === "reframe"
          ? (e) => {
              const d = drag.current;
              if (!d) return;
              const b = (e.target as HTMLElement).getBoundingClientRect();
              // dragging right shows more of the photo's left side, like sliding a print under a mat
              const nx = Math.max(0, Math.min(100, d.fx - ((e.clientX - d.x) / b.width) * 100));
              const ny = Math.max(0, Math.min(100, d.fy - ((e.clientY - d.y) / b.height) * 100));
              (e.target as HTMLElement).style.objectPosition = `${nx.toFixed(0)}% ${ny.toFixed(0)}%`;
            }
          : undefined
      }
      onPointerUp={
        mode === "reframe"
          ? (e) => {
              if (!drag.current) return;
              drag.current = null;
              const v = (e.target as HTMLElement).style.objectPosition;
              if (v) change((l) => ((l.focus ||= {})[slot] = v));
            }
          : undefined
      }
    />
  );
}

/**
 * One item of a list that can be rearranged (a photo, a video, a section). Outside edit mode it is just a box with the
 * item's layout classes. In edit mode ("Arrange") it can be dragged onto another item, moved with the arrows, or hidden.
 */
export function Item({ k, id, ids, className, children, vertical, label }: { k: string; id: string; ids: string[]; className?: string; children: ReactNode; vertical?: boolean; label?: string }) {
  const { editing, mode, change } = useLayout();
  const [over, setOver] = useState(false);
  if (!editing || mode !== "arrange") return <div className={cn("relative", className)}>{children}</div>;
  const i = ids.indexOf(id);
  const dragType = "text/x-" + k.replace(/[^a-z0-9]/gi, "-").toLowerCase();
  const start = (e: React.DragEvent) => {
    e.dataTransfer.setData(dragType, id);
    e.dataTransfer.effectAllowed = "move";
    e.stopPropagation();
  };
  const move = (to: number) => {
    if (to < 0 || to >= ids.length || to === i) return;
    const next = ids.slice();
    next.splice(i, 1);
    next.splice(to, 0, id);
    change((l) => ((l.order ||= {})[k] = next));
  };
  return (
    <div
      className={cn("relative", className, over && "outline outline-2 outline-offset-2 outline-sky-400")}
      onDragOver={(e) => {
        // each list has its own drag type, so a photo can't be dropped on a section or another list
        if (e.dataTransfer.types.includes(dragType)) {
          e.preventDefault();
          e.stopPropagation();
          setOver(true);
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false);
        const fromId = e.dataTransfer.getData(dragType);
        if (!fromId || fromId === id) return;
        e.preventDefault();
        e.stopPropagation();
        const next = ids.filter((x) => x !== fromId);
        next.splice(next.indexOf(id) + (ids.indexOf(fromId) < i ? 1 : 0), 0, fromId);
        change((l) => ((l.order ||= {})[k] = next));
      }}
    >
      {children}
      {/* photos and videos: the whole tile is the handle. Sections: only the name tag, so what's inside stays reachable. */}
      {vertical ? null : <div data-edit-ui draggable onDragStart={start} className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing" />}
      <div data-edit-ui className={cn("absolute z-20 flex gap-1", vertical ? "top-3 right-3" : "top-1.5 left-1.5")}>
        {label ? (
          <span draggable onDragStart={start} className={cn(chip, "cursor-grab px-3 font-normal tracking-wide")}>
            ⠿ {label}
          </span>
        ) : null}
        <button type="button" className={chip} aria-label={vertical ? "Move up" : "Move earlier"} disabled={i === 0} onClick={() => move(i - 1)}>
          {vertical ? "↑" : "←"}
        </button>
        <button type="button" className={chip} aria-label={vertical ? "Move down" : "Move later"} disabled={i === ids.length - 1} onClick={() => move(i + 1)}>
          {vertical ? "↓" : "→"}
        </button>
        <button
          type="button"
          className={chip}
          aria-label="Hide"
          title="Hide (bring it back from the toolbar)"
          onClick={() =>
            change((l) => {
              const h = ((l.hidden ||= {})[k] ||= []);
              if (!h.includes(id)) h.push(id);
            })
          }
        >
          ✕
        </button>
      </div>
    </div>
  );
}

/** Edit-only: Small / Medium / Large for a list or a photo. */
export function SizeChips({ k, fallback = "m", label = "Size" }: { k: string; fallback?: "s" | "m" | "l"; label?: string }) {
  const { editing, mode, change } = useLayout();
  const cur = useSize(k, fallback);
  if (!editing || mode !== "arrange") return null;
  return (
    <div data-edit-ui className="mb-3 flex items-center gap-1.5 font-sans text-[11px]">
      <span className="rounded-full bg-black/80 px-2.5 py-1 text-white">{label}</span>
      {(["s", "m", "l"] as const).map((s) => (
        <button key={s} type="button" aria-pressed={cur === s} onClick={() => change((l) => ((l.size ||= {})[k] = s))} className={cn(chip, cur === s && "bg-sky-500 hover:bg-sky-500")}>
          {s === "s" ? "Small" : s === "m" ? "Medium" : "Large"}
        </button>
      ))}
    </div>
  );
}

/** Edit-only: a tile at the end of a photo list that adds another photo from the library. */
export function AddPhoto({ k, className }: { k: string; className?: string }) {
  const { editing, mode, change, pick } = useLayout();
  if (!editing || mode !== "arrange") return null;
  return (
    <button
      type="button"
      data-edit-ui
      className={cn("grid min-h-24 place-items-center rounded-sm border-2 border-dashed border-sky-500/70 bg-sky-500/10 font-sans text-sm font-semibold text-sky-700", className)}
      onClick={() =>
        pick({
          title: "Add a photo here",
          onPick: (n) =>
            change((l) => {
              const a = ((l.added ||= {})[k] ||= []);
              if (!a.includes(n)) a.push(n);
              const h = l.hidden?.[k];
              if (h) l.hidden![k] = h.filter((x) => x !== n);
            }),
        })
      }
    >
      + Add photo
    </button>
  );
}
