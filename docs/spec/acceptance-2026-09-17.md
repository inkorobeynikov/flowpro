# Acceptance — repositioning rebuild

Date: 17 September 2026 · Branch: `main` (uncommitted working tree)

## How these numbers were produced

Scores come from the extension's own scoring code, not from an approximation:
`@aeo/core` (`packages/core/src/{score,checks}.ts` in `aeo-checker`) compiled to
CommonJS and run over each page. The page snapshot is collected with the
extension's own `collectSnapshot()` against a **rendered DOM** in headless
Chrome, so the input matches what the extension sees when you click the icon.
`robots.txt`, `sitemap.xml` and `llms.txt` are fed from the repo files with the
content types nginx is configured to serve (`text/plain`, `application/xml`);
`llms-full.txt` is reported as 404, which is its real state.

The harness is a scratch script, not committed: it depends on a compiled copy of
the extension's core. Re-run it against the deployed site instead, or just open
the extension on each page after deploy.

## Per-page results

| Page | Score | Verdict | Rich Results | Notes |
|---|---|---|---|---|
| `/` | **100** | Ready to be cited | not run | — |
| `/pl/` | **100** | Ready to be cited | not run | — |
| `/ai-visibility/` | **100** | Ready to be cited | not run | — |
| `/pl/ai-visibility/` | **100** | Ready to be cited | not run | — |
| `/ai-visibility/fix/` | **100** | Ready to be cited | not run | — |
| `/pl/ai-visibility/fix/` | **100** | Ready to be cited | not run | — |
| `/automatyzacja/` | **100** | Ready to be cited | not run | meta description trimmed 163 → 138 chars; it was the only warning |
| `/about/` | **92** | Ready to be cited | not run | warn `offer-schema` (Person/Organization only), fail `qa-block` (no FAQ on an about page) |
| `/privacy/` | **92** | Ready to be cited | not run | same two; expected for a policy page (target was ≥ 80) |
| `/pl/privacy/` | **92** | Ready to be cited | not run | same |
| `/ai-visibility/privacy/` | **89** | Readable by AI | not run | extension policy: 247 words, no Q&A. Legal wording untouched; see divergence 4 |

`by.html` (flowpro.by) and the noindex `/ai-visibility/welcome|goodbye/` pages
are out of scope and were not scored.

**Rich Results Test was not run**: it needs public URLs and a browser session, and
the pages are not deployed yet. What was verified locally instead: every JSON-LD
block parses as JSON; every `FAQPage` answer matches the visible `<p>` text
character for character; `@id` references resolve (`Organization` is one node
reused across all pages, `Service.provider` and `SoftwareApplication.publisher`
point at it). Run the Rich Results Test on the live URLs after deploy.

## Automated checks

`node tests/site.test.mjs` · `node tests/aeo.test.mjs` · `node tests/ai-visibility.test.mjs`
— all pass, and all three run in CI before the deploy step. Between them they
assert: one H1, opening paragraph under 60 words before the first H2, title
30–60, description 70–160, canonical, the full OG set, `twitter:card`, hreflang
pairs with `x-default` on the English page, JSON-LD parses, FAQ text matches,
the Umami snippet is present with no other tracker and no `document.cookie`, no
leftover placeholders, the legacy anchors resolve, robots.txt allows the AI
crawlers, and the form contract below.

## Form behaviour, verified in a browser

Submitted the fix form in headless Chrome with `?src=extension&score=62&ref=popup`
while `api.flowpro.dev` was unreachable:

- hidden fields populated: `src=extension`, `score=62`, `ref=popup`, `lang=en`, `page=/…`
- the request failed, the error note appeared, and the form stayed on screen so the
  person can retry rather than losing what they typed
- the fallback link came out as
  `mailto:ivan@flowpro.dev?subject=AI Readiness Fix request — https://example.com&body=Website: …`
- the `company` honeypot is clipped to 1×1 and does not shift the layout

The same code path serves the waitlist and uninstall forms.

## Commercial model changed after the rebuild

The fixed-price package the spec describes (2 900 zł / €690, up to 5 pages,
5 business days) has been **retired at Ivan's decision** and replaced with:

- the Chrome extension: free, unchanged;
- the audit: free — the client runs the extension themselves, and if they send
  their address Ivan runs the checks on their pages and returns a fix list with
  an opinion on what is worth paying for, at no charge and with no commitment;
- the work: quoted per estimate after a scoping conversation, itemised and agreed
  in writing before anything starts.

A typical range is shown so the page is not a black box: **2 000 – 6 000 zł net**
for a small-business site. Those two figures are the only numbers to change if
the range is wrong — they appear in the visible copy and in the
`Offer.priceSpecification` (`minPrice` / `maxPrice`) of both fix pages and both
home pages, and are asserted in `tests/ai-visibility.test.mjs`.

