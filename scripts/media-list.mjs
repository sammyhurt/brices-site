// Writes the list of photos in public/media for the edit mode's photo library.
import { readdirSync, writeFileSync } from "node:fs";
const skip = /^(hero-|og\.|.*-sm\.jpg$)/;
const names = readdirSync("public/media").filter((f) => f.endsWith(".jpg") && !skip.test(f)).map((f) => f.replace(/\.jpg$/, "")).sort();
writeFileSync("src/site/media-list.json", JSON.stringify(names) + "\n");
console.log(`photo library: ${names.length} photos`);
