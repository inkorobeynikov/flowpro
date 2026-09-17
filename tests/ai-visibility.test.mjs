// The extension's own pages: landing (EN/PL), fix service (EN/PL), privacy,
// and the noindex welcome/goodbye pages Chrome opens on install and uninstall.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [checker, checkerPl, fix, fixPl, privacy, sitePrivacy, welcome, goodbye, home] =
  await Promise.all(
    [
      "../public/ai-visibility/index.html",
      "../public/pl/ai-visibility/index.html",
      "../public/ai-visibility/fix/index.html",
      "../public/pl/ai-visibility/fix/index.html",
      "../public/ai-visibility/privacy/index.html",
      "../public/privacy/index.html",
      "../public/ai-visibility/welcome/index.html",
      "../public/ai-visibility/goodbye/index.html",
      "../public/index.html",
    ].map((path) => readFile(new URL(path, import.meta.url), "utf8")),
  );

const STORE_URL = "https://chromewebstore.google.com/detail/cffeopkncghiajcekbilommeckchjkbk";

function jsonLd(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) =>
    JSON.parse(match[1]),
  );
}

// ─── Checker landing pages ──────────────────────────────────────────────────
for (const [name, html] of [
  ["checker (EN)", checker],
  ["checker (PL)", checkerPl],
]) {
  const types = jsonLd(html).map((block) => block["@type"]);
  assert.ok(types.includes("SoftwareApplication"), `${name}: missing SoftwareApplication schema`);
  assert.ok(types.includes("FAQPage"), `${name}: missing FAQPage schema`);

  const software = jsonLd(html).find((block) => block["@type"] === "SoftwareApplication");
  assert.equal(software.isAccessibleForFree, true, `${name}: the extension is free`);
  assert.equal(
    software.publisher["@id"],
    "https://flowpro.dev/#organization",
    `${name}: SoftwareApplication must reference the site Organization`,
  );

  const faq = jsonLd(html).find((block) => block["@type"] === "FAQPage");
  assert.equal(faq.mainEntity.length, 6, `${name}: expected six FAQ entries`);

  assert.ok(html.includes(`href="${STORE_URL}"`), `${name}: Chrome Web Store CTA is missing`);
  assert.match(html, /17 test|17 checks/, `${name}: must state the number of checks`);
  assert.match(html, /id="waitlist"/, `${name}: waitlist section is missing`);
  assert.match(html, /id="next"/, `${name}: "what next" section is missing`);

  // Four verdicts and their thresholds, and no promise of citation.
  for (const threshold of ["0–39", "40–69", "70–89", "90–100"]) {
    assert.ok(html.includes(threshold), `${name}: missing verdict range ${threshold}`);
  }
  assert.match(
    html,
    /not a promise|nie jest obietnicą|nie obietnicą/i,
    `${name}: must say the score is not a promise`,
  );
}

// The crawlers named in the copy are exactly the ones @aeo/core checks
// (packages/core/src/checks/robots-ai-bots.ts: PRIMARY then SECONDARY).
for (const agent of [
  "GPTBot",
  "ClaudeBot",
  "PerplexityBot",
  "OAI-SearchBot",
  "Claude-Web",
  "Google-Extended",
  "Bingbot",
  "CCBot",
  "Applebot-Extended",
]) {
  assert.ok(checker.includes(agent), `checker page must name ${agent}`);
  assert.ok(checkerPl.includes(agent), `Polish checker page must name ${agent}`);
}

assert.match(checker, /href="\/ai-visibility\/fix\/"/, "checker page must link to the fix service");
assert.match(checkerPl, /href="\/pl\/ai-visibility\/fix\/"/, "Polish checker page must link to the fix service");
assert.match(home, /href="\/ai-visibility\/"/, "the checker must be reachable from the home page");

