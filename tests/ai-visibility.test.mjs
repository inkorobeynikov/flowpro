import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, privacyHtml, welcomeHtml, goodbyeHtml, sitemap, home] = await Promise.all([
  readFile(new URL("../public/ai-visibility/index.html", import.meta.url), "utf8"),
  readFile(new URL("../public/ai-visibility/privacy/index.html", import.meta.url), "utf8"),
  readFile(new URL("../public/ai-visibility/welcome/index.html", import.meta.url), "utf8"),
  readFile(new URL("../public/ai-visibility/goodbye/index.html", import.meta.url), "utf8"),
  readFile(new URL("../public/sitemap.xml", import.meta.url), "utf8"),
  readFile(new URL("../public/index.html", import.meta.url), "utf8"),
]);

const h1s = [...html.matchAll(/<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/gi)];
assert.equal(h1s.length, 1, "AI Visibility page must have exactly one H1");

const h1End = html.indexOf("</h1>");
const firstH2 = html.indexOf("<h2", h1End);
const betweenHeadings = html.slice(h1End + 5, firstH2);
const firstParagraph = betweenHeadings.match(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/i);
assert.ok(firstParagraph, "expected a paragraph between the H1 and first H2");
const openingWords = firstParagraph[1]
  .replace(/<[^>]+>/g, " ")
  .trim()
  .split(/\s+/)
  .filter(Boolean);
assert.ok(openingWords.length < 60, "opening paragraph must be under 60 words");

const description = html.match(/<meta\s+name="description"\s+content="([^"]+)"\s*\/?>/i)?.[1];
assert.ok(description, "missing meta description");
assert.ok(
  description.length >= 120 && description.length <= 160,
  `meta description must be 120–160 characters; got ${description.length}`,
);

for (const property of ["og:type", "og:url", "og:title", "og:description", "og:image"]) {
  assert.match(html, new RegExp(`<meta\\s+property="${property}"\\s+content="[^"]+"`), `missing ${property}`);
}
assert.doesNotMatch(html, /<meta\s+name="robots"\s+content="[^"]*noindex/i, "page must be indexable");

const jsonLdBlocks = [...html.matchAll(
  /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/g,
)].map((match) => JSON.parse(match[1]));
const schemaTypes = jsonLdBlocks.map((block) => block["@type"]);
assert.ok(schemaTypes.includes("SoftwareApplication"), "missing SoftwareApplication schema");
assert.ok(schemaTypes.includes("FAQPage"), "missing FAQPage schema");

const faq = jsonLdBlocks.find((block) => block["@type"] === "FAQPage");
assert.equal(faq.mainEntity.length, 3, "expected exactly three FAQ schema entries");
for (const question of faq.mainEntity) {
  assert.ok(html.includes(`<h3>${question.name}</h3>`), `FAQ question is not visible: ${question.name}`);
  assert.ok(html.includes(`<p>${question.acceptedAnswer.text}</p>`), `FAQ answer is not visible: ${question.name}`);
}

for (const check of ["AI crawler access", "Sitemap.xml", "Llms.txt", "Structured data", "Meta and Open Graph", "Content structure"]) {
  assert.ok(html.includes(check), `missing audit check: ${check}`);
}

assert.match(html, /href="STORE_URL"/, "Chrome Web Store CTA placeholder is missing");
assert.match(html, /href="\/ai-visibility\/privacy\/"/, "privacy link is missing from the landing page");
assert.match(home, /href="\/ai-visibility\/"/, "AI Visibility page is missing from site navigation");
assert.match(sitemap, /<loc>https:\/\/flowpro\.dev\/ai-visibility\/<\/loc>/);
assert.match(sitemap, /<loc>https:\/\/flowpro\.dev\/ai-visibility\/privacy\/<\/loc>/);

assert.equal(
  [...privacyHtml.matchAll(/<h1(?:\s[^>]*)?>/gi)].length,
  1,
  "privacy page must have exactly one H1",
);
assert.match(
  privacyHtml,
  /Ivan Karabeinikau Digital Engineering, a sole proprietorship registered in the Polish business register \(CEIDG\), operating as FlowPro, ul\. Bokserska 63, 02-690 Warszawa, Poland\. NIP: 9512646879\./,
  "privacy page must contain the complete operator details",
);
assert.match(privacyHtml, /href="mailto:ivan@flowpro\.dev">ivan@flowpro\.dev<\/a>/);
assert.doesNotMatch(privacyHtml, /\[(?:STREET AND NUMBER|POSTCODE|Operator|Contact)\]/i, "privacy page still contains placeholders");
assert.doesNotMatch(privacyHtml, /<meta\s+name="robots"\s+content="[^"]*noindex/i, "privacy page must be indexable");

for (const [page, pageHtml, heading] of [
  ["welcome", welcomeHtml, "Installed. Here's how to run your first check"],
  ["goodbye", goodbyeHtml, "Sorry to see you go"],
]) {
  assert.match(pageHtml, /<meta\s+name="robots"\s+content="noindex, nofollow"\s*\/?>/i, `${page} page must be noindex`);
  assert.equal([...pageHtml.matchAll(/<h1(?:\s[^>]*)?>/gi)].length, 1, `${page} page must have exactly one H1`);
  assert.ok(pageHtml.includes(heading), `${page} page is missing its heading`);
}

assert.match(welcomeHtml, /Open any website/);
assert.match(welcomeHtml, /Click the icon in your toolbar/);
assert.match(welcomeHtml, /Read “Fix first”/);
assert.match(welcomeHtml, /Popup screenshot placeholder/);
assert.match(welcomeHtml, /Nothing leaves your browser/);
assert.match(welcomeHtml, /id="waitlist-form"/);
assert.match(welcomeHtml, /href="\/ai-visibility\/privacy\/"/);

assert.match(goodbyeHtml, /What was missing\?/);
for (const response of ["Wrong results", "Not useful for my site", "Too technical", "Just testing", "Other"]) {
  assert.ok(goodbyeHtml.includes(response), `goodbye page missing response: ${response}`);
}
assert.match(goodbyeHtml, /id="other-detail"/);
assert.match(goodbyeHtml, /<button class="button" type="submit">Send<\/button>/);
assert.match(goodbyeHtml, /Thank you for the feedback\./);

console.log("AI Visibility checks passed");
