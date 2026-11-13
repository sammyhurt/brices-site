import { LayoutProvider } from "./edit";
import { lazy, Suspense, useEffect } from "react";

import { partnerships } from "./data";
import { Footer, Header, usePath } from "./parts";
import { Home, NotFound, PartnershipPage } from "./pages";
import { logVisit, watchClicks } from "./track";

const Admin = lazy(() => import("./admin"));

const SITE = "https://thebrices.co";
const HOME_TITLE = "Meredith & Bernie · Hotel partnerships";
const HOME_DESC =
  "Meredith & Bernie Brice are NYC newlyweds making luxury travel, fashion and couples content. 3 TikTok videos, 1 Instagram Reel and 15 edited photos for hotels, resorts and stays, styled, shot and edited by us.";

/** Each page gets its own title, description, link preview and canonical; unknown pages and /admin are kept out of search. */
function setMeta(path: string, p?: (typeof partnerships)[number]) {
  const known = path === "/" || !!p;
  const title = p ? `${p.name} partnership · Meredith & Bernie` : path === "/admin" ? "Admin · Meredith & Bernie" : known ? HOME_TITLE : "Page not found · Meredith & Bernie";
  const desc = p ? `${p.summary} ${p.kind} in ${p.place}, styled, shot and edited by Meredith & Bernie Brice.` : HOME_DESC;
  const url = SITE + (p ? `/partnerships/${p.slug}` : "/");
  const image = SITE + (p ? `/media/${p.cover}.jpg` : "/og.jpg");
  const tag = (sel: string, make: () => HTMLElement, attr: string, val: string) => {
    let el = document.head.querySelector(sel);
    if (!el) {
      el = make();
      document.head.appendChild(el);
    }
    el.setAttribute(attr, val);
  };
  const meta = (key: "name" | "property", k: string) => () => {
    const el = document.createElement("meta");
    el.setAttribute(key, k);
    return el;
  };
  document.title = title;
  tag('meta[name="description"]', meta("name", "description"), "content", desc);
  tag('meta[name="robots"]', meta("name", "robots"), "content", known ? "index, follow" : "noindex, follow");
  tag('link[rel="canonical"]', () => Object.assign(document.createElement("link"), { rel: "canonical" }), "href", url);
  tag('meta[property="og:title"]', meta("property", "og:title"), "content", title);
  tag('meta[property="og:description"]', meta("property", "og:description"), "content", p ? desc : "Luxury travel, fashion and couples content from NYC. 14.1K combined followers, 1.8M+ views, 6.3% average engagement.");
  tag('meta[property="og:url"]', meta("property", "og:url"), "content", url);
  tag('meta[property="og:image"]', meta("property", "og:image"), "content", image);
  tag('meta[name="twitter:image"]', meta("name", "twitter:image"), "content", image);
}

let watching = false;
export default function App() {
  if (!watching && typeof document !== "undefined") {
    watching = true;
    watchClicks();
  }
  const full = usePath();
  const path = full.split("#")[0].replace(/\/+$/, "") || "/";
  useEffect(() => {
    if (path !== "/admin") logVisit(path);
    const h = location.hash.slice(1);
    if (h) setTimeout(() => document.getElementById(h)?.scrollIntoView({ block: "start" }), 50);
  }, [path]);
  const m = path.match(/^\/partnerships\/([a-z0-9-]+)$/);
  const partner = m ? partnerships.find((p) => p.slug === m[1]) : undefined;
  useEffect(() => setMeta(path, partner), [path, partner]);
  let page;
  if (path === "/") page = <Home />;
  else if (m && partnerships.some((p) => p.slug === m[1])) page = <PartnershipPage key={m[1]} slug={m[1]} />;
  else if (path === "/admin")
    page = (
      <Suspense fallback={null}>
        <Admin />
      </Suspense>
    );
  else page = <NotFound />;
  const overHero = path === "/" || !!m;
  return (
    <LayoutProvider>
      <div className="bg-background text-foreground flex min-h-dvh flex-col">
        <Header overHero={overHero} />
        <div className="flex-1">{page}</div>
        <Footer />
      </div>
    </LayoutProvider>
  );
}
