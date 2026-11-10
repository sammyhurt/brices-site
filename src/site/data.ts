/**
 * Every fact here comes from the Meredith & Bernie hotel partnership media kit.
 * Numbers are as of the kit (Nov 2026). Update `reachAsOf` when you refresh them.
 */
export const brand = {
  name: "Meredith & Bernie",
  short: "The Brices",
  tagline: "Hotel partnerships",
  email: "meredithkbrice@gmail.com",
  mediaKit: "/Meredith-and-Bernie-Media-Kit.pdf",
  about:
    "Meredith & Bernie Brice are NYC newlyweds making luxury travel content, fashion content and lifestyle couples content. Meredith is a professional photographer and Bernie creates fashion content, so every shoot is styled, shot and edited by us. We love sharing our life, style and travel.",
};

export const socials = [
  { label: "TikTok", handle: "@meredithbrice_", href: "https://www.tiktok.com/@meredithbrice_" },
  { label: "TikTok", handle: "@llilbill", href: "https://www.tiktok.com/@llilbill" },
  { label: "Instagram", handle: "@merrymorris", href: "https://www.instagram.com/merrymorris/" },
  { label: "Instagram", handle: "@llilbill", href: "https://www.instagram.com/llilbill/" },
];

export const reachAsOf = "Nov 2026";
export const reach = [
  { value: "14.1K", label: "combined followers" },
  { value: "1.8M+", label: "views across Instagram and TikTok" },
  { value: "6.3%", label: "average engagement rate" },
  { value: "71%", label: "of our audience is 18 to 37" },
  { value: "63%", label: "of our audience is based in the United States" },
];

export const quietLuxury = [
  "Shot like a magazine spread, because that's where Meredith's work runs.",
  "Your property is the hero. No clutter, no shouting at the camera.",
  "Real chemistry and real humor, so people watch to the end.",
  "Easy to host. We send a shot list ahead and work around your guests and staff.",
];

export interface Clip { img: string; title: string; href?: string }
export interface Partnership {
  slug: string; name: string; place: string; kind: string; cover: string; photos: string[]; clips: Clip[]; gallery?: string; summary: string;
}
export const partnerships: Partnership[] = [
  {
    slug: "willow-tree-house", name: "Willow Tree House", place: "New York", kind: "Treehouse stay", cover: "willow-cover",
    summary: "A treehouse stay in New York, photographed and filmed by us: the property, the views and couples content.",
    photos: ["willow-1", "willow-2", "willow-3", "willow-4", "willow-5", "willow-6", "willow-7"],
    clips: [
      { img: "willow-v-vlog", title: "Willow Tree vlog", href: "https://www.tiktok.com/@meredithbrice_/video/7636012001465994526" },
      { img: "willow-v-ugc", title: "UGC: couples content", href: "https://www.tiktok.com/@meredithbrice_/video/7636003148787633439" },
      { img: "willow-v-view", title: "Willow Tree House view", href: "https://www.tiktok.com/@meredithbrice_/video/7634345998524960031" },
    ],
    gallery: "https://meredithmorris.pixieset.com/willowtreehouse/",
  },
  {
    slug: "catskills", name: "Catskills", place: "New York", kind: "Winter getaway", cover: "catskills-cover",
    summary: "A Catskills winter getaway: the sauna, the cabin interiors and couples content inside the property.",
    photos: ["catskills-1", "catskills-2", "catskills-3", "catskills-4", "catskills-5", "catskills-6"],
    clips: [
      { img: "catskills-v-sauna", title: "Sauna escape", href: "https://www.tiktok.com/@llilbill/video/7607234270289038623" },
      { img: "catskills-v-getaway", title: "Catskills winter getaway", href: "https://www.tiktok.com/@meredithbrice_/video/7608017044650347789" },
      { img: "catskills-v-inside", title: "Couple content inside the hotel" },
    ],
  },
  {
    slug: "casa-bianca", name: "Casa Bianca", place: "Sicily, Italy", kind: "Airbnb collab", cover: "casa-cover",
    summary: "An Airbnb collab at Casa Bianca on the Sicilian coast: the house, the sea, sunsets from the bedroom and POV content.",
    photos: ["casa-1", "casa-2", "casa-3", "casa-4", "casa-5", "casa-6", "casa-7"],
    clips: [
      { img: "casa-v-collab", title: "Casa Bianca Airbnb collab", href: "https://www.tiktok.com/@meredithbrice_/video/7548729056909479181" },
      { img: "casa-v-sunset", title: "Sunset from the bedroom", href: "https://www.tiktok.com/@meredithbrice_/video/7548389240191683853" },
      { img: "casa-v-pov", title: "POV content of the collab", href: "https://www.tiktok.com/@meredithbrice_/video/7551144669531442446" },
    ],
    gallery: "https://meredithmorris.pixieset.com/casabianca/",
  },
];

export const couples: Clip[] = [
  { img: "couples-greece", title: "Travel couples content: Summer 2026, Greece & Italy", href: "https://www.tiktok.com/@meredithbrice_/video/7695441315080752397" },
  { img: "couples-santorini", title: "Airbnb collab in Santorini, Greece", href: "https://www.tiktok.com/@meredithbrice_/video/7554003022452411662" },
  { img: "couples-intro", title: "Introduction of the Brices", href: "https://www.tiktok.com/@meredithbrice_/video/7693643251470896397" },
  { img: "couples-ralph", title: "NYC Ralph Lauren tux fitting: 570K views", href: "https://www.tiktok.com/@meredithbrice_/video/7638628165140630815" },
  { img: "couples-fashion", title: "NYC Fall 2026 fashion campaign", href: "https://www.tiktok.com/@meredithbrice_/video/7697740083994184974" },
  { img: "willow-v-vlog", title: "Willow Tree House collab in New York", href: "https://www.tiktok.com/@meredithbrice_/video/7636012001465994526" },
];

export const ideas = [
  { n: "01", title: "The Arrival", body: "“POV: he finally booked the hotel you’ve been sending him for months.”" },
  { n: "02", title: "48 Hours at your property", body: "Morning coffee to nightcap." },
  { n: "03", title: "The Room Tour for Two", body: "“The view is great, but wait for the bathtub.”" },
  { n: "04", title: "The Dinner Date", body: "Golden hour at the restaurant or bar at the hotel or nearby." },
  { n: "05", title: "The Portrait Series", body: "Editorial photos shot on property, for you and for us." },
];

export const pkg = [
  { count: "3", what: "TikTok videos", detail: "Shot and edited in 9:16, ready for your channels or ads. Also posted on ours." },
  { count: "1", what: "Instagram Reel", detail: "Cut for reach, delivered for your feed and posted on ours." },
  { count: "15", what: "Edited photos", detail: "Shot and retouched by a professional photographer, sized for feed, stories and web." },
];

/** Hero chapters shown over the scroll video. */
export const heroChapters = [
  { from: 0.25, to: 0.44, value: "14.1K", label: "combined followers", place: "Willow Tree House · New York" },
  { from: 0.51, to: 0.67, value: "1.8M+", label: "views across Instagram and TikTok", place: "Catskills · New York" },
  { from: 0.75, to: 0.95, value: "6.3%", label: "average engagement rate", place: "Styled, shot and edited by us" },
];
