// The extension's own pages: landing (EN/PL), fix service (EN/PL), privacy,
// and the noindex welcome/goodbye pages Chrome opens on install and uninstall.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [checker, checkerPl, fix, fixPl, privacy, sitePrivacy, welcome, goodbye, home, webCheck] =
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
      "../public/ai-visibility/check/index.html",
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
  ["fix (EN)", fix, "https://api.flowpro.dev/v1/site/audit-request", ["url", "email", "stack", "message", "src", "score", "ref", "lang", "page"]],
  ["fix (PL)", fixPl, "https://api.flowpro.dev/v1/site/audit-request", ["url", "email", "stack", "message", "src", "score", "ref", "lang", "page"]],
  ["checker (EN)", checker, "https://api.flowpro.dev/v1/site/waitlist", ["email", "src", "ref", "lang", "page"]],
  ["checker (PL)", checkerPl, "https://api.flowpro.dev/v1/site/waitlist", ["email", "src", "ref", "lang", "page"]],
  ["welcome", welcome, "https://api.flowpro.dev/v1/site/waitlist", ["email", "src", "ref", "lang", "page"]],
  ["web check", webCheck, "https://api.flowpro.dev/v1/site/waitlist", ["email", "src", "ref", "lang", "page"]],
  // /v1/site/feedback does not exist yet, so this form always falls back to mailto:.
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

// The fix page carries the campaign context from deep links (the extension, the online check)
// and sends exactly what POST /v1/site/audit-request accepts; aeo-checker's
// apps/api/src/app.test.ts posts the same payloads.
for (const [name, html] of [["fix (EN)", fix], ["fix (PL)", fixPl]]) {
  assert.match(html, /\["src", "score", "ref"\]\.forEach/, `${name}: must read ?src=&score=&ref= into hidden fields`);
  assert.match(html, /params\.get\("url"\)\.slice\(0, 200\)/, `${name}: must prefill the address from ?url=`);
  assert.match(html, /params\.get\("note"\)\.slice\(0, 1000\)/, `${name}: must prefill the message from ?note=, capped at 1000`);
  const stackValues = [...html.matchAll(/<option value="([^"]*)">/g)].map((match) => match[1]);
  assert.deepEqual(
    stackValues,
    ["unknown", "wordpress", "static", "webflow", "squarespace", "shopify", "custom"],
    `${name}: stack values must match the API enum`,
  );
  assert.doesNotMatch(html, /name="(platform|notes)"/, `${name}: the API rejects platform and notes`);
  assert.match(html, /data\.score = Number\(score\)/, `${name}: score must be sent as a number`);
  assert.match(html, /if \(data\[key\] === ""\) delete data\[key\]/, `${name}: empty optional fields must be left out`);
}

// ─── Online check ───────────────────────────────────────────────────────────
// The page renders POST /v1/site/check output and nothing else: no check logic, no innerHTML.
assert.ok(
  webCheck.includes('var CHECK_ENDPOINT = "https://api.flowpro.dev/v1/site/check"'),
  "web check: wrong API endpoint",
);
assert.doesNotMatch(
  webCheck,
  /innerHTML|outerHTML|insertAdjacentHTML|document\.write/,
  "web check: report data must be rendered with textContent",
);
{
  const types = jsonLd(webCheck).map((block) => block["@type"]);
  for (const type of ["WebApplication", "BreadcrumbList", "Organization"]) {
    assert.ok(types.includes(type), `web check: missing ${type} schema`);
  }
}
const webCheckText = webCheck.replace(/\s+/g, " ");
for (const copy of [
  "Run check",
  "this takes up to 15 seconds",
  "Checked the HTML your server sends, before JavaScript runs — the way most AI crawlers read it. The Chrome extension checks the page as rendered in your browser.",
  '"Fixing the " + data.failCount + " failing check"',
  '" would bring it to about " + data.potentialScore',
  '"Fix first"',
  '"Improve"',
  '"Passed"',
  "Copy snippet",
  "Get all of this fixed — free audit and quote",
  "Get notified when weekly monitoring launches",
  "Check pages from your browser — install the extension",
  "Nothing to fix.",
  "Try again",
  "That address points to a private network, so it can't be checked.",
  "We couldn't reach that site. Check the address and try again.",
  "The site took longer than 15 seconds to answer.",
  '"The site refused our checker (HTTP " + status + "). Some firewalls block automated requests — the Chrome extension checks from your own browser."',
  '"The page returned HTTP " + status + "."',
  '"That address returns " + data.contentType + ", not a web page."',
  "Too many checks from your network. Try again in a few minutes.",
  "The checker is busy. Try again in a minute.",
  "Something went wrong on our side. Try again in a minute.",
]) {
  assert.ok(webCheckText.includes(copy), `web check: missing copy: ${copy}`);
}
assert.ok(
  webCheck.includes(`href="${STORE_URL}" data-umami-event="install-extension">Check pages from your browser`),
  "web check: the extension CTA must link to the store and be tagged",
);
assert.match(webCheck, /id="cta-fix"[^>]*data-umami-event="request-fix"/, "web check: summary CTA must be tagged");
assert.match(webCheck, /setAttribute\("data-umami-event", "request-fix"\)/, "web check: per-check CTAs must be tagged");
assert.match(
  webCheck,
  /setAttribute\("data-umami-event-check", check\.id\)/,
  "web check: per-check CTAs must carry the check id",
);
assert.match(webCheck, /params\.set\("src", "web-check"\)/, "web check: CTAs must say where the request came from");
assert.match(webCheck, /fixLink\("web-check-summary", context\)/, "web check: the summary CTA uses ref=web-check-summary");
assert.match(webCheck, /name="src" value="web-check"/, "web check: monitoring signups carry src=web-check");
assert.match(webCheck, /name="ref" value="monitoring"/, "web check: monitoring signups carry ref=monitoring");
for (const [name, html] of [["checker (EN)", checker], ["home", home]]) {
  assert.match(
    html,
    /href="\/ai-visibility\/check\/"[^>]*data-umami-event="view-web-check"[^>]*>\s*Check any URL online/,
    `${name}: must link to the online check`,
  );
}