// ─── Fix service pages ──────────────────────────────────────────────────────
// The offer is an audit that costs nothing and work priced to an agreed scope,
// so the schema carries a range, never a single price.
for (const [name, html, range] of [
  ["fix (EN)", fix, "between 2&nbsp;000 and 6&nbsp;000 zł net"],
  ["fix (PL)", fixPl, "między 2&nbsp;000 a 6&nbsp;000 zł netto"],
]) {
  const service = jsonLd(html).find((block) => block["@type"] === "Service");
  assert.ok(service, `${name}: missing Service schema`);
  assert.equal(service["@id"], "https://flowpro.dev/ai-visibility/fix/#service");
  assert.equal(service.offers.price, undefined, `${name}: there is no single price any more`);
  assert.equal(service.offers.priceSpecification.priceCurrency, "PLN");
  assert.equal(service.offers.priceSpecification.minPrice, "2000", `${name}: range floor`);
  assert.equal(service.offers.priceSpecification.maxPrice, "6000", `${name}: range ceiling`);
  assert.equal(
    service.provider["@id"],
    "https://flowpro.dev/#organization",
    `${name}: Service must reference the site Organization`,
  );

  assert.ok(html.includes(range), `${name}: the typical range must be visible on the page`);
  assert.match(
    html,
    /Free|Bezpłatnie/,
    `${name}: the page must say the audit and estimate cost nothing`,
  );
  assert.match(html, /id="request"/, `${name}: request form anchor is missing`);
  assert.match(html, /id="request-url"/, `${name}: the form must ask for the website address`);
  assert.match(html, /id="request-email"/, `${name}: the form must ask for an email address`);
  assert.match(html, /art\. 113/, `${name}: the VAT exemption note is missing`);
  assert.match(html, /NIP: 9512646879/, `${name}: the legal identity is missing`);
}

// ─── Form contract ──────────────────────────────────────────────────────────
// Every form posts JSON to the API, carries the campaign context, hides a
// honeypot, and degrades to a prefilled mailto: when the API is unreachable.
const forms = [
  ["fix (EN)", fix, "https://api.flowpro.dev/v1/site/audit-request", ["url", "email", "platform", "notes", "src", "score", "ref", "lang", "page"]],
  ["fix (PL)", fixPl, "https://api.flowpro.dev/v1/site/audit-request", ["url", "email", "platform", "notes", "src", "score", "ref", "lang", "page"]],
  ["checker (EN)", checker, "https://api.flowpro.dev/v1/site/waitlist", ["email", "src", "ref", "lang", "page"]],
  ["checker (PL)", checkerPl, "https://api.flowpro.dev/v1/site/waitlist", ["email", "src", "ref", "lang", "page"]],
  ["welcome", welcome, "https://api.flowpro.dev/v1/site/waitlist", ["email", "src", "ref", "lang", "page"]],
  ["goodbye", goodbye, "https://api.flowpro.dev/v1/site/feedback", ["reason", "detail", "src", "lang", "page"]],
];
for (const [name, html, endpoint, fields] of forms) {
  assert.ok(html.includes(`var ENDPOINT = "${endpoint}"`), `${name}: wrong or missing API endpoint`);
  for (const field of fields) {
    assert.match(html, new RegExp(`name="${field}"`), `${name}: form is missing the ${field} field`);
  }
  assert.match(html, /name="company"/, `${name}: honeypot field is missing`);
  assert.match(
    html,
    /name="company"[\s\S]{0,200}?|<span aria-hidden="true" style="position:absolute;width:1px/,
    `${name}: honeypot must be hidden in CSS`,
  );
  assert.match(html, /id="form-error-mailto"/, `${name}: mailto fallback link is missing`);
  assert.match(html, /mailtoLink\.href = /, `${name}: mailto fallback is not populated on failure`);
  assert.match(html, /if \(!response\.ok\) throw new Error/, `${name}: a non-2xx response must trigger the fallback`);
  assert.doesNotMatch(html, /<iframe/, `${name}: the iframe transport should be gone`);
}

