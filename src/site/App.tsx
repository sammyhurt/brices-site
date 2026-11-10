import { lazy, Suspense, useEffect } from "react";

import { partnerships } from "./data";
import { Footer, Header, usePath } from "./parts";
import { Home, NotFound, PartnershipPage } from "./pages";
import { logVisit, watchClicks } from "./track";

const Admin = lazy(() => import("./admin"));

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
    <div className="bg-background text-foreground flex min-h-dvh flex-col">
      <Header overHero={overHero} />
      <div className="flex-1">{page}</div>
      <Footer />
    </div>
  );
}