// Every check in @aeo/core has its own call to action on the online check. The ids come
// from the sibling aeo-checker repo when it is checked out next to this one; CI checks out
// only this repo, so the fallback is a copy of aeo-checker/packages/core/src/checks/index.ts.
const CORE_CHECK_IDS = [
  "robots-ai-bots",
  "sitemap",
  "llms-txt",
  "canonical",
  "jsonld-valid",
  "org-schema",
  "faq-schema",
  "offer-schema",
  "title",
  "meta-description",
  "open-graph",
  "html-basics",
  "single-h1",
  "heading-hierarchy",
  "qa-block",
  "opening-paragraph",
  "text-length",
];
async function coreCheckIds() {
  const checksDir = new URL("../../aeo-checker/packages/core/src/checks/", import.meta.url);
  let registry;
  try {
    registry = await readFile(new URL("index.ts", checksDir), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return { ids: CORE_CHECK_IDS, source: "the copied list" };
    throw error;
  }
  const files = [...registry.matchAll(/from "\.\/([\w-]+)"/g)].map((match) => match[1]);
  const ids = await Promise.all(
    files.map(async (file) => {
      const source = await readFile(new URL(`${file}.ts`, checksDir), "utf8");
      const id = source.match(/id: "([\w-]+)"/)?.[1];
      assert.ok(id, `could not read the check id from ${file}.ts`);
      return id;
    }),
  );
  assert.deepEqual(ids, CORE_CHECK_IDS, "CORE_CHECK_IDS is out of date with aeo-checker; copy the ids again");
  return { ids, source: "aeo-checker" };
}
{
  const { ids, source } = await coreCheckIds();
  const labelsSource = webCheck.match(/var CTA_LABELS = (\{[\s\S]*?\});/)?.[1];
  assert.ok(labelsSource, "web check: CTA_LABELS map is missing");
  const labels = JSON.parse(labelsSource);
  for (const id of ids) {
    assert.ok(labels[id], `web check: no call to action for the ${id} check (ids from ${source})`);
  }
  for (const [id, label] of Object.entries(labels)) {
    assert.match(label, /^Have me [a-z]/, `web check: the ${id} label must be "Have me …" in sentence case`);
    assert.doesNotMatch(label, /\d|zł|PLN|€|\$/, `web check: the ${id} label must not carry a price`);
  }
  assert.ok(webCheck.includes('var FALLBACK_LABEL = "Have me fix this"'), "web check: unknown ids need a fallback label");
}

// ─── Privacy policies ───────────────────────────────────────────────────────
assert.match(
  privacy,
  /Ivan Karabeinikau Digital Engineering, a sole proprietorship registered in the Polish business register \(CEIDG\), operating as FlowPro, ul\. Bokserska 63, 02-690 Warszawa, Poland\. NIP: 9512646879\./,
  "extension privacy page must keep the complete operator details",
);
assert.match(privacy, /href="mailto:in\.korobeynikov@gmail\.com">in\.korobeynikov@gmail\.com<\/a>/);
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
