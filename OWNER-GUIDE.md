# Managing Walt Dublin Photography

**Current handover note — October 26, 2026:** Some dated sections below describe the earlier editor-field release. The subsequent editorial release is already published and deployed as `dpl_3p8Pv9H11x5KYEZPWcRyb5VmiWtu`. Use `README.md` for the newer How I work and Featured galleries controls, and `docs/editorial-release-verification-2026-10-26.json` for the later desktop/mobile/editor checks. The current source has seven test files, twelve fixed public HTML routes, and three enabled featured-gallery routes. The complete source archive now also includes the Claude handover, separate published/draft snapshots, and all 105 referenced photo assets. The Vercel environment listing lacks Resend sending credentials; real inquiry delivery, a fresh editor sign-in, and browser-button publishing remain unverified. Earlier statements about draft-only changes, five test files, ten pages, or incomplete mobile testing apply to the earlier release, not the latest editorial update.

**October 26 editor update:** The expanded text and link controls are deployed, and the newly exposed fields have been prepared in a draft for review. The public pages and deployed editor bundle passed HTTP checks. The new fields also appeared correctly after refreshing the existing authenticated owner session in Studio. Your published content, photographs, selections, reviews, and prices were preserved. See `docs/editor-update-2026-10-26.md` for the release details and remaining checks.

## Opening the editor

Website: https://waltdublinphotography.com

The custom domain is connected to Vercel. Both hostnames passed Vercel's configuration checks, and public HTTPS requests reached the new site with valid certificates. Different DNS caches were observed during the initial switch from Squarespace; that historical check does not describe current worldwide propagation. The domain registration and existing Google Workspace mail records remain at Squarespace.

The `www` address permanently redirects to the main address. Final checks verified the homepage, a homepage query string, and a contact-page link, preserving both the path and query.

Alternate website address: https://walt-dublin-photography.vercel.app

Editor: https://walt-dublin-photography.vercel.app/studio

Use this existing Studio address for editing. You may be asked to sign in to Vercel before reaching Sanity's sign-in screen. On October 26, the existing authenticated owner session at this address was refreshed successfully: the new page tabs, **Menus & footer**, **Controls & messages**, and populated draft fields appeared without errors or unknown-field warnings. The **Publish** control was available but was not used. This verified access through the existing session, not a new sign-in flow or a publishing test.

Sanity's management screen confirms that this `vercel.app` editor address is allowed for signed-in editing. The public custom domain is not currently listed as an allowed editor origin, so continue using the editor link above. No origin configuration changes were needed or made for this update.

Sign in with the Sanity account that has access to this website’s project, then open **Edit Walt Dublin Photography**. This is your content editor, not a separate booking system. Your ordinary changes to wording, photographs, starting prices, and reviews do not require editing code.

## What has been tested

The inquiry handler has passed 13 automated tests covering validation, unsafe input, cross-origin requests, missing configuration, provider failures, and duplicate-send protection. These tests use simulated email responses and do not send real messages.

The deployed public pages, asset URLs, contact-session preselection, and Studio routes passed HTTP checks. At the initial deployment, the published Sanity document was read successfully and matched the approved content: 20 photographs and 17 reviews. Later photo imports are recorded separately below. Desktop browsing was checked; the available browser did not apply its requested mobile viewport override, so this does not claim a completed mobile browser check.

For the October 26 editor update, all five automated test files passed. All ten live pages returned successful HTML responses, exposed the expected 105-photo library, and matched the published snapshot's wording, links, and interface text. The deployed Studio bundle contains the new editing fields and labels. Stylesheets, browser JavaScript, the logo, and two published image samples also passed HTTP checks. A separate browser check refreshed the existing authenticated owner session and verified the new editor fields. No test change was published.

The website DNS switch is complete. The new A/CNAME records and preserved mail records were checked against the earlier DNS snapshot; the before-and-after evidence is in `docs/`. Two public resolvers showed different propagation states at the time of verification, so worldwide cache expiry has not been asserted.

Live Resend connection, sending-domain verification, a fresh editor sign-in flow, and a controlled publishing test have not been verified in this update. A successful build or a visible editor sign-in screen does not establish those results. Confirm a real inquiry reaches your inbox before describing the form as ready for customers.

## Editing all website text and links

This expanded editor is part of the deployed October 26, 2026 update. The release and draft-field preparation status are recorded in `docs/editor-update-2026-10-26.md`.

Open **Pages & reviews → Website wording** and choose a page tab: Home, My photographs, Individuals & families, Seniors & graduates, Athletes & teams, Sessions & pricing, About me, Client experiences, Get in touch, or Client galleries.

Within a page, open **Introduction**, **Page sections & details**, **Links & buttons**, or **Closing invitation**. These contain the page headline, small labels above headings, body paragraphs, price explanations, button wording, and destinations. Pricing session descriptions and frequently asked questions have their own editable entries. **Shared captions & invitations** contains shared captions and fallback invitation wording; **Footer** contains the footer paragraph. **Search titles & descriptions** controls each page’s browser/search title and description.

