// After vite build: write one HTML file per partnership page with its own title, description and link preview,
// so link previews (iMessage, LinkedIn, email) and search engines see the right page without running JavaScript.
import { build } from "esbuild";
import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";

const SITE = "https://thebrices.co";
const tmp = "dist/.data.mjs";
await build({ entryPoints: ["src/site/data.ts"], bundle: true, format: "esm", platform: "node", outfile: tmp, logLevel: "silent" });
const { partnerships } = await import(new URL("../" + tmp, import.meta.url));
rmSync(tmp);

const base = readFileSync("dist/index.html", "utf8");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const swap = (html, re, val) => {
  if (!re.test(html)) throw new Error("prerender: tag not found " + re);
  return html.replace(re, val);
};

mkdirSync("dist/partnerships", { recursive: true });
for (const p of partnerships) {
  const title = esc(`${p.name} partnership · Meredith & Bernie`);
  const desc = esc(`${p.summary} ${p.kind} in ${p.place}, styled, shot and edited by Meredith & Bernie Brice.`);
  const url = `${SITE}/partnerships/${p.slug}`;
  const img = `${SITE}/media/${p.cover}.jpg`;
  let h = base;
  h = swap(h, /<title>[^<]*<\/title>/, `<title>${title}</title>`);
  h = swap(h, /<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${desc}" />`);
  h = swap(h, /<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${title}" />`);
  h = swap(h, /<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${desc}" />`);
  h = swap(h, /<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${url}" />`);
  h = swap(h, /<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${url}" />`);
  h = swap(h, /<meta property="og:image" content="[^"]*" \/>/, `<meta property="og:image" content="${img}" />`);
  h = swap(h, /\s*<meta property="og:image:width" content="[^"]*" \/>\s*<meta property="og:image:height" content="[^"]*" \/>/, "");
  h = swap(h, /<meta property="og:image:alt" content="[^"]*" \/>/, `<meta property="og:image:alt" content="${esc(p.name)}, photographed by Meredith &amp; Bernie." />`);
  h = swap(h, /<meta name="twitter:image" content="[^"]*" \/>/, `<meta name="twitter:image" content="${img}" />`);
  writeFileSync(`dist/partnerships/${p.slug}.html`, h);
}
console.log(`prerendered ${partnerships.length} partnership pages`);
