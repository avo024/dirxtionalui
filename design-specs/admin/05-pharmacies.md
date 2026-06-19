# Admin Spec 05 — Pharmacies (list + detail)

**Components:** `PharmaciesList.tsx` (`/admin/pharmacies`) · `PharmacyDetail.tsx` (`/admin/pharmacies/:id`)

> Light restyle. Keep all fields/actions. Match `dh-table` + card styling.

## Pharmacies List
- Loads `pharmacyApi.getPharmacies()` → `GET /pharmacies`. Deactivate → `DELETE /pharmacies/{id}`.
- **Bars:** Header "Pharmacies" + "N active" + **Add Pharmacy** · search (name) · **table** (7
  cols): Name · Phone · Fax · Alt Phone/Fax · Email · Location · Actions (edit pencil +
  deactivate power, destructive). `PharmacyFormModal` + `ConfirmModal`.
- **Fix:** 7 cols is dense (let it scroll in `dh-table-wrap`); no active/inactive status in list;
  "power" icon unclear as deactivate — add a label/tooltip.

## Pharmacy Detail
- `pharmacyApi.getPharmacy(id)` → `GET /pharmacies/{id}`; update `PUT`; deactivate `DELETE`.
- **Bars:** back · header (name + **Active/Inactive badge** + "Accepts no insurance" badge + Edit
  + Deactivate) · details card (icon rows: Address, Email, Phone, Fax, Alt, Secondary Contact) ·
  **Blocked Medications** badge list · **Notes**. Modals: form + confirm.

## Option axes
- List: dense `dh-table` (recommended) with a status pill column. Detail: definition-list card
  (reuse `rd-dl`) instead of icon rows, navy/teal.
