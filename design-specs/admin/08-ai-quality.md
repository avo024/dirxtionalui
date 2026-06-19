# Admin Spec 08 — AI Quality (overview · referral · corrections)

**Components:** `AIQuality.tsx` (`/admin/ai-quality`) · `AIQualityReferral.tsx`
(`/admin/ai-quality/referral/:id`) · `AIQualityCorrections.tsx` (`/admin/ai-quality/corrections`)

> Light restyle of data-dense monitoring screens. Keep all metrics/tables. Match `dh-table` +
> card/stat styling. Render in product mode.

## Overview (`AIQuality.tsx`)
`GET /admin/extraction-quality?days=&form_type=`. **Bars:** header + time-window buttons
(7/14/30/90) + form-type dropdown · **4 stat tiles** (Extractions · Acceptance rate ·
High-confidence-but-edited · Corrections) · **Watch list** (fields where model ≥0.85 but edited;
links to corrections `?high_conf_only=true`) · **Per-field accuracy table** (field_path ·
edit_count · high_conf_wrong_count [amber if >0] · acceptance_rate · avg_model_confidence ·
last_edited_at; searchable, sortable) · form-type rollup table · recent-corrections feed.

## Referral deep-dive (`AIQualityReferral.tsx`)
`GET /admin/extraction-quality/referral/{id}`. **Bars:** header (id + status + prompt_version +
updated) · two-column: source documents (left) | **extracted-data tree** (right, recursive
collapsible; leaves show value + per-field corrections "was X → now Y · conf · time" with a
"high conf" amber badge if model_confidence ≥0.85) · raw-JSON collapsible.

## Corrections feed (`AIQualityCorrections.tsx`)
`GET /admin/extraction-quality/corrections?days=&field=&high_conf_only=&cursor=`. **Bars:** header
· filter bar (time buttons · field-path search · high-conf-only checkbox) · **correction rows**
(relative time · field_path mono · `model → final` · "conf X.XX" + prompt_version · link to
referral; amber left border if ≥0.85) · "Load more" (cursor pagination).

## Confidence note (relevant to clinic ⚠ flags)
These screens expose confidence via **corrections** (`model_confidence` per edit) and the
overview's `avg_model_confidence`. The per-field source for clinic low-confidence flags is the
referral's `extracted_data.meta.confidence` (dotted-path → 0–1) — same data the admin review's
ConfidenceDot uses. Surfacing that to the clinic FixPanel is the bonus in `00-admin-shell`.

## Option axes
- Overview: stat tiles + tables (current) restyled to navy/teal; consider a corrections trend
  line. Tree view: keep recursive tree (add search/filter). Corrections: `dh-table` rows + the
  high-conf amber accent. These are data tools — prioritize scannability over decoration.
