/**
 * Clinic office-role catalog — shared by invite creation, the admin team
 * roster, and the clinic user menu.
 *
 * Exact role strings are the backend contract (design/system-v2-backend):
 *   office_manager | front_desk | provider | billing
 * Legacy `staff` (and any unrecognized/null value) displays as "Unassigned".
 */

export type ClinicRoleValue = "office_manager" | "front_desk" | "provider" | "billing";

export interface ClinicRoleDef {
  value: ClinicRoleValue;
  label: string;
  /** One-line description shown as a hint next to the option. */
  description: string;
}

export const CLINIC_ROLES: ClinicRoleDef[] = [
  {
    value: "office_manager",
    label: "Office manager",
    description: "Handles PAs and requests; gets every referral that needs action; manages clinic settings",
  },
  {
    value: "front_desk",
    label: "Front desk / MA",
    description: "Submits referrals; gets emails for their own",
  },
  {
    value: "provider",
    label: "Provider",
    description: "Signs forms; gets emails for their own referrals",
  },
  {
    value: "billing",
    label: "Billing / other",
    description: "Looks things up; no emails by default",
  },
];

export const DEFAULT_CLINIC_ROLE: ClinicRoleValue = "provider";

const ROLE_LABELS: Record<string, string> = {
  office_manager: "Office manager",
  front_desk: "Front desk / MA",
  provider: "Provider",
  billing: "Billing / other",
  staff: "Unassigned", // legacy value, pre-dates the role rollout
};

/** Human label for a role string. Unknown/null/legacy values fall back to "Unassigned". */
export function roleLabel(role: string | null | undefined): string {
  if (!role) return "Unassigned";
  return ROLE_LABELS[role] ?? "Unassigned";
}
