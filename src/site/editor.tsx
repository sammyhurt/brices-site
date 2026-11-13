/** The edit mode's own interface: the Edit button, the toolbar, and the photo library. Loaded only for a signed-in person on a preview link. */
import { useState } from "react";

import { cn } from "@/lib/utils";

import { partnerships } from "./data";
import { passcode, useLayout, type Mode } from "./edit";
import library from "./media-list.json";
import { go, media } from "./parts";

const ADMIN_URL = "https://subletlyco.app.n8n.cloud/webhook/brices-admin";
const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: "arrange", label: "Arrange", hint: "Drag a photo, video or section onto another to move it, or use its arrows. ✕ hides it. Size buttons sit above each group." },
  { id: "reframe", label: "Reframe", hint: "Drag any photo inside its frame to choose which part shows." },
  { id: "swap", label: "Swap photo", hint: "Click any photo to replace it with another from your library." },
];
const btn = "h-9 rounded-full px-3.5 text-[13px] font-semibold transition-colors disabled:opacity-40";

export default function Editor() {
  const { L, editing, mode, changed, canUndo, setMode, setEditing, change, undo, reset, picker, pick } = useLayout();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const flash = (t: string) => {
    setNote(t);
    setTimeout(() => setNote((n) => (n === t ? "" : n)), 6000);
  };

  if (!editing)
    return (
      <button type="button" data-edit-ui onClick={() => setEditing(true)} className="fixed bottom-4 left-4 z-[60] rounded-full bg-sky-600 px-5 py-3 font-sans text-sm font-semibold text-white shadow-lg hover:bg-sky-500">
        ✎ Edit this page{changed ? " (draft)" : ""}
      </button>
    );

  const hidden = Object.entries(L.hidden || {}).flatMap(([k, ids]) => ids.map((id) => ({ k, id })));
  const save = async () => {
    setBusy(true);
    try {
      const r = await fetch(ADMIN_URL, { method: "POST", headers: { "Content-Type": "application/json", "X-Studio-Key": passcode() }, body: JSON.stringify({ action: "draft", value: JSON.stringify(L) }) });
      const d = r.ok ? ((await r.json()) as { ok?: boolean; error?: string }) : null;
      flash(d?.ok ? "Draft saved. Tell Claude “keep it” to make it permanent." : r.status === 401 || r.status === 403 ? "Sign in at /admin on this preview first, then save again." : d?.error || "Couldn't save just now. Use Copy instead.");
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

  return (
    <>
      <div data-edit-ui className="fixed inset-x-2 bottom-2 z-[60] mx-auto max-w-5xl rounded-2xl bg-neutral-900/95 p-2.5 font-sans text-white shadow-2xl backdrop-blur sm:inset-x-4 sm:bottom-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex rounded-full bg-white/10 p-0.5" role="tablist" aria-label="Edit tool">
            {MODES.map((m) => (
              <button key={m.id} type="button" role="tab" aria-selected={mode === m.id} onClick={() => setMode(m.id)} className={cn(btn, mode === m.id ? "bg-sky-500 text-white" : "text-white/80 hover:text-white")}>
                {m.label}
              </button>
            ))}
          </div>
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
          {hidden.length ? (
            <button type="button" className={cn(btn, "bg-white/10 hover:bg-white/20")} aria-expanded={showHidden} onClick={() => setShowHidden(!showHidden)}>
              Hidden ({hidden.length})
            </button>
          ) : null}
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
          <button type="button" className={cn(btn, "bg-white text-neutral-900 hover:bg-white/90")} onClick={() => setEditing(false)}>
            Done
          </button>
        </div>
        <p className="mt-1.5 px-2 text-xs text-white/70" aria-live="polite">
          {note || MODES.find((m) => m.id === mode)?.hint}
        </p>
        {showHidden && hidden.length ? (
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
                {(library as string[]).includes(h.id) ? <img src={media(h.id)} alt="" className="size-7 rounded-full object-cover" /> : <span className="size-7" />}
                Show “{h.id.replace(/^p:/, "")}” again
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {picker ? (
        <div data-edit-ui role="dialog" aria-modal="true" aria-label={picker.title} className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4 font-sans" onClick={() => pick(null)}>
          <div className="flex max-h-[86dvh] w-full max-w-4xl flex-col rounded-2xl bg-white text-neutral-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">{picker.title}</h2>
                <p className="text-sm text-neutral-500">Your photo library: every photo already on the site. Send Claude new photos in the chat and they appear here.</p>
              </div>
              <button type="button" className="rounded-full bg-neutral-100 px-4 py-2 text-sm font-semibold hover:bg-neutral-200" onClick={() => pick(null)}>
                Cancel
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 overflow-y-auto p-4 sm:grid-cols-5 md:grid-cols-6">
              {(library as string[]).map((n) => (
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
                  <img src={media(n)} alt={n} loading="lazy" className="aspect-[4/5] w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
