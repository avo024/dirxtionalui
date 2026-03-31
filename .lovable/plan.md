

## Update ClinicDashboard Stats

**File**: `src/pages/clinic/ClinicDashboard.tsx`

### 1. Add `paExpiringSoonCount` (after line 45)
Add a new count derived from patients with PA expiring within 30 days.

### 2. Replace stats array (lines 74–107)
Remove "Approved" card, keep "In Review", "Sent to Pharmacy", "Needs Attention", add "PA Expiring Soon". Each stat gets a `link` property for navigation.

### 3. Make stat cards clickable (lines 146–163)
Change `<div>` to `<Link to={stat.link}>` with `block` class added. Close with `</Link>`. `Link` is already imported.

### 4. Remove unused imports
Remove `CheckCircle` and `ArrowUpRight` (no longer used after removing the "Approved" card).

