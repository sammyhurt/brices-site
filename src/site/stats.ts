/**
 * Combined numbers for both of us across all four accounts, entered in the admin (Settings → Our numbers)
 * and served by the n8n webhook "brices-stats". Until all four accounts are filled in, the site keeps
 * the media kit's numbers from data.ts.
 */
import { useEffect, useState } from "react";

import { reach, reachAsOf } from "./data";

const STATS_URL = "https://subletlyco.app.n8n.cloud/webhook/brices-stats";

export interface LiveStats {
  followers: number | null;
  views: number | null;
  engagement: string;
  views_period: string;
  updated_at: string;
  split: { meredith: number; bernie: number } | null;
}

/** 14,150 → "14.1K"; 1,834,000 → "1.8M+" when plus is set and the number was rounded down. */
export function fmt(n: number, plus = false) {
  const f = (d: number, u: string) => {
    const v = Math.floor((n / d) * 10) / 10;
    return (v % 1 ? v.toFixed(1) : String(v)) + u + (plus && v * d < n ? "+" : "");
  };
  return n >= 1e6 ? f(1e6, "M") : n >= 1e3 ? f(1e3, "K") : n.toLocaleString("en-US");
}

let cache: Promise<LiveStats | null> | null = null;
function load() {
  cache ??= fetch(STATS_URL)
    .then((r) => (r.ok ? r.json() : null))
    .then((j: { stats?: LiveStats | null } | null) => j?.stats ?? null)
    .catch(() => null);
  return cache;
}

export interface Numbers {
  followers: string;
  views: string;
  viewsLabel: string;
  engagement: string;
  asOf: string;
  split: { meredith: string; bernie: string } | null;
}

const KIT: Numbers = { followers: reach[0].value, views: reach[1].value, viewsLabel: reach[1].label, engagement: reach[2].value, asOf: reachAsOf, split: null };

function combine(s: LiveStats | null): Numbers {
  if (!s) return KIT;
  const when = s.updated_at ? new Date(s.updated_at).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "America/New_York" }) : "";
  const live = s.followers !== null || s.views !== null || !!s.engagement;
  return {
    followers: s.followers !== null ? fmt(s.followers) : KIT.followers,
    views: s.views !== null ? fmt(s.views, true) : KIT.views,
    viewsLabel: s.views !== null && s.views_period ? `${KIT.viewsLabel} (${s.views_period})` : KIT.viewsLabel,
    engagement: s.engagement ? `${s.engagement}%` : KIT.engagement,
    asOf: live && when ? when : KIT.asOf,
    split: s.split ? { meredith: fmt(s.split.meredith), bernie: fmt(s.split.bernie) } : null,
  };
}

/** The numbers to show: the media kit's right away, then the latest saved ones once they load. */
export function useNumbers(): Numbers {
  const [n, setN] = useState<Numbers>(KIT);
  useEffect(() => {
    let live = true;
    void load().then((s) => live && setN(combine(s)));
    return () => {
      live = false;
    };
  }, []);
  return n;
}