// The fix page carries the campaign context from the extension's deep link.
for (const [name, html] of [["fix (EN)", fix], ["fix (PL)", fixPl]]) {
  assert.match(html, /\["src", "score", "ref"\]\.forEach/, `${name}: must read ?src=&score=&ref= into hidden fields`);
}

// ─── Privacy policies ───────────────────────────────────────────────────────
assert.match(
  privacy,
  /Ivan Karabeinikau Digital Engineering, a sole proprietorship registered in the Polish business register \(CEIDG\), operating as FlowPro, ul\. Bokserska 63, 02-690 Warszawa, Poland\. NIP: 9512646879\./,
  "extension privacy page must keep the complete operator details",
);
assert.match(privacy, /href="mailto:ivan@flowpro\.dev">ivan@flowpro\.dev<\/a>/);
assert.doesNotMatch(
  privacy,
  /\[(?:STREET AND NUMBER|POSTCODE|Operator|Contact)\]/i,
  "extension privacy page still contains placeholders",
);
assert.match(
  privacy,
  /href="\/privacy\/"/,
  "extension privacy page must link to the site privacy policy it refers to",
);

assert.match(sitePrivacy, /NIP: 9512646879/, "site privacy policy must name the controller");
assert.match(sitePrivacy, /href="\/ai-visibility\/privacy\/"/, "site policy must link to the extension policy");
for (const topic of ["waitlist", "Server logs", "GDPR", "Urzędu Ochrony Danych Osobowych"]) {
  assert.ok(sitePrivacy.includes(topic), `site privacy policy is missing: ${topic}`);
}
// The page-view counter is described, and described as cookieless.
assert.match(sitePrivacy, /Umami/, "site privacy policy must name the analytics tool it loads");
assert.match(sitePrivacy, /cookieless/, "site privacy policy must say the analytics sets no cookies");
assert.doesNotMatch(
  sitePrivacy,
  /There is no analytics script/,
  "the policy must not claim there is no analytics while the snippet is on the page",
);

// ─── Install / uninstall pages ──────────────────────────────────────────────
for (const [page, html, heading] of [
  ["welcome", welcome, "Installed. Here's how to run your first check"],
  ["goodbye", goodbye, "Sorry to see you go"],
]) {
  assert.match(html, /<meta\s+name="robots"\s+content="noindex, nofollow"\s*\/?>/i, `${page} page must be noindex`);
  assert.equal([...html.matchAll(/<h1(?:\s[^>]*)?>/gi)].length, 1, `${page} page must have exactly one H1`);
  assert.ok(html.includes(heading), `${page} page is missing its heading`);
}

assert.match(welcome, /Open any website/);
assert.match(welcome, /Click the icon in your toolbar/);
assert.match(welcome, /Read “Fix first”/);
assert.match(welcome, /Nothing leaves your browser/);
assert.match(welcome, /id="waitlist-form"/);
assert.match(welcome, /href="\/ai-visibility\/privacy\/"/);

assert.match(goodbye, /What was missing\?/);
for (const response of ["Wrong results", "Not useful for my site", "Too technical", "Just testing", "Other"]) {
  assert.ok(goodbye.includes(response), `goodbye page missing response: ${response}`);
}
assert.match(goodbye, /id="other-detail"/);
assert.match(goodbye, /<button class="button" type="submit"[^>]*>Send<\/button>/);
assert.match(goodbye, /Thank you for the feedback\./);

// The fixed-price package is retired; no page may quote it again.
for (const [name, html] of [
  ["checker (EN)", checker],
  ["checker (PL)", checkerPl],
  ["fix (EN)", fix],
  ["fix (PL)", fixPl],
]) {
  for (const retired of ["2 900", "€690", "690 €", "fixed-price package", "pakiet w stałej cenie"]) {
    assert.ok(!html.includes(retired), `${name}: retired fixed-price wording: ${retired}`);
  }
}

console.log("AI Visibility checks passed");
