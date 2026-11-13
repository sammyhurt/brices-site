/**
 * Photos uploaded in edit mode. They are kept in this browser only (IndexedDB) under names starting "up:", so they can
 * be tried on the page straight away. They become real site photos when they are sent to Claude and "kept".
 */
const DB = "mb-uploads";
const STORE = "photos";

function open(): Promise<IDBDatabase> {
  return new Promise((ok, fail) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fail(r.error);
  });
}
/** Every uploaded photo as name -> address the browser can show. */
export async function loadAll(): Promise<Record<string, string>> {
  try {
    const db = await open();
    return await new Promise((ok) => {
      const out: Record<string, string> = {};
      const c = db.transaction(STORE).objectStore(STORE).openCursor();
      c.onsuccess = () => {
        const cur = c.result;
        if (!cur) return ok(out);
        out[String(cur.key)] = URL.createObjectURL(cur.value as Blob);
        cur.continue();
      };
      c.onerror = () => ok(out);
    });
  } catch {
    return {};
  }
}
/** Shrink a photo to at most 2000px on its long side and store it. Returns its name and address. */
export async function addPhoto(file: File): Promise<{ name: string; url: string }> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  const k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise<Blob>((ok, fail) => c.toBlob((b) => (b ? ok(b) : fail(new Error("Could not read that photo"))), "image/jpeg", 0.88));
  const name = "up:" + Date.now().toString(36);
  const db = await open();
  await new Promise<void>((ok, fail) => {
    const t = db.transaction(STORE, "readwrite");
    t.objectStore(STORE).put(blob, name);
    t.oncomplete = () => ok();
    t.onerror = () => fail(t.error);
  });
  return { name, url: URL.createObjectURL(blob) };
}
/** One stored photo as a file, for sending on. */
export async function getPhoto(name: string): Promise<Blob | null> {
  try {
    const db = await open();
    return await new Promise((ok) => {
      const r = db.transaction(STORE).objectStore(STORE).get(name);
      r.onsuccess = () => ok((r.result as Blob) || null);
      r.onerror = () => ok(null);
    });
  } catch {
    return null;
  }
}
