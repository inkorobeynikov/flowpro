import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, sitemap, llms, nginx, nginxLegacy] = await Promise.all([
  readFile(new URL("../public/index.html", import.meta.url), "utf8"),
  readFile(new URL("../public/sitemap.xml", import.meta.url), "utf8"),
  readFile(new URL("../public/llms.txt", import.meta.url), "utf8"),
  readFile(new URL("../nginx/flowpro.conf", import.meta.url), "utf8"),
  readFile(new URL("../nginx/flowpro.dev.conf", import.meta.url), "utf8"),
]);

const jsonLdBlocks = [...html.matchAll(
  /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/g,
)].map((match) => JSON.parse(match[1]));

const schemaTypes = jsonLdBlocks.map((block) => block["@type"]);
assert.ok(schemaTypes.includes("Organization"), "missing Organization schema");
assert.ok(schemaTypes.includes("Service"), "missing Service schema");
assert.ok(schemaTypes.includes("FAQPage"), "missing FAQPage schema");
assert.ok(
  schemaTypes.filter((type) => type === "Offer").length >= 2,
  "expected at least two Offer schemas",
);

const faq = jsonLdBlocks.find((block) => block["@type"] === "FAQPage");
assert.ok(
  faq.mainEntity.length >= 3 && faq.mainEntity.length <= 6,
  "expected three to six FAQ schema entries",
);
for (const question of faq.mainEntity) {
  assert.ok(html.includes(`<h3>${question.name}</h3>`), `FAQ question is not visible: ${question.name}`);
  assert.ok(html.includes(`<p>${question.acceptedAnswer.text}</p>`), `FAQ answer is not visible: ${question.name}`);
}

assert.match(html, /<section class="section" id="faq">/);
assert.match(
  html,
  /<h1>[\s\S]*?<\/h1>[\s\S]*?<p class="hero-sub">[\s\S]*?zarządzana usługa automatyzacji i AI/i,
  "hero summary must define the managed service immediately after the h1",
);

assert.match(sitemap, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
assert.match(sitemap, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
assert.match(sitemap, /<loc>https:\/\/flowpro\.dev\/<\/loc>/);

assert.ok(llms.startsWith("# FlowPro\n"), "llms.txt must be plain Markdown-like text");
assert.doesNotMatch(llms, /<!doctype html|<html/i);

for (const config of [nginx, nginxLegacy]) {
  assert.match(
    config,
    /location = \/sitemap\.xml\s*{[\s\S]*?default_type application\/xml;[\s\S]*?try_files \$uri =404;\s*}/,
  );
  assert.match(
    config,
    /location = \/llms\.txt\s*{[\s\S]*?default_type text\/plain;[\s\S]*?try_files \$uri =404;\s*}/,
  );
}

console.log("AEO checks passed");
