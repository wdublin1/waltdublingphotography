# Walt Dublin Photography

**Build handover — October 26, 2026:** The complete source archive includes `CLAUDE-HANDOVER.txt`, current published/draft content exports, and all 105 referenced image assets outside this deployable project directory. Start there when transferring development. `docs/claude-handover-state-2026-10-26.json` records the fresh access/configuration audit. The latest live release is `dpl_3p8Pv9H11x5KYEZPWcRyb5VmiWtu`; the `editorial-*` receipts describe that release. Resend sending credentials were absent from the project's environment-variable listing during handover; actual inquiry delivery remains unverified.

Owner editor: [Open Sanity Studio](https://walt-dublin-photography.vercel.app/studio).

The [earlier editor and release notes](docs/editor-update-2026-10-26.md) cover the existing text/link controls, editor access, setup context, and deployment verification. The section below explains the additional page and gallery controls in this update.

## Current editing update

Open **Walt Dublin Photography website** in Studio. The homepage tab is called **Home**, not “Homepage.” Page wording and gallery selections are edited in different places:

| Where to edit | What it controls |
| --- | --- |
| **Pages & reviews → Home** | Homepage introductions, service-card wording and photographs under **Session links**, experience and gallery section introductions, links, and FAQs. Open each service link to change **Photograph for this service link**. |
| **Pages & reviews → How I work** | The `/experience` page introduction and **Session process** entries. These process entries also appear on the homepage, so an edit here affects both pages. The questions on `/experience` come from the Home FAQs. |
| **Pages & reviews → Featured galleries** | The `/featured` page heading and introduction, gallery-link wording, return link, default inquiry link, and closing invitation. This is page wording; the photographs and individual gallery entries live in the separate top-level **Featured galleries** tab. |
| **Pages & reviews → Individuals & families**, **Seniors & graduates**, or **Athletes & teams** | Each service’s **Session details & inclusions**, **Questions & answers**, and related-gallery heading. Edit only the inclusions and answers you can genuinely offer. |
| **Pages & reviews → Sessions & pricing** | Pricing-page session descriptions, inclusions, and FAQs. The dollar amounts remain in the separate **Starting prices** tab; keep the service-page and pricing-page explanations consistent. |
| **Pages & reviews → Get in touch** | Contact wording and **Inquiry response time (optional)**. |

### Add, reorder, or hide a featured gallery

Use the top-level **Featured galleries** tab to add a **Featured gallery**. Enter its **Gallery title**, **Gallery introduction**, and **Related portrait service**. The service choice determines which service page includes it. Drag gallery entries to change their order; the homepage shows the first three enabled galleries, while `/featured` lists the enabled galleries in order.

Under **What this gallery represents**, choose **Selected photographs from different shoots** for a collection. Use **One confirmed session** only when every photograph belongs to that session. Leave **Confirmed location (optional)** blank unless you know where those photographs were made; an earlier photograph is not Charlotte work merely because Charlotte is now your service area.

Set **Gallery URL name** using lowercase words separated by hyphens, such as `selected-family-portraits`. The resulting address is `/featured/selected-family-portraits`. Keep names unique, and avoid changing a published URL after sharing it because existing links can break.

In **Gallery photographs**, choose a **Gallery cover photograph** and add **Photographs in order** from the existing library. Include the cover in that selection, drag photographs to reorder them, and avoid adding alternative uploads of the same image. The **Inquiry link** section allows a gallery-specific label, destination, and new-tab setting. Leave that entire override unconfigured to inherit the default link from **Pages & reviews → Featured galleries**.

Turn **Show this gallery on the website** on when it is ready. Turn it off and publish to hide it without deleting the gallery or photographs. New galleries start hidden.

### Optional details and truthful presentation

**Session length (optional)**, **Edited photograph count (optional)**, **Delivery timeframe (optional)**, and **Inquiry response time (optional)** are hidden on the public site when blank. Leave them blank until confirmed; do not enter placeholder numbers or promises. Session details are edited within the relevant service or pricing entry.

The supplied galleries are selected collections: 14 family photographs, two distinct graduation photographs, and six athlete/team photographs. The family and sports collections combine different shoots. The graduation selection is deliberately small because duplicate uploads were excluded. Do not rename these as complete-session galleries or imply recent/local provenance without confirming it.

This update leaves the existing 105-photograph library unchanged. Gallery selections, service-card photographs, **Portfolio order**, and **Homepage slideshow** are separate controls; changing one does not replace the others.

### Publish and check

This website uses one content document: **Publish** publishes all changes currently in its draft together. Review the complete draft before publishing, including any earlier edits you have not yet approved for the live site.

Studio saves edits as a draft. Review the affected fields and select **Publish** to make those content changes public. Then refresh the homepage, affected service page, `/experience`, or `/featured/<gallery-url-name>` and check the wording, photographs, and inquiry link. Routine content edits do not require another code deployment. An inquiry is still a request to discuss a session, not a reserved date.
