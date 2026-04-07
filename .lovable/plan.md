

## Simplify Clinic Step 3 — Submit Confirmation

### Overview
Replace the detailed review screen (Clinical, Provider, Insurance sections) with a simple confirmation view. The clinic just uploaded documents — the admin team handles extraction and review.

### File: `src/pages/clinic/CreateReferral.tsx`

#### 1. Replace Step 3 content (lines 882–1013)

**Remove:**
- AI extraction animation block (lines 891–910)
- The conditional `(referralMethod === "manual" || extracted)` wrapper
- Clinical Information ReviewCard (lines 933–951)
- Provider Information ReviewCard (lines 953–965)
- Insurance Information ReviewCard (lines 967–980)

**Keep:**
- Patient Information ReviewCard (lines 916–931) — but simplify to just Name and DOB
- Documents ReviewCard (lines 984–996)
- Confirm checkbox (lines 998–1009)

**Add:**
- New heading: "Submit Referral" / "Confirm and submit your referral for processing"
- Two info notes with `Info` icon: AI extraction note + PA handling note
- For manual referrals, still show patient info and documents only (no clinical/provider/insurance review)

**New Step 3 structure:**
```
Step 3 of 3 — "Submit Referral"
"Confirm and submit your referral for processing"

[Patient card: Name + DOB only]
[Documents card: filenames with green checkmarks]
[Info note: "Our AI will automatically extract..."]
[Info note: "Our team will handle the prior authorization process."]
[Confirm checkbox]
```

#### 2. Update submit button condition (line 1056)
Change from `(referralMethod === "manual" || extracted)` to just `currentStep === 2` — no longer gated on extraction completion since we skip extraction entirely.

#### 3. Update success message (lines 297–299)
Change description to: "Referral submitted successfully! Our team will review your documents and process the referral. You'll receive a notification when it's been approved."

Add a "Back to Dashboard" button alongside the existing buttons.

#### 4. Remove extraction-related gating
Since Step 3 no longer needs extraction, remove the extraction trigger and `extracted` gate. The submit button should be enabled as soon as the confirm checkbox is checked.

### No other files affected