Write in first person as you would speak to a visitor. Each paragraph entry becomes a separate paragraph. The first three entries on service pages fill the existing design positions; additional sections appear beneath those positions. Reordering entries changes which text fills those positions, not the underlying page layout.

### Links and buttons

For a link, edit **Link wording**, **Link destination**, and **Open this link in a new tab**. Use `/contact` or `/portfolio` for pages on your site, a complete `https://...` address for another website, `mailto:...` for email, or `tel:...` for a phone number. A destination such as `/contact?session=Family%20portraits` opens the inquiry form with the corresponding session selected. A page anchor such as `/about#my-story` requires an actual matching section ID; entering a link does not create that destination.

Opening buttons and closing inquiry buttons can use their own wording. Where the field help says so, leaving the wording blank uses **Contact & links → Main inquiry button wording**. The header’s main inquiry label and destination are in **Contact & links**. Ordinary menu and text links use their own labels.

Body paragraphs also support an optional inline link: `Read [more about my sessions](/investment).` Only the words inside the brackets become the link. Use normal text for everything else; HTML is not rendered. Headings and text inside an already-clickable session card remain plain text.

### Menus, footer, and form wording

**Menus & footer** controls the desktop and mobile menu labels, menu destinations and order, service-page navigation, footer link columns, footer email link, copyright line, and footer location. Add or reorder a menu link without editing code. Adding a menu link does not create a new page.

**Pages & reviews → Get in touch → Inquiry form wording** controls the visible name/email/session labels, session-option wording, timing example, reassurance text, and the message shown when JavaScript is unavailable. The session options’ displayed words can change while their internal values remain compatible with the form.

**Controls & messages** contains photo-viewer labels, slideshow controls, portfolio count/empty messages, social-icon descriptions, the send button, inquiry status/validation messages, and application error messages. Critical control labels and feedback retain a safe default when cleared. Error copy configured here applies to the application; Vercel infrastructure errors and third-party sign-in screens are controlled by those services.

### Prices and reusable values

Keep tokens such as `{familyPrice}`, `{individualPrice}`, `{seniorPrice}`, and `{athletePrice}` wherever you want a sentence to use the amount from **Starting prices**. The price wording beside each session uses `{price}`. `{email}` uses **Contact & links → Public contact email**. You can change all of the surrounding words. For example: `Family sessions begin at {familyPrice}.`

### Publish your changes

The October 26 update created a draft containing the newly exposed fields. It added 91 missing fields without replacing existing content or publishing anything. You can review and edit that draft in Studio; you do not need to run a setup or migration command yourself.

Edits remain drafts until you choose **Publish**. Publishing applies the ready changes in this website document together, so review the other tabs before publishing. Refresh the public page afterward. Most pages may retain their previous version for about 30 seconds; an already-open page does not update itself. Publishing content does not require a new deployment.

## Replacing and adding photographs

Use **Photograph library** to replace an image, give it a useful name, edit its description, and adjust its crop and hotspot. The hotspot marks the part of the photograph that should remain prominent when the layout crops it. Check the result on both a phone and a larger screen.

Describe what is actually visible in **Image description (alt text)**. This supports screen readers and also appears beneath photographs opened in the larger image viewer. It does not place text over the homepage slideshow.

Replacing an existing library entry updates every location that uses that entry. A newly uploaded image is not automatically placed on a page. Choose it in **Homepage slideshow**, **Portfolio order**, or the photograph selector beside a session in **Sessions & pricing**. Other service-page and personal-portrait positions use the established library entries; replace those entries to update their photographs. Ask the maintainer to add or move a fixed photo position.

### October 24, 2026 photo import

All 86 supplied photographs are available in the Sanity photograph library: 78 WebP files and 8 JPEG files. This added 84 new assets and reused two identical assets already in the library. Newly added photograph names include the original filename, with descriptions and collection assignments that can be edited normally.

Open **Photograph library** to review them, then use **Homepage slideshow**, **Portfolio order**, or a session photograph selector to choose their placement. The importer originally added these to the existing draft without publishing or changing selections. Before the October 26 editor-field preparation, a fresh read found the published document with 105 photograph entries, three slideshow frames, and 15 portfolio selections, with no draft present. The editor update then created a draft while preserving that library and those selections.

One empty photograph entry already existed before the import and was preserved at that time. It was no longer present in the October 26 published document. The dated reports in `docs/` record all filenames, hosted image URLs, selector keys, and preservation checks.

## The homepage slideshow

The current slideshow contains three frames. Each frame displays three synchronized photographs: one large landscape image and two supporting portraits. In **Homepage slideshow**, choose those images and drag frames to change their sequence. The editor allows up to 12 frames, although the current three-frame arrangement keeps the opening concise.

