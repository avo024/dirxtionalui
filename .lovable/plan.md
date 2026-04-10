

## Two Fixes: PA Card Cleanup + Success Screen Routing

### Part 1: Simplify Prior Authorization card in admin review

**File: `src/pages/admin/AdminReferralReview.tsx`** (lines 564-604)

Strip the Prior Authorization accordion item down to only the two toggles. Remove:
- PA Number field (line 585)
- Reference Number field (line 586)
- Submission Date field (line 587)
- Expiration Date field (line 588)
- Status dropdown (lines 590-601)

Update the heading from "Prior Authorization" to "Prior Authorization (referral metadata)".

The PAManagementCard below (line 607) remains unchanged.

### Part 2: Fix success screen navigation

**File: `src/pages/clinic/CreateReferral.tsx`** (line 312)

Change `navigate("/clinic")` to `navigate("/clinic/dashboard")`. There is no index route for `/clinic`, so the current path renders ClinicLayout with no child content (white screen).

The "View Referrals" button (`/clinic/referrals`) is already correct.

### No other files affected

