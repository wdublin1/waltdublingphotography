# Photograph imports

Original photographs staged for the Sanity library, one dated folder per batch, with a matching manifest in `docs/photo-import-<date>-manifest.json`. This folder is excluded from deployment and is never served.

To add a batch to the library (requires `SANITY_API_PROJECT_ID`, `SANITY_API_DATASET` and `SANITY_API_WRITE_TOKEN` in `.env.local`):

```
node scripts/import-photos.mjs --manifest docs/photo-import-2026-10-26-manifest.json --directory imports/2026-10-26
node --env-file=.env.local scripts/import-photos.mjs --manifest docs/photo-import-2026-10-26-manifest.json --directory imports/2026-10-26 --write --report docs/photo-import-2026-10-26-report.json
```

The first command validates only. The second uploads the originals and appends them to the draft without publishing or placing them anywhere; review the draft in Studio, then Publish.

## 2026-10-26

Nineteen photographs: a sisters session (three), holiday sessions at the Christmas tree farm and driftwood bench (seven), a USF graduation session (six), and three couples. A duplicate upload of the Bulls-horns graduation photo was dropped.