`Offer.price` was removed everywhere; the schema now carries a
`PriceSpecification` with a min and a max, which is the honest shape for work that
is scoped per client. The "5 business days" delivery promise was dropped with the
package — the fix pages promise a reply within one business day instead, which is
a promise about my own response time rather than about work whose size is not yet
known. `tests/ai-visibility.test.mjs` fails the build if `2 900`, `€690` or
"fixed-price package" reappears on any of the four commercial pages.

## Divergences from the spec, and why

1. **The spec file is not in this repository.** `docs/spec/flowpro-repositioning-spec.md`
   does not exist. The copy was written from the v1.0 specification text supplied
   in the session, which was truncated mid-section 3.5. Sections 3.5–3.9, 4.x and
   10.x were therefore **reconstructed**, not copied verbatim: the fix-service,
   about and privacy pages, `llms.txt`, the form field set and the analytics
   snippet are my wording, consistent with the spec's voice rules but not
   character-for-character. Diff them against the real spec before launch.
2. **Crawler list follows the extension, not the spec copy.** As instructed,
   `robots-ai-bots.ts` was read: it fails on `GPTBot`, `ClaudeBot`, `PerplexityBot`
   and warns on `OAI-SearchBot`, `Claude-Web`, `Google-Extended`, `Bingbot`,
   `CCBot`, `Applebot-Extended`. The spec's FAQ answer named `ChatGPT-User`,
   `Claude-SearchBot`, `Claude-User`, `Perplexity-User` and `Googlebot` and said
   training bots are "reported separately" — the extension does not do either.
   The copy now describes what the tool actually does. **If the spec is right about
   where the product is going, change the extension, not just the copy.**
3. **Verdict thresholds confirmed unchanged**: `<40` / `<70` / `<90` / `≥90` in
   `score.ts` match the spec values quoted on the pages.
4. **`/ai-visibility/privacy/` was not left completely untouched.** Three edits:
   the dangling phrase "the flowpro.dev privacy policy" is now a link to the new
   `/privacy/` (the spec itself flagged this gap), a short `Organization` JSON-LD
   block was added, and the analytics snippet was added for consistency. No legal
   wording changed. Revert if you want it byte-identical.
5. **`/automatyzacja/` meta description trimmed** from 163 to 138 characters, the
   only change to the legacy copy beyond nav, footer, canonical and OG. At 163 it
   scored a warning on the very check the site sells.
6. **Site privacy policies rewritten in two places** (EN and PL) because adding
   Umami made the previous sentence — "There is no analytics script" — untrue. The
   policies now describe the cookieless page-view counting and its legal basis.

## Open items

| Item | State |
|---|---|
| Umami | **done**: self-hosted at analytics.flowpro.dev, website id 2bc8b095-99f7-4343-a61c-1fcff09681de, on all 13 pages. Verified in a browser: script loads, `window.umami` present, pageview and a custom event POST to `/api/send`, no JS errors, no CSP violations, preflight from the flowpro.dev origin returns 204 |
| `data-umami-event` names | `install-extension`, `view-fix-service`, `view-checker`, `request-fix`, `submit-fix-request`, `submit-waitlist`, `submit-uninstall-feedback`. Spec 7.1's names were not available — rename if they differ |
| Form JSON contract | field names `url, email, platform, notes, src, score, ref, lang, page` (audit request) and `email, src, ref, lang, page` (waitlist). Spec 10.6 was not available; confirm against the API |
| Uninstall feedback endpoint | `POST /v1/site/feedback` — **not in the contract you listed**. Invented so the placeholder could be removed; the mailto fallback makes the form work either way |
| LinkedIn | omitted everywhere, as instructed. `Organization.sameAs` contains only the Chrome Web Store URL |
| Price range 2 000 – 6 000 zł net | working figures, chosen from the options I offered. Change both numbers in the four pages and the test if they are wrong |
| Before/after screenshots | not produced (no `[НУЖЕН АССЕТ]` source material) |
| Founder photo | not supplied; the letter avatar is still in place |
| Articles (`/articles/`) | out of scope, not created, not linked |
| Rich Results Test | to run on the live URLs after deploy |

## Not a visual regression

No token, font, spacing or component rule was changed. The `:root` blocks of the
two stylesheets are byte-identical to the versions on `main`; each new page copies
the token set of the page whose components it uses. The only CSS added anywhere is
the request-form input styling on the two fix pages (adapted from the extension
page's `.waitlist-form` rules) and `h2` styling on the two new policy pages, which
had no `h2` rule to inherit.