The photographs change together every five seconds, without headlines or captions over them. The timing and responsive layout are maintained in code. Visitors can pause or move between frames. Automatic rotation pauses during hover, keyboard interaction, or an inactive browser tab, and starts paused when the visitor prefers reduced motion. With only one frame, there is nothing to rotate.

## Portfolio order

Use **Portfolio order** to select and rearrange photographs. An image’s **Collection** controls its filter. The public filters are Individuals & families, Seniors & graduates, and Athletes & teams. Images assigned to Couples, Events, or About Walt appear under All photographs if included in the portfolio, but do not create additional filter buttons.

## Starting prices

Open **Starting prices** and enter positive whole-dollar amounts. The current starting amounts are $250 for individual portraits, $295 for families, $350 for seniors and graduates, and $395 for individual athletes. These shared values update the repeated starting prices throughout the site.

Team photography remains individually quoted. The website presents a starting point rather than a final package price; the visitor submits an inquiry for a quote based on the session. Update the session descriptions separately if you change what your offerings include.

## Client reviews

Open **Pages & reviews → Client reviews** to edit the client name, exact quotation, source, and optional star rating. Leave the rating blank if the client did not provide one. Written praise does not automatically mean five stars. Review dates are not displayed.

Dragging reviews changes their order and which quotations appear elsewhere. The first review is featured on the homepage and review page, the second appears on About me and Get in touch, and the seventh appears on Individuals & families. Check those pages after reordering or removing reviews.

## Contact details and social links

In **Contact & links**, **Main inquiry button wording** currently reads “Inquire to book.” It controls the header and primary inquiry links that use the default wording. The main destination is editable, and each page’s link can have its own destination. The default links lead to the contact page; they do not reserve a date, take payment, or confirm a booking.

**Public contact email** currently shows `walt@waltdublinphotography.com`. Changing it updates the visible address and email icons, but does not change where form submissions are delivered. Ask the maintainer to update the server’s delivery address separately when needed.

Enter full Facebook and Instagram profile URLs in **Social profile links**. Leave a field blank to hide that icon. No social-account password is needed.

## Public content and private galleries

Only upload photographs and information intended for public display. The Client galleries page helps visitors find their existing private gallery link; it is not a password-protected gallery service. Do not put gallery passwords, private client records, or inquiry messages in the website’s content document.

## Notes for the maintainer

The project uses Node.js 24. From the production project directory, install dependencies with `npm ci`, run `npm run check`, and build with `npm run build`. The build produces the Sanity editor under `public/studio`. Layout, schema, and application-code changes require a new deployment; ordinary published content and navigation changes do not.

Sanity server configuration uses `SANITY_API_PROJECT_ID`, `SANITY_API_DATASET`, and `SANITY_API_READ_TOKEN`. Initial content setup, approved batch photo imports, and additive draft-field preparation additionally use `SANITY_API_WRITE_TOKEN`. The editor uses only the public identifiers `SANITY_STUDIO_PROJECT_ID` and `SANITY_STUDIO_DATASET`; never place access tokens in browser-exposed variables. `npm run seed` is a dry run. The seed script's `--write` option is for explicitly approved initial setup, not routine editing, and leaves an existing website document or draft unchanged.

For an approved batch import, use `scripts/import-photos.mjs` with a metadata manifest, an original-image directory, and an output report path. It validates locally unless `--write` is supplied, uploads original WebP/JPEG bytes, reuses matching hashes, and appends selectable photographs to the draft using a revision guard. It never publishes or changes placement. The `--append-only` flag can resume an import whose report already contains every uploaded asset. A `needs-review` result must be investigated before claiming completion. Keep the original image files and the report; never use the initial seed script to add a later batch.

Email configuration uses `RESEND_API_KEY`, `RESEND_FROM`, and `INQUIRY_TO_EMAIL`. Form security uses `INQUIRY_FORM_SECRET`. Store secret values only in approved environment-variable settings, never in this guide, source control, browser code, screenshots, or chat. Use a dedicated sending key for the photography site rather than altering another application’s key. Environment-variable changes require a new deployment.

Before changing editor origins or deployment settings, confirm the correct Vercel project and Sanity dataset and check CORS access for the intended editor origin. Sanity lists `https://walt-dublin-photography.vercel.app` under Managed origins with Credentials Allowed, managed by the deployed Studio. Authenticated access at that address was verified; publishing remains untested. The custom domain is absent from the allowed-origin list and is not the recommended editor address. Preserve the existing mailbox’s DNS records when managing domain routing. Verify the sending domain and a controlled inquiry end to end, including receipt and reply routing, without changing the existing Resend subscription.

If Sanity cannot be reached, the website may display previously loaded or bundled approved content. A page loading successfully is therefore not proof that publishing is working. Check a specific published change on the public site. If an inquiry cannot be confirmed, the form preserves the visitor’s details and offers direct email rather than showing a false success.
