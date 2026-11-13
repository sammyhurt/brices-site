/**
 * Edit mode itself, in the style of a page builder: click anything to select it, drag it where you want it, pull its
 * corner to resize it. Loaded only for a signed-in person on a preview link.
 *
 * The pages mark what can be edited (see Item and Pic in edit.tsx). Everything here works from those marks, so one
 * set of controls serves every photo, video and section on the site.
 */
import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils";

import { partnerships } from "./data";
import { passcode, useLayout, type Free, type Layout, type SizeSpec, type Sty } from "./edit";
import library from "./media-list.json";
import { go } from "./parts";
import { addPhoto } from "./uploads";

const ADMIN_URL = "https://subletlyco.app.n8n.cloud/webhook/brices-admin";
const ui = { fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" } as const;
const btn = "h-9 rounded-full px-3.5 text-[13px] font-semibold transition-colors disabled:opacity-40";
const tool = "grid h-8 min-w-8 place-items-center rounded-md px-2 text-[12px] font-semibold text-white hover:bg-white/15 disabled:opacity-35 disabled:hover:bg-transparent";
const SIZE_NAME: Record<string, string> = { s: "Small", m: "Medium", l: "Large" };
type Dev = "d" | "t" | "p";
const DEV_NAME = { d: "desktop", t: "tablet", p: "phone" };
/** Which screen size we are on right now (the same cut-offs the site's layout uses). */
const dev = (): Dev => (innerWidth < 640 ? "p" : innerWidth < 1024 ? "t" : "d");
const inFrame = () => /[?&]frame=1/.test(location.search);
const keyOf = (sel: NonNullable<Sel>) => (sel.kind === "item" ? `i|${sel.k}|${sel.id}` : `p|${sel.slot}`);
/** Change the look of one thing; a look with nothing left in it is removed. */
function restyle(l: Layout, key: string, fn: (s: Sty) => void) {
  const st = ((l.style ||= {})[key] ||= {});
  fn(st);
  for (const k of Object.keys(st) as (keyof Sty)[]) if (st[k] === undefined || st[k] === "") delete st[k];
  if (!Object.keys(st).length) delete l.style[key];
}

type Sel = { kind: "item"; k: string; id: string } | { kind: "pic"; slot: string } | null;
type Kind = "photo" | "clip" | "section" | "pic";
interface Hit {
  sel: NonNullable<Sel>;
  el: HTMLElement;
  type: Kind;
}
type Drop = { how: "insert"; k: string; id: string; after: boolean; el: HTMLElement; flow: string } | { how: "append"; k: string; el: HTMLElement } | { how: "replace"; slot: string; el: HTMLElement };

const esc = (s: string) => (typeof CSS !== "undefined" && CSS.escape ? CSS.escape(s) : s.replace(/["\\]/g, "\\$&"));
const same = (a: Sel, b: Sel) => !!a && !!b && a.kind === b.kind && (a.kind === "item" ? a.k === (b as typeof a).k && a.id === (b as typeof a).id : a.slot === (b as typeof a).slot);
const parse = (s?: string): SizeSpec | null => {
  try {
    return s ? (JSON.parse(s) as SizeSpec) : null;
  } catch {
    return null;
  }
};
function elOf(sel: Sel): HTMLElement | null {
  if (!sel) return null;
  return document.querySelector<HTMLElement>(sel.kind === "item" ? `[data-ed="item"][data-k="${esc(sel.k)}"][data-id="${esc(sel.id)}"]` : `img[data-ed="pic"][data-slot="${esc(sel.slot)}"]`);
}
const itemHit = (el: HTMLElement): Hit => ({ sel: { kind: "item", k: el.dataset.k!, id: el.dataset.id! }, el, type: el.dataset.type as Kind });
/** What is under the pointer: a photo or video if there is one (even behind a caption), otherwise the section. */
function hitAt(x: number, y: number): Hit | null {
  const stack = document.elementsFromPoint(x, y) as HTMLElement[];
  if (!stack.length || stack[0].closest("[data-edit-ui]")) return null;
  const tile = stack[0].closest<HTMLElement>('[data-ed="item"]:not([data-type="section"])');
  if (tile) return itemHit(tile);
  const img = stack.find((e) => e.matches?.('img[data-ed="pic"]'));
  if (img) {
    const inTile = img.closest<HTMLElement>('[data-ed="item"]:not([data-type="section"])');
    return inTile ? itemHit(inTile) : { sel: { kind: "pic", slot: img.dataset.slot! }, el: img, type: "pic" };
  }
  const sec = stack[0].closest<HTMLElement>('[data-ed="item"]');
  return sec ? itemHit(sec) : null;
}
/** The photo inside a selected thing, if it has one in a named spot. */
const slotOf = (el: HTMLElement | null) => (!el ? null : el.matches('img[data-ed="pic"]') ? (el as HTMLImageElement) : el.dataset.type === "section" ? null : el.querySelector<HTMLImageElement>('img[data-ed="pic"]'));

/** Put `id` into list `to` next to `beside` (or at the end). If it came from another list, take it out of that one. */
function place(l: Layout, lists: Record<string, string[]>, from: string | null, id: string, to: string, beside: string | null, after: boolean) {
  if (from && from !== to) {
    const a = l.added?.[from];
    if (a?.includes(id)) l.added![from] = a.filter((x) => x !== id);
    else {
      const m = ((l.moved ||= {})[from] ||= []);
      if (!m.includes(id)) m.push(id);
    }
    if (l.order?.[from]) l.order[from] = l.order[from].filter((x) => x !== id);
  }
  if (from !== to) {
    for (const key of ["moved", "hidden"] as const) {
      const h = l[key]?.[to];
      if (h) l[key]![to] = h.filter((x) => x !== id);
    }
    const a = ((l.added ||= {})[to] ||= []);
    if (!a.includes(id)) a.push(id);
  }
  const ids = (lists[to] || []).filter((x) => x !== id);
  const at = beside ? ids.indexOf(beside) : -1;
  ids.splice(at < 0 ? ids.length : at + (after ? 1 : 0), 0, id);
  (l.order ||= {})[to] = ids;
}

interface Info {
  type: Kind;
  k?: string;
  id?: string;
  flow: string;
  label: string;
  size: SizeSpec | null;
  group: SizeSpec | null;
  slot: string;
  index: number;
  count: number;
  key: string;
  picKey: string;
}

export default function Editor() {
  const { L, editing, changed, canUndo, setEditing, change, undo, reset, picker, pick, lists, src, addUpload, uploads } = useLayout();
  const LRef = useRef(L);
  LRef.current = L;
  const [design, setDesign] = useState(() => typeof innerWidth !== "undefined" && innerWidth >= 900);
  const [device, setDevice] = useState<"" | "t" | "p">("");
  const fileRef = useRef<HTMLInputElement>(null);
  const frame = inFrame();
  const [sel, setSel] = useState<Sel>(null);
  const [reframe, setReframe] = useState(false);
  const [info, setInfo] = useState<Info | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState<"" | "hidden" | "sections">("");
  const [, redraw] = useState(0);
  const selRef = useRef<Sel>(null);
  const reframeRef = useRef(false);
  selRef.current = sel;
  reframeRef.current = reframe;
  const boxRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const startDrag = useRef<(hit: Hit, x: number, y: number) => void>(() => {});

  const flash = useCallback((t: string) => {
    setNote(t);
    setTimeout(() => setNote((n) => (n === t ? "" : n)), 6000);
  }, []);
  const select = useCallback((s: Sel) => {
    setSel((cur) => (same(cur, s) ? cur : s));
    if (!same(selRef.current, s)) setReframe(false);
  }, []);

  /* What the selected thing is, read from the page after each change. */
  useEffect(() => {
    const el = elOf(sel);
    let next: Info | null = null;
    if (el && sel) {
      const d = el.dataset;
      const ids = sel.kind === "item" ? lists.current[sel.k] || [] : [];
      const type = (sel.kind === "pic" ? "pic" : d.type) as Kind;
      next = {
        type,
        k: d.k,
        id: d.id,
        flow: d.flow || "x",
        label: d.label || (type === "clip" ? "Video" : type === "section" ? "Section" : "Photo"),
        size: parse(d.size) || parse(slotOf(el)?.dataset.size),
        group: parse(d.group),
        slot: slotOf(el)?.dataset.slot || "",
        index: sel.kind === "item" ? ids.indexOf(sel.id) : -1,
        count: ids.length,
        key: keyOf(sel),
        picKey: slotOf(el)?.dataset.slot ? "p|" + slotOf(el)!.dataset.slot : "",
      };
    }
    if (JSON.stringify(next) !== JSON.stringify(info)) setInfo(next);
    if (sel && !el) setSel(null); // it was hidden, or we moved to another page
  });

  /* Keep the outline and its toolbar on the selected thing as the page scrolls or reflows. */
  useEffect(() => {
    if (!editing || !sel) return;
    let raf = 0;
    const tick = () => {
      const el = elOf(sel);
      const box = boxRef.current;
      const bar = barRef.current;
      if (el && box && bar) {
        const r = el.getBoundingClientRect();
        const section = el.dataset.type === "section";
        box.style.cssText = `display:block;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;
        const bw = bar.offsetWidth || 300;
        const want = section ? r.top + 10 : r.top - 44;
        const top = Math.max(8, Math.min(want < 8 && !section ? r.top + 8 : want, r.bottom - 44, innerHeight - 150));
        const left = Math.max(8, Math.min(section ? r.left + 10 : r.left, innerWidth - bw - 8));
        bar.style.left = left + "px";
        bar.style.top = top + "px";
        bar.style.visibility = r.bottom < 0 || r.top > innerHeight ? "hidden" : "visible";
        // the Design panel sits on whichever side the selected thing is not
        const panel = document.querySelector<HTMLElement>("[data-panel]");
        if (panel && innerWidth >= 700) {
          const onRight = r.left + r.width / 2 > innerWidth / 2 && r.left > 300;
          panel.style.left = onRight ? "8px" : "auto";
          panel.style.right = onRight ? "auto" : "8px";
        }
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [editing, sel, info]);

  /* While reframing, the photo itself takes the drag (also by touch). */
  useEffect(() => {
    const img = reframe ? slotOf(elOf(sel)) : null;
    if (!img) return;
    img.style.touchAction = "none";
    img.style.cursor = "move";
    return () => {
      img.style.touchAction = "";
      img.style.cursor = "";
    };
  }, [reframe, sel, L]);

  /* All pointer work on the page itself: select, drag to move, reframe. */
  useEffect(() => {
    if (!editing) return;
    const root = document.documentElement;
    root.classList.add("editing");
    let press: { x: number; y: number; hit: Hit } | null = null;
    let fd: { key: string; d: Dev; x: number; y: number; base: Free; tag: string } | null = null;
    const beginFree = (hit: Hit, x: number, y: number) => {
      const key = keyOf(hit.sel);
      const d = dev();
      fd = { key, d, x, y, base: LRef.current.style?.[key]?.free?.[d] || { x: 0, y: 0, s: 1 }, tag: "free" + Date.now() };
      press = null;
      root.classList.add("dragging");
    };
    let drag: { hit: Hit; drop: Drop | null; x: number; y: number } | null = null;
    let pan: { img: HTMLImageElement; x: number; y: number; fx: number; fy: number; id: number } | null = null;
    let swallow = false;
    let raf = 0;

    const showLine = (d: Drop | null) => {
      const line = lineRef.current;
      if (!line) return;
      if (!d) return void (line.style.display = "none");
      const r = d.el.getBoundingClientRect();
      if (d.how !== "insert") line.style.cssText = `display:block;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;background:rgb(14 165 233 / 0.25);outline:3px solid rgb(14 165 233);border-radius:6px`;
      else if (d.flow === "y") line.style.cssText = `display:block;left:${r.left}px;top:${Math.max(4, Math.min(innerHeight - 8, d.after ? r.bottom + 4 : r.top - 8)).toFixed(0)}px;width:${r.width}px;height:4px;background:rgb(14 165 233);border-radius:4px`;
      else line.style.cssText = `display:block;left:${(d.after ? r.right + 3 : r.left - 7).toFixed(0)}px;top:${r.top}px;width:4px;height:${r.height}px;background:rgb(14 165 233);border-radius:4px`;
    };
    const dropAt = (x: number, y: number, src: Hit): Drop | null => {
      const stack = document.elementsFromPoint(x, y) as HTMLElement[];
      const near = (type: string) => {
        for (const e of stack) {
          const it = e.closest<HTMLElement>(`[data-ed="item"][data-type="${type}"]`);
          if (it) return it;
        }
        return null;
      };
      const want = src.type === "pic" ? "photo" : src.type;
      const it = near(want);
      if (it) {
        if (it === src.el) return null;
        const r = it.getBoundingClientRect();
        const flow = it.dataset.flow || "x";
        // sections are tall, so a section simply goes past whichever one you drop it on; tiles go to the side you drop on
        const after = want === "section" ? !!(src.el.compareDocumentPosition(it) & Node.DOCUMENT_POSITION_FOLLOWING) : flow === "y" ? y > r.top + r.height / 2 : x > r.left + r.width / 2;
        return { how: "insert", k: it.dataset.k!, id: it.dataset.id!, flow, after, el: it };
      }
      if (want !== "photo") return null;
      const add = stack.map((e) => e.closest<HTMLElement>("[data-drop-list]")).find(Boolean);
      if (add) return { how: "append", k: add.dataset.dropList!, el: add };
      const img = stack.find((e) => e.matches?.('img[data-ed="pic"]'));
      if (img && img !== src.el && !img.closest('[data-ed="item"]:not([data-type="section"])')) return { how: "replace", slot: img.dataset.slot!, el: img };
      return null;
    };
    const begin = (hit: Hit, x: number, y: number) => {
      if (hit.el.dataset.free !== undefined) return beginFree(hit, x, y); // free-moved things go wherever you drag them
      drag = { hit, drop: null, x, y };
      press = null;
      root.classList.add("dragging");
      hit.el.style.opacity = "0.35";
      const g = ghostRef.current;
      if (g) {
        const img = hit.el.matches("img") ? (hit.el as HTMLImageElement) : hit.type === "section" ? null : hit.el.querySelector("img");
        g.innerHTML = "";
        if (img) {
          const t = document.createElement("img");
          t.src = img.currentSrc || img.src;
          t.style.cssText = "width:40px;height:40px;object-fit:cover;border-radius:6px";
          g.appendChild(t);
        }
        g.appendChild(document.createTextNode(hit.type === "section" ? `Moving “${hit.el.dataset.label || "section"}”` : hit.type === "clip" ? "Moving video" : "Moving photo"));
        g.style.display = "flex";
        g.style.transform = `translate(${x + 14}px, ${y + 14}px)`;
      }
      const scroll = () => {
        if (!drag) return;
        const edge = 90;
        if (drag.y < edge) scrollBy(0, -Math.ceil((edge - drag.y) / 5));
        else if (drag.y > innerHeight - edge - 70) scrollBy(0, Math.ceil((drag.y - (innerHeight - edge - 70)) / 5));
        drag.drop = dropAt(drag.x, drag.y, drag.hit);
        showLine(drag.drop);
        raf = requestAnimationFrame(scroll);
      };
      raf = requestAnimationFrame(scroll);
    };
    startDrag.current = begin;
    const endDrag = (apply: boolean) => {
      if (!drag) return;
      const { hit, drop } = drag;
      cancelAnimationFrame(raf);
      hit.el.style.opacity = "";
      root.classList.remove("dragging");
      if (ghostRef.current) ghostRef.current.style.display = "none";
      showLine(null);
      drag = null;
      if (!apply || !drop) return;
      const pic = slotOf(hit.el);
      const name = hit.sel.kind === "item" ? hit.sel.id : pic?.dataset.name || "";
      const shown = pic?.dataset.name || name;
      const fromK = hit.sel.kind === "item" ? hit.sel.k : null;
      if (drop.how === "replace") {
        const there = drop.el.dataset.name || "";
        change((l) => {
          (l.swap ||= {})[drop.slot] = shown;
          if (hit.sel.kind === "pic" && there) l.swap[hit.sel.slot] = there; // two single photos trade places
        });
        setSel({ kind: "pic", slot: drop.slot });
        return;
      }
      if (!name) return;
      change((l) => place(l, lists.current, fromK, name, drop.k, drop.how === "insert" ? drop.id : null, drop.how === "insert" && drop.after));
      setSel({ kind: "item", k: drop.k, id: name });
    };

    const down = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (e.button || t.closest?.("[data-edit-ui]")) return;
      const hit = hitAt(e.clientX, e.clientY);
      if (!hit) return;
      if (reframeRef.current && same(hit.sel, selRef.current)) {
        const img = slotOf(hit.el);
        if (img) {
          const m = getComputedStyle(img).objectPosition.match(/([\d.]+)%\s+([\d.]+)%/);
          pan = { img, x: e.clientX, y: e.clientY, fx: m ? Number(m[1]) : 50, fy: m ? Number(m[2]) : 50, id: e.pointerId };
          e.preventDefault();
          return;
        }
      }
      if (e.pointerType !== "mouse") return; // by touch, the page scrolls; moving is done from the toolbar handle
      if (!t.closest("input,textarea,select")) e.preventDefault();
      if (hit.type !== "section") press = { x: e.clientX, y: e.clientY, hit };
    };
    const move = (e: PointerEvent) => {
      if (pan) {
        const b = pan.img.getBoundingClientRect();
        // dragging right shows more of the photo's left side, like sliding a print under a mat
        const nx = Math.max(0, Math.min(100, pan.fx - ((e.clientX - pan.x) / b.width) * 100));
        const ny = Math.max(0, Math.min(100, pan.fy - ((e.clientY - pan.y) / b.height) * 100));
        pan.img.style.objectPosition = `${nx.toFixed(0)}% ${ny.toFixed(0)}%`;
        e.preventDefault();
        return;
      }
      if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 6) {
        const from = press;
        setSel(from.hit.sel);
        setReframe(false);
        begin(from.hit, from.x, from.y);
      }
      if (fd) {
        const f = fd;
        const next: Free = { ...f.base, x: Math.round(f.base.x + e.clientX - f.x), y: Math.round(f.base.y + e.clientY - f.y) };
        change((l) => restyle(l, f.key, (st) => ((st.free ||= {})[f.d] = next)), f.tag);
        e.preventDefault();
        return;
      }
      if (drag) {
        drag.x = e.clientX;
        drag.y = e.clientY;
        if (ghostRef.current) ghostRef.current.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 14}px)`;
        drag.drop = dropAt(e.clientX, e.clientY, drag.hit);
        showLine(drag.drop);
        e.preventDefault();
      }
    };
    const up = (e: PointerEvent) => {
      press = null;
      if (pan) {
        const { img } = pan;
        const moved = Math.hypot(e.clientX - pan.x, e.clientY - pan.y) > 2;
        pan = null;
        swallow = true;
        const v = img.style.objectPosition;
        if (moved && v && img.dataset.slot) change((l) => ((l.focus ||= {})[img.dataset.slot!] = v));
        return;
      }
      if (fd) {
        fd = null;
        root.classList.remove("dragging");
        swallow = e.pointerType === "mouse";
        return;
      }
      if (drag) {
        drag.x = e.clientX;
        drag.y = e.clientY;
        drag.drop = dropAt(e.clientX, e.clientY, drag.hit);
        swallow = e.pointerType === "mouse";
        endDrag(true);
      }
    };
    const click = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest?.("[data-edit-ui]")) return;
      e.preventDefault();
      e.stopPropagation();
      if (swallow) return void (swallow = false);
      const hit = hitAt(e.clientX, e.clientY);
      select(hit ? hit.sel : null);
      if (hit && e.detail === 2 && slotOf(hit.el)) setReframe(true);
    };
    const key = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest?.("input,textarea,select");
      if (e.key === "Escape") {
        if (drag) endDrag(false);
        else if (reframeRef.current) setReframe(false);
        else setSel(null);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !typing) {
        e.preventDefault();
        undo();
      }
    };
    const cancel = () => {
      press = null;
      pan = null;
      fd = null;
      endDrag(false);
    };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("pointermove", move, true);
    document.addEventListener("pointerup", up, true);
    document.addEventListener("pointercancel", cancel, true);
    document.addEventListener("click", click, true);
    document.addEventListener("keydown", key);
    return () => {
      cancel();
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("pointerup", up, true);
      document.removeEventListener("pointercancel", cancel, true);
      document.removeEventListener("click", click, true);
      document.removeEventListener("keydown", key);
      root.classList.remove("editing", "dragging");
    };
  }, [editing, change, undo, select, lists]);

  if (!editing)
    return (
      <button type="button" data-edit-ui style={ui} onClick={() => setEditing(true)} className="fixed bottom-4 left-4 z-[60] rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-sky-500">
        ✎ Edit this page{changed ? " (draft)" : ""}
      </button>
    );

  const hidden = Object.entries(L.hidden || {}).flatMap(([k, ids]) => ids.map((id) => ({ k, id })));
  const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-ed="item"][data-type="section"]')).map((e) => ({ k: e.dataset.k!, id: e.dataset.id!, label: e.dataset.label || e.dataset.id! }));
  const ups = new Set(JSON.stringify(L).match(/up:[a-z0-9]+/g) || []).size;
  const save = async () => {
    setBusy(true);
    try {
      const r = await fetch(ADMIN_URL, { method: "POST", headers: { "Content-Type": "application/json", "X-Studio-Key": passcode() }, body: JSON.stringify({ action: "draft", value: JSON.stringify(L) }) });
      const d = r.ok ? ((await r.json()) as { ok?: boolean; error?: string }) : null;
      flash(d?.ok ? (ups ? `Draft saved. It uses ${ups} photo${ups > 1 ? "s" : ""} you uploaded: send ${ups > 1 ? "those" : "that one"} to Claude in the chat, then say “keep it”.` : "Draft saved. Tell Claude “keep it” to make it permanent.") : r.status === 401 || r.status === 403 ? "Sign in at /admin on this preview first, then save again." : d?.error || "Couldn't save just now. Use Copy instead.");
    } catch {
      flash("Couldn't save just now. Use Copy instead.");
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(L));
      flash("Copied. Paste it to Claude in the chat.");
    } catch {
      flash("Copy isn't available in this browser.");
    }
  };

  /* ---- actions on the selected thing ---- */
  const step = (by: number) => {
    if (!info || sel?.kind !== "item") return;
    const ids = (lists.current[sel.k] || []).slice();
    const i = ids.indexOf(sel.id);
    const to = i + by;
    if (i < 0 || to < 0 || to >= ids.length) return;
    ids.splice(i, 1);
    ids.splice(to, 0, sel.id);
    change((l) => ((l.order ||= {})[sel.k] = ids));
  };
  const setSize = (spec: SizeSpec, v: string, tag?: string) => change((l) => ((l.size ||= {})[spec.k] = v), tag);
  const bump = (spec: SizeSpec, by: number) => {
    const v = spec.o[spec.o.indexOf(spec.v) + by];
    if (v) setSize(spec, v);
  };
  const hide = () => {
    if (sel?.kind !== "item") return;
    change((l) => {
      const h = ((l.hidden ||= {})[sel.k] ||= []);
      if (!h.includes(sel.id)) h.push(sel.id);
    });
    setSel(null);
    flash("Hidden. Bring it back from “Hidden” in the bar below, or press Undo.");
  };
  const handleDown = (e: RPointerEvent) => {
    const el = elOf(sel);
    if (!el || !sel || !info) return;
    e.preventDefault();
    startDrag.current({ sel, el, type: info.type }, e.clientX, e.clientY);
  };
  const resizeDown = (e: RPointerEvent<HTMLDivElement>) => {
    const spec = info?.size;
    if (!spec && !freeHere) return;
    e.preventDefault();
    e.stopPropagation();
    const h = e.currentTarget;
    h.setPointerCapture(e.pointerId);
    const x0 = e.clientX;
    const y0 = e.clientY;
    if (freeHere && info) {
      // a free-moved thing scales smoothly instead of stepping through sizes
      const d = dev();
      const base = { ...freeHere };
      const key = info.key;
      const tag = "scale" + Date.now();
      const w = (elOf(sel)?.getBoundingClientRect().width || 200) / (base.s || 1);
      const mv = (ev: PointerEvent) => {
        const s = Math.max(0.2, Math.min(4, (base.s || 1) + (ev.clientX - x0 + (ev.clientY - y0)) / 2 / w));
        change((l) => restyle(l, key, (st) => ((st.free ||= {})[d] = { ...base, s: Math.round(s * 100) / 100 })), tag);
      };
      const done = () => {
        h.removeEventListener("pointermove", mv);
        h.removeEventListener("pointerup", done);
        h.removeEventListener("pointercancel", done);
      };
      h.addEventListener("pointermove", mv);
      h.addEventListener("pointerup", done);
      h.addEventListener("pointercancel", done);
      return;
    }
    if (!spec) return;
    const i0 = spec.o.indexOf(spec.v);
    const tag = "resize" + Date.now();
    let cur = i0;
    const mv = (ev: PointerEvent) => {
      const d = (ev.clientX - x0 + (ev.clientY - y0)) / 2;
      const i = Math.max(0, Math.min(spec.o.length - 1, i0 + Math.round(d / 45)));
      if (i !== cur) {
        cur = i;
        setSize(spec, spec.o[i], tag);
      }
    };
    const done = () => {
      h.removeEventListener("pointermove", mv);
      h.removeEventListener("pointerup", done);
      h.removeEventListener("pointercancel", done);
    };
    h.addEventListener("pointermove", mv);
    h.addEventListener("pointerup", done);
    h.addEventListener("pointercancel", done);
  };

  const freeHere = info ? L.style?.[info.key]?.free?.[dev()] : undefined;
  const toggleFree = () => {
    if (!info) return;
    const d = dev();
    change((l) =>
      restyle(l, info.key, (st) => {
        if (st.free?.[d]) {
          delete st.free[d];
          if (!Object.keys(st.free).length) delete st.free;
        } else (st.free ||= {})[d] = { x: 0, y: 0, s: 1 };
      }),
    );
  };
  const upload = async (files: FileList | null) => {
    if (!files?.length || !picker) return;
    try {
      let first = "";
      for (const f of Array.from(files)) {
        const ph = await addPhoto(f);
        addUpload(ph.name, ph.url);
        first ||= ph.name;
      }
      picker.onPick(first);
      pick(null);
      flash("Photo added from your device. It lives in this browser until you send it to Claude.");
    } catch {
      flash("That file couldn't be read as a photo. Try a JPG or PNG.");
    }
  };
  const y = info?.flow === "y";
  const hint = !sel
    ? "Click a photo, video or section to select it. Drag photos and videos to move them, even into another section."
    : reframe
      ? "Drag the photo inside its frame to choose what shows. Press Reframe again (or Esc) when it looks right."
      : freeHere
        ? `Free move is on for ${DEV_NAME[dev()]} screens: drag it anywhere, pull the corner to scale. Press Free move again to snap it back.`
        : info?.type === "section"
        ? "Use the ⠿ handle to drag this section up or down, or the arrows."
        : "Drag it to a new spot. Pull the blue corner to resize. Double-click a photo to reframe it.";

  return (
    <>
      {/* outline, corner handle and toolbar of the selected thing */}
      {sel && info ? (
        <>
          <div ref={boxRef} className="pointer-events-none fixed z-[58] hidden outline outline-2 outline-sky-500" style={{ display: "none" }}>
            {info.size || freeHere ? (
              <div data-edit-ui onPointerDown={resizeDown} title={freeHere ? "Drag to scale" : `Drag to resize (${SIZE_NAME[info.size!.v] || info.size!.v})`} className="pointer-events-auto absolute -right-2 -bottom-2 size-5 cursor-nwse-resize touch-none rounded-sm border-2 border-white bg-sky-500 shadow" />
            ) : null}
          </div>
          <div ref={barRef} data-edit-ui data-bar style={ui} className="fixed z-[62] flex max-w-[calc(100vw-16px)] flex-wrap items-center gap-0.5 rounded-lg bg-neutral-900 p-1 text-white shadow-xl">
            <span onPointerDown={handleDown} title="Drag to move" className={cn(tool, "flex cursor-grab touch-none items-center gap-1.5 bg-sky-600 whitespace-nowrap hover:bg-sky-500 active:cursor-grabbing")}>
              ⠿ <span className="max-w-[9rem] truncate">{info.label}</span>
            </span>
            {sel.kind === "item" ? (
              <>
                <button type="button" className={tool} aria-label={y ? "Move up" : "Move earlier"} disabled={info.index <= 0} onClick={() => step(-1)}>
                  {y ? "↑" : "←"}
                </button>
                <button type="button" className={tool} aria-label={y ? "Move down" : "Move later"} disabled={info.index < 0 || info.index >= info.count - 1} onClick={() => step(1)}>
                  {y ? "↓" : "→"}
                </button>
              </>
            ) : null}
            {info.slot ? (
              <>
                <button type="button" className={cn(tool, reframe && "bg-sky-600 hover:bg-sky-500")} aria-pressed={reframe} onClick={() => setReframe(!reframe)}>
                  Reframe
                </button>
                <button type="button" className={tool} onClick={() => pick({ title: "Choose a photo for this spot", onPick: (n) => change((l) => ((l.swap ||= {})[info.slot] = n)) })}>
                  Swap
                </button>
              </>
            ) : null}
            {info.type !== "section" ? (
              <button type="button" className={cn(tool, freeHere && "bg-sky-600 hover:bg-sky-500")} aria-pressed={!!freeHere} title="Place it anywhere on the page instead of in its row" onClick={toggleFree}>
                Free move
              </button>
            ) : null}
            {info.size && !freeHere ? (
              <span className="flex items-center rounded-md bg-white/10">
                <button type="button" className={tool} aria-label="Smaller" disabled={info.size.o.indexOf(info.size.v) <= 0} onClick={() => bump(info.size!, -1)}>
                  −
                </button>
                <span className="px-1 text-[11px] text-white/80">{SIZE_NAME[info.size.v] || info.size.v}</span>
                <button type="button" className={tool} aria-label="Larger" disabled={info.size.o.indexOf(info.size.v) >= info.size.o.length - 1} onClick={() => bump(info.size!, 1)}>
                  +
                </button>
              </span>
            ) : null}
            {info.group ? (
              <span className="flex items-center gap-0.5 rounded-md bg-white/10 pl-2">
                <span className="text-[11px] text-white/70">{info.group.label}</span>
                {info.group.o.map((v) => (
                  <button key={v} type="button" className={cn(tool, info.group!.v === v && "bg-sky-600 hover:bg-sky-500")} aria-pressed={info.group!.v === v} title={SIZE_NAME[v]} onClick={() => setSize(info.group!, v)}>
                    {v.toUpperCase()}
                  </button>
                ))}
              </span>
            ) : null}
            {info.type === "photo" && sel.kind === "item" ? (
              <button type="button" className={tool} title="Add a photo next to this one" onClick={() => pick({ title: "Add a photo next to this one", onPick: (n) => change((l) => place(l, lists.current, null, n, sel.k, sel.id, true)) })}>
                + Photo
              </button>
            ) : null}
            {sel.kind === "item" ? (
              <button type="button" className={tool} aria-label="Hide" title="Hide" onClick={hide}>
                ✕
              </button>
            ) : null}
          </div>
        </>
      ) : null}

      {/* while dragging: what is being moved, and where it will land */}
      <div ref={lineRef} data-edit-ui className="pointer-events-none fixed z-[64]" style={{ display: "none" }} />
      <div ref={ghostRef} data-edit-ui style={{ ...ui, display: "none" }} className="pointer-events-none fixed top-0 left-0 z-[66] items-center gap-2 rounded-lg bg-neutral-900 py-1.5 pr-3 pl-1.5 text-xs font-semibold text-white shadow-xl" />

      <div data-edit-ui style={ui} className="fixed inset-x-2 bottom-2 z-[60] mx-auto max-w-5xl rounded-2xl bg-neutral-900/95 p-2.5 text-white shadow-2xl backdrop-blur sm:inset-x-4 sm:bottom-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className={cn(btn, "bg-white/10 hover:bg-white/20")} disabled={!canUndo} onClick={undo}>
            Undo
          </button>
          <button
            type="button"
            className={cn(btn, "bg-white/10 hover:bg-white/20")}
            disabled={!changed}
            onClick={() => {
              reset();
              flash("Back to the saved layout. Undo brings your changes back.");
            }}
          >
            Reset
          </button>
          {sections.length ? (
            <button
              type="button"
              className={cn(btn, panel === "sections" ? "bg-sky-500" : "bg-white/10 hover:bg-white/20")}
              aria-expanded={panel === "sections"}
              onClick={() => {
                setPanel(panel === "sections" ? "" : "sections");
                redraw((n) => n + 1);
              }}
            >
              Sections
            </button>
          ) : null}
          {hidden.length ? (
            <button type="button" className={cn(btn, panel === "hidden" ? "bg-sky-500" : "bg-white/10 hover:bg-white/20")} aria-expanded={panel === "hidden"} onClick={() => setPanel(panel === "hidden" ? "" : "hidden")}>
              Hidden ({hidden.length})
            </button>
          ) : null}
          <button type="button" className={cn(btn, design ? "bg-sky-500" : "bg-white/10 hover:bg-white/20")} aria-pressed={design} onClick={() => setDesign(!design)}>
            Design
          </button>
          {frame ? null : (
            <span className="flex rounded-full bg-white/10 p-0.5" role="group" aria-label="Preview screen size">
              {(["t", "p"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  className={cn(btn, "h-8 px-3 text-white/80 hover:text-white")}
                  onClick={() => {
                    setSel(null);
                    setDevice(d);
                  }}
                >
                  {d === "t" ? "Tablet" : "Phone"}
                </button>
              ))}
            </span>
          )}
          <span className="mx-1 hidden h-5 w-px bg-white/20 sm:block" />
          <button type="button" className={cn(btn, "text-white/80 hover:text-white")} onClick={() => go("/")}>
            Home
          </button>
          {partnerships.map((p) => (
            <button key={p.slug} type="button" className={cn(btn, "text-white/80 hover:text-white")} onClick={() => go(`/partnerships/${p.slug}`)}>
              {p.name}
            </button>
          ))}
          <span className="grow" />
          <button type="button" className={cn(btn, "bg-white/10 hover:bg-white/20")} disabled={!changed} onClick={copy}>
            Copy
          </button>
          <button type="button" className={cn(btn, "bg-emerald-500 text-white hover:bg-emerald-400")} disabled={!changed || busy} onClick={save}>
            {busy ? "Saving…" : "Save draft"}
          </button>
          {frame ? null : (
            <button
              type="button"
              className={cn(btn, "bg-white text-neutral-900 hover:bg-white/90")}
              onClick={() => {
                setSel(null);
                setEditing(false);
              }}
            >
              Done
            </button>
          )}
        </div>
        <p className="mt-1.5 px-2 text-xs text-white/70" aria-live="polite">
          {note || hint}
        </p>
        {panel === "sections" && sections.length ? (
          <ol data-sections className="mt-2 grid max-h-[40vh] overflow-y-auto gap-1 border-t border-white/15 px-1 pt-2 sm:grid-cols-2">
            {sections.map((s, i) => {
              const on = sel?.kind === "item" && sel.k === s.k && sel.id === s.id;
              const moveTo = (to: number) => {
                const ids = sections.map((x) => x.id);
                ids.splice(i, 1);
                ids.splice(to, 0, s.id);
                change((l) => ((l.order ||= {})[s.k] = ids));
              };
              return (
                <li key={s.id} className={cn("flex items-center gap-1 rounded-lg py-0.5 pr-1 pl-3 text-[13px]", on ? "bg-sky-600" : "bg-white/10")}>
                  <button
                    type="button"
                    className="grow truncate text-left"
                    onClick={() => {
                      select({ kind: "item", k: s.k, id: s.id });
                      elOf({ kind: "item", k: s.k, id: s.id })?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                  >
                    {i + 1}. {s.label}
                  </button>
                  <button type="button" className={tool} aria-label={`Move ${s.label} up`} disabled={i === 0} onClick={() => moveTo(i - 1)}>
                    ↑
                  </button>
                  <button type="button" className={tool} aria-label={`Move ${s.label} down`} disabled={i === sections.length - 1} onClick={() => moveTo(i + 1)}>
                    ↓
                  </button>
                  <button
                    type="button"
                    className={tool}
                    aria-label={`Hide ${s.label}`}
                    onClick={() =>
                      change((l) => {
                        const h = ((l.hidden ||= {})[s.k] ||= []);
                        if (!h.includes(s.id)) h.push(s.id);
                      })
                    }
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ol>
        ) : null}
        {panel === "hidden" && hidden.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5 border-t border-white/15 px-1 pt-2">
            {hidden.map((h) => (
              <button
                key={h.k + h.id}
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-white/10 py-1 pr-3 pl-1 text-xs hover:bg-white/20"
                onClick={() =>
                  change((l) => {
                    l.hidden![h.k] = l.hidden![h.k].filter((x) => x !== h.id);
                    if (!l.hidden![h.k].length) delete l.hidden![h.k];
                  })
                }
              >
                {(library as string[]).includes(h.id) || h.id.startsWith("up:") ? <img src={src(h.id)} alt="" className="size-7 rounded-full object-cover" /> : <span className="size-7" />}
                Show “{h.id.replace(/^p:/, "")}” again
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {design && sel && info ? <Panel info={info} L={L} change={change} /> : null}

      {device ? (
        <div data-edit-ui style={ui} className="fixed inset-0 z-[80] flex flex-col items-center bg-neutral-800 text-white">
          <div className="flex w-full items-center gap-3 px-4 py-3">
            <strong className="text-sm">{device === "p" ? "Phone" : "Tablet"} view</strong>
            <span className="text-xs text-white/70">What you move or resize here applies to {device === "p" ? "phone" : "tablet"} screens only. Order, photos and looks are shared with every size.</span>
            <span className="grow" />
            <button type="button" className={cn(btn, "bg-white/10 hover:bg-white/20")} onClick={() => setDevice(device === "p" ? "t" : "p")}>
              Switch to {device === "p" ? "tablet" : "phone"}
            </button>
            <button type="button" className={cn(btn, "bg-white text-neutral-900")} onClick={() => setDevice("")}>
              Back to desktop
            </button>
          </div>
          <iframe key={device} title="Preview" src={`${location.pathname}?edit=1&frame=1`} className="min-h-0 flex-1 rounded-t-2xl bg-white shadow-2xl" style={{ width: device === "p" ? 390 : 820, maxWidth: "100vw", border: 0 }} />
        </div>
      ) : null}

      {picker ? (
        <div data-edit-ui role="dialog" aria-modal="true" aria-label={picker.title} style={ui} className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4" onClick={() => pick(null)}>
          <div className="flex max-h-[86dvh] w-full max-w-4xl flex-col rounded-2xl bg-white text-neutral-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">{picker.title}</h2>
                <p className="text-sm text-neutral-500">Pick from your library, or upload a new photo from this device.</p>
              </div>
              <span className="grow" />
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => void upload(e.target.files)} />
              <button type="button" className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500" onClick={() => fileRef.current?.click()}>
                ↑ Upload photo
              </button>
              <button type="button" className="rounded-full bg-neutral-100 px-4 py-2 text-sm font-semibold hover:bg-neutral-200" onClick={() => pick(null)}>
                Cancel
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 overflow-y-auto p-4 sm:grid-cols-5 md:grid-cols-6">
              {[...Object.keys(uploads).reverse(), ...(library as string[])].map((n) => (
                <button
                  key={n}
                  type="button"
                  title={n}
                  className="group overflow-hidden rounded-md outline-offset-2 hover:outline hover:outline-2 hover:outline-sky-500"
                  onClick={() => {
                    picker.onPick(n);
                    pick(null);
                  }}
                >
                  <img src={src(n)} alt={n} loading="lazy" className="aspect-[4/5] w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

/* ---------- the Design panel: the look of whatever is selected ---------- */

const BLENDS = ["normal", "multiply", "screen", "overlay", "soft-light", "darken", "lighten", "luminosity"];
const FRAMES: [string, string][] = [["", "As designed"], ["1 / 1", "Square"], ["4 / 5", "Portrait 4:5"], ["3 / 2", "Landscape 3:2"], ["16 / 9", "Wide 16:9"], ["9 / 16", "Tall 9:16"]];
const field = "h-8 w-full rounded-md bg-white/10 px-2 text-[12px] text-white";

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-t border-white/15 px-3 py-3">
      <legend className="float-left mb-2 w-full text-[11px] font-semibold tracking-wide text-white/60 uppercase">{title}</legend>
      <div className="clear-both grid gap-2.5">{children}</div>
    </fieldset>
  );
}
function Slide({ label, v, min, max, unit = "", onChange }: { label: string; v: number; min: number; max: number; unit?: string; onChange: (v: number, tag: string) => void }) {
  const tag = useRef("");
  return (
    <label className="grid grid-cols-[5.5rem_1fr_2.6rem] items-center gap-2 text-[12px]">
      <span className="text-white/85">{label}</span>
      <input type="range" min={min} max={max} value={v} className="w-full accent-sky-500" onPointerDown={() => (tag.current = label + Date.now())} onFocus={() => (tag.current ||= label + Date.now())} onChange={(e) => onChange(Number(e.target.value), tag.current)} />
      <span className="text-right text-white/60 tabular-nums">
        {v}
        {unit}
      </span>
    </label>
  );
}
function Chips<T extends string>({ label, v, options, onChange }: { label: string; v: T | ""; options: [T | "", string][]; onChange: (v: T | "") => void }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] items-center gap-2 text-[12px]">
      <span className="text-white/85">{label}</span>
      <span className="flex flex-wrap gap-1">
        {options.map(([id, name]) => (
          <button key={id} type="button" aria-pressed={v === id} className={cn("h-7 rounded-md px-2 text-[11px] font-semibold", v === id ? "bg-sky-600" : "bg-white/10 hover:bg-white/20")} onClick={() => onChange(id)}>
            {name}
          </button>
        ))}
      </span>
    </div>
  );
}
const LEVELS: ["" | "s" | "m" | "l", string][] = [["", "None"], ["s", "Soft"], ["m", "Medium"], ["l", "Strong"]];

function Panel({ info, L, change }: { info: Info; L: Layout; change: (fn: (l: Layout) => void, tag?: string) => void }) {
  const [open, setOpen] = useState(true);
  const pic = info.picKey ? L.style?.[info.picKey] || {} : null;
  const own = L.style?.[info.key] || {};
  const set = (key: string, fn: (s: Sty) => void, tag?: string) => change((l) => restyle(l, key, fn), tag);
  const section = info.type === "section";
  const hex = own.fill?.match(/#[0-9a-f]{6}/gi) || [];
  const ang = Number(own.fill?.match(/(-?\d+)deg/)?.[1] ?? 180);
  const kind = !own.fill ? "" : hex.length > 1 ? "g" : "c";
  const fill = (k: string, c1 = hex[0] || "#e9dfd0", c2 = hex[1] || "#f6f1ea", a = ang) => set(info.key, (s) => (s.fill = k === "" ? undefined : k === "c" ? c1 : `linear-gradient(${a}deg, ${c1}, ${c2})`), "fill" + k);
  const touched = (pic && Object.keys(pic).length > 0) || Object.keys(own).some((k) => k !== "free");
  return (
    <aside data-edit-ui data-panel style={ui} className="fixed top-20 right-2 z-[61] max-h-[calc(100dvh-13rem)] w-[17.5rem] max-w-[calc(100vw-16px)] overflow-y-auto rounded-xl bg-neutral-900/95 text-white shadow-2xl backdrop-blur">
      <button type="button" className="flex w-full items-center justify-between px-3 py-2.5 text-left text-[13px] font-semibold" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="truncate">Design · {info.label}</span>
        <span className="text-white/60">{open ? "–" : "+"}</span>
      </button>
      {open ? (
        <>
          {pic && info.picKey ? (
            <Group title="Image">
              <Slide label="Exposure" v={pic.bri ?? 100} min={40} max={170} unit="%" onChange={(v, t) => set(info.picKey, (s) => (s.bri = v === 100 ? undefined : v), t)} />
              <Slide label="Contrast" v={pic.con ?? 100} min={40} max={170} unit="%" onChange={(v, t) => set(info.picKey, (s) => (s.con = v === 100 ? undefined : v), t)} />
              <Slide label="Saturation" v={pic.sat ?? 100} min={0} max={200} unit="%" onChange={(v, t) => set(info.picKey, (s) => (s.sat = v === 100 ? undefined : v), t)} />
              <label className="grid grid-cols-[5.5rem_1fr] items-center gap-2 text-[12px]">
                <span className="text-white/85">Crop</span>
                <select className={field} value={pic.ar || ""} onChange={(e) => set(info.picKey, (s) => (s.ar = e.target.value || undefined))}>
                  {FRAMES.map(([v, n]) => (
                    <option key={v} value={v} className="text-black">
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <Chips label="Mask" v={pic.mask || ""} options={[["", "None"], ["round", "Rounded"], ["circle", "Circle"], ["arch", "Arch"]]} onChange={(v) => set(info.picKey, (s) => (s.mask = v || undefined))} />
              <label className="grid grid-cols-[5.5rem_1fr] items-center gap-2 text-[12px]">
                <span className="text-white/85">Blend</span>
                <select className={field} value={pic.blend || "normal"} onChange={(e) => set(info.picKey, (s) => (s.blend = e.target.value === "normal" ? undefined : e.target.value))}>
                  {BLENDS.map((b) => (
                    <option key={b} value={b} className="text-black">
                      {b[0].toUpperCase() + b.slice(1).replace("-", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-[11px] leading-snug text-white/50">To choose which part of the photo shows, double-click it and drag.</p>
            </Group>
          ) : null}
          <Group title="Effects">
            <Chips label="Drop shadow" v={own.shadow || ""} options={LEVELS} onChange={(v) => set(info.key, (s) => (s.shadow = v || undefined))} />
            {info.type !== "pic" ? <Chips label="Inner shadow" v={own.inner || ""} options={LEVELS} onChange={(v) => set(info.key, (s) => (s.inner = v || undefined))} /> : null}
            <Slide label="Layer blur" v={own.blur ?? 0} min={0} max={24} unit="px" onChange={(v, t) => set(info.key, (s) => (s.blur = v || undefined), t)} />
            <Slide label="Backgr. blur" v={own.bg ?? 0} min={0} max={30} unit="px" onChange={(v, t) => set(info.key, (s) => (s.bg = v || undefined), t)} />
            <Slide label="Opacity" v={own.op ?? 100} min={10} max={100} unit="%" onChange={(v, t) => set(info.key, (s) => (s.op = v === 100 ? undefined : v), t)} />
            <p className="text-[11px] leading-snug text-white/50">Background blur shows on see-through things: lower the opacity and place it over something.</p>
          </Group>
          {section ? (
            <Group title="Fill">
              <Chips label="Background" v={kind} options={[["", "As designed"], ["c", "Color"], ["g", "Gradient"]]} onChange={(v) => fill(v)} />
              {kind ? (
                <div className="grid grid-cols-[5.5rem_1fr] items-center gap-2 text-[12px]">
                  <span className="text-white/85">{kind === "g" ? "Colors" : "Color"}</span>
                  <span className="flex gap-2">
                    <input type="color" aria-label="First color" value={hex[0] || "#e9dfd0"} className="h-8 w-12 rounded bg-transparent" onChange={(e) => fill(kind, e.target.value)} />
                    {kind === "g" ? <input type="color" aria-label="Second color" value={hex[1] || "#f6f1ea"} className="h-8 w-12 rounded bg-transparent" onChange={(e) => fill(kind, undefined, e.target.value)} /> : null}
                  </span>
                </div>
              ) : null}
              {kind === "g" ? <Slide label="Angle" v={ang} min={0} max={360} unit="°" onChange={(v) => fill("g", undefined, undefined, v)} /> : null}
            </Group>
          ) : null}
          {touched ? (
            <div className="border-t border-white/15 p-3">
              <button
                type="button"
                className="h-8 w-full rounded-md bg-white/10 text-[12px] font-semibold hover:bg-white/20"
                onClick={() =>
                  change((l) => {
                    if (info.picKey && info.picKey !== info.key) delete l.style?.[info.picKey];
                    const fr = l.style?.[info.key]?.free;
                    if (l.style) {
                      if (fr) l.style[info.key] = { free: fr };
                      else delete l.style[info.key];
                    }
                  })
                }
              >
                Reset look
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </aside>
  );
}
