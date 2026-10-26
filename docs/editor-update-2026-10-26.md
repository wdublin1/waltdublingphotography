# Complete text and link editing — October 26, 2026

**Historical release note:** This file describes the earlier editor-field deployment and draft-only preparation. A later editorial release is already live as `dpl_3p8Pv9H11x5KYEZPWcRyb5VmiWtu` and updated both the published and draft documents through a revision-guarded script. For current controls and verification, use `README.md`, the `editorial-*2026-10-26.json` receipts, and `claude-handover-state-2026-10-26.json`. This historical file's ten-page, five-test-file, and draft-only descriptions must not be treated as the latest status.

## Release status

Deployed to the existing `walt-dublin-photography` project in team `wdublin1` after authorization was restored. Vercel confirmed production deployment `dpl_BQU5MFY4Cw8RUmgjbTm1kjEkELZx` as **READY**, with no alias error. The deployment includes the custom-domain and existing Vercel aliases. Its deployment address is https://walt-dublin-photography-280qdekd4-wdublin1.vercel.app.

The owner editor address is https://walt-dublin-photography.vercel.app/studio. It may require Vercel authentication before the Sanity sign-in screen. Draft-only field preparation and production HTTP/schema checks are complete. The existing authenticated owner session at this Studio address was refreshed successfully and showed the new tabs and populated draft fields. A fresh sign-in flow, publishing, and actual email delivery were not tested.

Sanity's management UI lists `https://walt-dublin-photography.vercel.app` under Managed origins with Credentials Allowed, managed by the deployed Studio. The custom domain is absent from that list, so the existing Vercel Studio address remains the recommended editor. No CORS or origin settings were changed. A conflicting public diagnostic is not evidence that the legacy editor is blocked: its authenticated browser access and management configuration were both verified.

The existing published document is `walt-photography-site` in Sanity project `fy5ez6rn`, dataset `production`. The pre-update read found revision `OBxnlv2wQ7axRU57ulxdOY`, 105 photograph entries, three slideshow frames, 15 portfolio selections, and no draft. Field preparation created a draft and left that published revision unchanged. Independent verification confirmed an exact match with the pre-update published backup.

## Editing coverage

All ten public pages now use content fields for their headings, introductions, body paragraphs, small section labels, captions, price explanations, calls to action, and relevant link destinations. Existing page tabs remain; fields are organized under Introduction, Page sections & details, Links & buttons, and Closing invitation.

Menus & footer controls desktop/mobile labels and links, service navigation, footer link columns, copyright, and location wording. Contact & links holds the default inquiry wording/destination, public email, social profiles, and business metadata. Controls & messages holds slideshow and photo-viewer labels, portfolio messages, inquiry button/status/validation wording, accessibility labels, and application error text.

Body copy accepts optional `[link wording](/contact)` links. Raw HTML is escaped. Destinations use the same validation in Studio and the renderer. External links that open a new tab include `noopener noreferrer`. Named tokens keep prices, email addresses, and photo counts connected to their source values.

Existing custom closing-button labels are now honored. A page's cleared closing heading or body uses the shared invitation wording; a cleared primary inquiry label uses the main inquiry wording. Cleared standalone link destinations stay cleared. Required feedback and accessible control labels retain safe defaults. Clearing the optional photograph counter hides it.

Editing text does not change page layout or create new routes. The first three service sections fill the established layout positions; additional section entries render beneath them. Inquiry field names, validation limits, allowed session values, security tokens, and delivery-recipient configuration remain application settings.

## Verification evidence

- `npm run build` succeeded with the expanded Sanity schema.
- `npm run check` passed all five test files. Coverage includes content normalization, safe inline links, edited output across all ten pages, metadata, API error text, inquiry security, and guarded draft-field preparation.
- Fresh published-only Sanity content loaded successfully, and all ten pages rendered with the actual 105-photo library and existing selections.
- All ten live public routes returned HTML with status 200. Each exposed the expected 105-photo library and matched the published snapshot's copy, links, and interface text.
- The deployed Studio bundle, `sanity-DlgQnJxs.js`, contains the expanded editing fields and labels. Stylesheets, browser JavaScript, the logo, and two published image samples also passed HTTP checks.
- The live HTTP and deployed-schema results are recorded in `docs/editor-release-verification-2026-10-26.json`.
- The existing authenticated owner browser session at `/studio/structure/walt-photography-site` was refreshed. All page tabs, Menus & footer, Controls & messages, and populated new draft fields appeared without errors or unknown-field warnings. The Publish control was available but was not activated.
- The management UI independently confirmed credentialed access for the legacy editor origin. Origin evidence and the resolution of the conflicting public diagnostic are recorded in `docs/editor-origin-verification-2026-10-26.json`.
- Local DOM checks covered all ten pages and 347 anchors: no nested links or buttons, safe link behavior, edited form labels with stable submitted values, and empty-portfolio messaging.
- The homepage's five-second slideshow still initializes when its accessible wording is changed.
- The schema and rendering URL validators now share one implementation, including rejection of unsafe schemes, embedded credentials, encoded backslashes, and control characters.
- The approved field preparation added 91 missing fields to a draft, with zero skipped entries and one attempt. Independent verification confirmed preservation of existing text, photographs and crops, slideshow selections, portfolio order, reviews, and prices.
- No real inquiry emails were sent, and no publish operation was performed. Access through the existing authenticated Studio session was verified; a fresh sign-in flow and publishing remain untested.

## Completed draft-field preparation

`docs/editor-field-plan-2026-10-26.json` records the read-only plan containing 91 additive operations and no skipped entries. `docs/editor-field-apply-2026-10-26.json` records the successful application and independent preservation checks.

The approved command was run after the production deployment became ready:

```bash
node --env-file-if-exists=.env.local scripts/prepare-editor-fields.mjs --apply
```

It created draft revision `OBxnlv2wQ7axRU57um67QQ` in one attempt and initialized all 91 missing fields. The published revision remained `OBxnlv2wQ7axRU57ulxdOY`. No existing content was replaced, and nothing was published. The owner can review and edit the prepared draft directly in Studio without rerunning the preparation.

For a future read-only check, omit `--apply`:

```bash
node --env-file-if-exists=.env.local scripts/prepare-editor-fields.mjs
```

The script never publishes. It re-reads the current document, preserves an existing draft, uses revision-guarded additions, and recomputes only after a known revision conflict. Review a fresh plan after an ambiguous network failure. Do not use the initial seed script for this update.

## Remaining handover checks

1. Review the prepared draft in the verified existing Studio address before publishing any owner-approved changes. A fresh sign-in flow and a controlled publishing test remain untested. Do not substitute the custom-domain Studio address: it is not currently listed as an allowed editor origin.
2. Verify a controlled inquiry end to end, including receipt and reply routing. No actual delivery test was performed for this update.

The owner-facing editing instructions are in `OWNER-GUIDE.md`.
