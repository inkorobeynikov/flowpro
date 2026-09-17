// Site-wide acceptance checks: every indexable page must pass the same rules the
// AI Visibility Checker applies to a client site. If a page here fails, the
// extension would fail it too.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const publicDir = fileURLToPath(new URL("../public/", import.meta.url));

async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await htmlFiles(full)));
    else if (entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

const files = (await htmlFiles(publicDir)).sort();
assert.ok(files.length >= 10, "expected the full page set to be present");

// by.html is the separate flowpro.by landing; welcome/goodbye are noindex
// extension pages with their own rules, checked in ai-visibility.test.mjs.
const excluded = new Set([
  "by.html",
  join("ai-visibility", "welcome", "index.html"),
  join("ai-visibility", "goodbye", "index.html"),
]);

const pages = [];
for (const file of files) {
  const rel = relative(publicDir, file);
  if (excluded.has(rel)) continue;
  pages.push({ rel, html: await readFile(file, "utf8") });
}

const expectedPages = [
  "index.html",
  join("about", "index.html"),
  join("ai-visibility", "index.html"),
  join("ai-visibility", "fix", "index.html"),
  join("ai-visibility", "privacy", "index.html"),
  join("automatyzacja", "index.html"),
  join("privacy", "index.html"),
  join("pl", "index.html"),
  join("pl", "ai-visibility", "index.html"),
  join("pl", "ai-visibility", "fix", "index.html"),
  join("pl", "privacy", "index.html"),
];
for (const expected of expectedPages) {
  assert.ok(
    pages.some((page) => page.rel === expected),
    `missing page: ${expected}`,
  );
}

function text(fragment) {
  return fragment
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/g, " ")
    .trim();
}

for (const { rel, html } of pages) {
  const where = (message) => `${rel}: ${message}`;

  assert.match(html, /<html lang="(en|pl)"/, where("missing or invalid lang attribute"));

  const h1s = [...html.matchAll(/<h1(?:\s[^>]*)?>/gi)];
  assert.equal(h1s.length, 1, where("must have exactly one H1"));

  const title = html.match(/<title>([\s\S]*?)<\/title>/)?.[1];
  assert.ok(title, where("missing title"));
  assert.ok(
    title.length >= 30 && title.length <= 60,
    where(`title must be 30–60 characters; got ${title.length}`),
  );

  const description = html.match(/<meta\s+name="description"[\s\S]*?content="([^"]+)"/i)?.[1];
  assert.ok(description, where("missing meta description"));
  assert.ok(
    description.length >= 70 && description.length <= 160,
    where(`meta description must be 70–160 characters; got ${description.length}`),
  );

  assert.match(html, /<link rel="canonical" href="https:\/\/flowpro\.dev\//, where("missing canonical"));

  for (const property of [
    "og:type",
    "og:url",
    "og:title",
    "og:description",
    "og:image",
    "og:image:width",
    "og:image:height",
  ]) {
    assert.match(
      html,
      new RegExp(`<meta\\s+property="${property}"[\\s\\S]{0,40}?content="[^"]+"`),
      where(`missing ${property}`),
    );
  }
  assert.match(html, /<meta name="twitter:card" content="summary_large_image"/, where("missing twitter:card"));

  // Cookieless analytics on every page, and nothing else.
  assert.match(
    html,
    /<script defer src="https:\/\/cloud\.umami\.is\/script\.js" data-website-id="[^"]+"><\/script>/,
    where("missing the Umami snippet"),
  );
  assert.doesNotMatch(html, /googletagmanager|google-analytics|gtag\(|fbq\(/i, where("no third-party tracking"));
  assert.doesNotMatch(html, /document\.cookie/, where("this site sets no cookies"));

  // Launch placeholders must be gone.
  for (const placeholder of ["STORE_URL", "GOOGLE_FORM_ACTION_URL", "LINKEDIN_URL", "entry."]) {
    assert.ok(!html.includes(placeholder), where(`leftover placeholder: ${placeholder}`));
  }
  assert.doesNotMatch(html, /linkedin\.com/i, where("LinkedIn is undecided; no link anywhere"));
  assert.doesNotMatch(html, /<meta\s+name="robots"[^>]*noindex/i, where("page must be indexable"));

  // Opening paragraph: an answer, before the first H2, under 60 words.
  const h1End = html.indexOf("</h1>");
  const nextH2 = html.indexOf("<h2", h1End);
  // The extension privacy policy is one continuous document with no H2.
  const openingEnd = nextH2 > h1End ? nextH2 : html.length;
  const opening = html.slice(h1End, openingEnd).match(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/i);
  assert.ok(opening, where("expected a paragraph between the H1 and the first H2"));
  const words = text(opening[1]).split(/\s+/).filter(Boolean);
  assert.ok(
    words.length > 0 && words.length < 60,
    where(`opening paragraph must be under 60 words; got ${words.length}`),
  );

  // JSON-LD must parse, and FAQ answers must match the visible text verbatim.
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
    (match) => {
      try {
        return JSON.parse(match[1]);
      } catch (error) {
        assert.fail(where(`invalid JSON-LD: ${error.message}`));
      }
    },
  );
  assert.ok(blocks.length >= 1, where("missing JSON-LD"));

  const faq = blocks.find((block) => block["@type"] === "FAQPage");
  if (faq) {
    for (const question of faq.mainEntity) {
      assert.ok(
        html.includes(`<h3>${question.name}</h3>`),
        where(`FAQ question is not visible: ${question.name}`),
      );
      assert.ok(
        html.includes(`<p>${question.acceptedAnswer.text}</p>`),
        where(`FAQ answer does not match the visible text: ${question.name}`),
      );
    }
  }
}

// Language pairs must point at each other, with x-default on the English page.
const pairs = [
  ["index.html", "https://flowpro.dev/", join("pl", "index.html"), "https://flowpro.dev/pl/"],
  [
    join("ai-visibility", "index.html"),
    "https://flowpro.dev/ai-visibility/",
    join("pl", "ai-visibility", "index.html"),
    "https://flowpro.dev/pl/ai-visibility/",
  ],
  [
    join("ai-visibility", "fix", "index.html"),
    "https://flowpro.dev/ai-visibility/fix/",
    join("pl", "ai-visibility", "fix", "index.html"),
    "https://flowpro.dev/pl/ai-visibility/fix/",
  ],
  [join("privacy", "index.html"), "https://flowpro.dev/privacy/", join("pl", "privacy", "index.html"), "https://flowpro.dev/pl/privacy/"],
];
for (const [enRel, enUrl, plRel, plUrl] of pairs) {
  for (const rel of [enRel, plRel]) {
    const page = pages.find((candidate) => candidate.rel === rel);
    assert.ok(page, `missing page: ${rel}`);
    assert.ok(page.html.includes(`hreflang="en" href="${enUrl}"`), `${rel}: missing en hreflang`);
    assert.ok(page.html.includes(`hreflang="pl" href="${plUrl}"`), `${rel}: missing pl hreflang`);
    assert.ok(
      page.html.includes(`hreflang="x-default" href="${enUrl}"`),
      `${rel}: x-default must point at the English page`,
    );
  }
}

// One Organization identity across the site.
for (const { rel, html } of pages) {
  if (!html.includes('"@type": "Organization"')) continue;
  assert.ok(
    html.includes('"@id": "https://flowpro.dev/#organization"'),
    `${rel}: Organization must reuse the site-wide @id`,
  );
}

console.log(`Site checks passed (${pages.length} pages)`);
