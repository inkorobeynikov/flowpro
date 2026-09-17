// Machine-readable discovery files, the home pages, and the legacy automation
// offer that used to live at the site root.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [home, homePl, legacy, sitemap, llms, robots, nginx, nginxLegacy] = await Promise.all([
  readFile(new URL("../public/index.html", import.meta.url), "utf8"),
  readFile(new URL("../public/pl/index.html", import.meta.url), "utf8"),
  readFile(new URL("../public/automatyzacja/index.html", import.meta.url), "utf8"),
  readFile(new URL("../public/sitemap.xml", import.meta.url), "utf8"),
  readFile(new URL("../public/llms.txt", import.meta.url), "utf8"),
  readFile(new URL("../public/robots.txt", import.meta.url), "utf8"),
  readFile(new URL("../nginx/flowpro.conf", import.meta.url), "utf8"),
  readFile(new URL("../nginx/flowpro.dev.conf", import.meta.url), "utf8"),
]);

function jsonLd(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) =>
    JSON.parse(match[1]),
  );
}

// ─── Home (EN) ──────────────────────────────────────────────────────────────
const homeTypes = jsonLd(home).map((block) => block["@type"]);
for (const type of ["Organization", "Service", "FAQPage"]) {
  assert.ok(homeTypes.includes(type), `home page is missing ${type} schema`);
}

assert.match(
  home,
  /<h1>[\s\S]*?<\/h1>[\s\S]*?<p class="hero-sub">[\s\S]*?checks whether ChatGPT, Claude, Perplexity and Gemini/i,
  "the home page must say what FlowPro does immediately after the H1",
);
assert.match(home, /href="\/ai-visibility\/"/, "home page must link to the checker");
assert.match(home, /href="\/ai-visibility\/fix\/"/, "home page must link to the fix service");
assert.match(home, /href="\/automatyzacja\/"/, "home page must link to the legacy automation offer");
assert.match(home, /href="\/pl\/"/, "home page must link to the Polish version");

// No promise about what AI assistants will do.
for (const page of [home, homePl]) {
  assert.doesNotMatch(page, /guarantee[ds]?\b/i, "no guarantees in the copy");
}
assert.match(home, /What I don't promise/, "the home page must keep the honest-limits section");
assert.match(homePl, /Czego nie obiecuję/, "the Polish home page must keep the honest-limits section");

// The former Polish home page anchors now live on /automatyzacja/.
const legacyAnchors = [
  "#problem",
  "#oferta",
  "#pakiet",
  "#przyklad",
  "#proces",
  "#mozliwosci",
  "#o-nas",
  "#cennik",
  "#faq",
  "#kontakt",
];
for (const anchor of legacyAnchors) {
  assert.ok(
    home.includes(`"${anchor}"`),
    `home page must redirect the legacy anchor ${anchor} to /automatyzacja/`,
  );
  assert.match(
    legacy,
    new RegExp(`id="${anchor.slice(1)}"`),
    `/automatyzacja/ must keep the legacy anchor ${anchor}`,
  );
  assert.doesNotMatch(
    home,
    new RegExp(`id="${anchor.slice(1)}"`),
    `home page must not reuse the legacy id ${anchor}`,
  );
}
assert.match(
  home,
  /window\.location\.replace\("\/automatyzacja\/" \+ window\.location\.hash\)/,
  "home page must forward legacy fragments to /automatyzacja/",
);

// ─── Legacy automation page ─────────────────────────────────────────────────
assert.match(legacy, /<link rel="canonical" href="https:\/\/flowpro\.dev\/automatyzacja\/" \/>/);
assert.match(legacy, /Mała agencja/, "the legacy offer copy must be preserved");
assert.match(legacy, /calendar\.app\.google/, "the calendar booking link stays on the legacy page");
assert.doesNotMatch(home, /calendar\.app\.google/, "the calendar link belongs only to the legacy page");
const legacyTypes = jsonLd(legacy).map((block) => block["@type"]);
assert.ok(legacyTypes.filter((type) => type === "Offer").length >= 2, "legacy page keeps both Offer blocks");

// ─── sitemap.xml ────────────────────────────────────────────────────────────
assert.match(sitemap, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
assert.match(sitemap, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/);
for (const url of [
  "https://flowpro.dev/",
  "https://flowpro.dev/pl/",
  "https://flowpro.dev/ai-visibility/",
  "https://flowpro.dev/pl/ai-visibility/",
  "https://flowpro.dev/ai-visibility/fix/",
  "https://flowpro.dev/pl/ai-visibility/fix/",
  "https://flowpro.dev/about/",
  "https://flowpro.dev/automatyzacja/",
  "https://flowpro.dev/privacy/",
  "https://flowpro.dev/pl/privacy/",
  "https://flowpro.dev/ai-visibility/privacy/",
]) {
  assert.ok(sitemap.includes(`<loc>${url}</loc>`), `sitemap is missing ${url}`);
}

// ─── llms.txt ───────────────────────────────────────────────────────────────
assert.ok(llms.startsWith("# FlowPro\n"), "llms.txt must be plain Markdown-like text");
assert.doesNotMatch(llms, /<!doctype html|<html/i, "llms.txt must not be an HTML page");
assert.match(llms, /AI Visibility Checker/, "llms.txt must describe the current offer");
assert.match(llms, /https:\/\/flowpro\.dev\/ai-visibility\/fix\//, "llms.txt must list the fix service");
assert.doesNotMatch(llms, /4 000 PLN/, "llms.txt must not advertise the retired starter price");

// ─── robots.txt ─────────────────────────────────────────────────────────────
for (const agent of [
  "OAI-SearchBot",
  "ChatGPT-User",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
]) {
  assert.match(
    robots,
    new RegExp(`User-agent: ${agent}\\s*\\nAllow: /`),
    `robots.txt must allow ${agent}`,
  );
}
assert.doesNotMatch(robots, /^Disallow: \/$/m, "robots.txt must not block the whole site");
assert.match(robots, /Sitemap: https:\/\/flowpro\.dev\/sitemap\.xml/);

// ─── nginx ──────────────────────────────────────────────────────────────────
for (const config of [nginx, nginxLegacy]) {
  assert.match(
    config,
    /location = \/sitemap\.xml\s*{[\s\S]*?default_type application\/xml;[\s\S]*?try_files \$uri =404;\s*}/,
  );
  assert.match(
    config,
    /location = \/llms\.txt\s*{[\s\S]*?default_type text\/plain;[\s\S]*?try_files \$uri =404;\s*}/,
  );
  assert.match(
    config,
    /location \/ {\s*try_files \$uri \$uri\/ =404;\s*}/,
    "a missing path must 404 rather than serve the home page",
  );
}

console.log("AEO checks passed");
