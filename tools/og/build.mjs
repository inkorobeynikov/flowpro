/**
 * Renders the three Open Graph images (1200×630) from template.html with
 * headless Chrome. No dependencies; Chrome is the only requirement.
 *
 *   node tools/og/build.mjs
 *
 * Override the browser with CHROME=/path/to/chrome if it is not in the
 * default location for your platform.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, "..", "..", "public");

const IMAGES = [
  {
    file: "og-image-en.png",
    headline: "Can AI assistants read your website?",
    sub: "Free Chrome extension: 17 checks for ChatGPT, Claude, Perplexity and Gemini. Fixes implemented at a fixed price.",
  },
  {
    file: "og-image-pl.png",
    headline: "Czy asystenci AI potrafią czytać Twoją stronę?",
    sub: "Bezpłatne rozszerzenie Chrome: 17 testów dla ChatGPT, Claude, Perplexity i Gemini. Wdrożenie poprawek w stałej cenie.",
  },
  {
    file: "og-image-extension.png",
    headline: "AI Visibility Checker",
    sub: "A free Chrome extension. 17 checks in four groups, a 0–100 score and a prioritised fix list. Runs locally, no account.",
  },
];

const CANDIDATES = [
  process.env.CHROME,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);
const chrome = CANDIDATES.find((path) => existsSync(path));
if (!chrome) throw new Error(`Chrome not found. Tried:\n${CANDIDATES.join("\n")}`);

const template = readFileSync(join(here, "template.html"), "utf8");
const work = mkdtempSync(join(tmpdir(), "flowpro-og-"));

const escape = (value) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

for (const image of IMAGES) {
  const html = template
    .replace('<h1 id="headline"></h1>', `<h1 id="headline">${escape(image.headline)}</h1>`)
    .replace('<p id="sub"></p>', `<p id="sub">${escape(image.sub)}</p>`);
  const source = join(work, `${image.file}.html`);
  const rendered = join(work, image.file);
  writeFileSync(source, html, "utf8");
  execFileSync(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      "--window-size=1200,630",
      `--screenshot=${rendered}`,
      "--virtual-time-budget=6000",
      `file:///${source.replace(/\\/g, "/")}`,
    ],
    { stdio: "ignore" },
  );
  copyFileSync(rendered, join(publicDir, "assets", image.file));
  console.log(`wrote public/assets/${image.file}`);
}
