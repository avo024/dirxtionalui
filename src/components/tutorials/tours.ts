/**
 * Tour definitions for the onboarding tutorials.
 *
 * Each tour is a named sequence of steps. A step either highlights a DOM element
 * (via a `[data-tour="..."]` selector) or shows a centered popover with no anchor
 * (used for intros and for steps whose UI only exists deeper in a flow).
 *
 * Tours are replayable from the Help button at any time. Because a replayed tour
 * may be launched from a different page than where its targets live, each tour
 * declares the `route` it should run on — `useTour` navigates there first and
 * waits for the first anchored element before starting (see useTour.ts).
 *
 * The matching `data-tour` attributes live on the clinic pages / sidebar:
 *   - clinic-nav, nav-dashboard, nav-patients, nav-new-referral, nav-referrals  (ClinicSidebar)
 *   - dashboard-stats                                                            (ClinicDashboard)
 *   - help-button                                                                (HelpButton)
 *   - wizard-steps, wizard-body, wizard-next                                     (CreateReferral)
 *   - referrals-filters, referrals-table                                         (ReferralsList)
 *   - add-patient                                                                (PatientsList)
 */

export type TourStep = {
  /** CSS selector for the element to highlight. Omit for a centered popover. */
  element?: string;
  title: string;
  description: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
};

export type TourDef = {
  key: string;
  /** Short label shown in the Tutorials menu. */
  label: string;
  /** One-line description shown under the label in the Tutorials menu. */
  description: string;
  /** Route the tour runs on; useTour navigates here first if needed. */
  route?: string;
  steps: TourStep[];
};

export const TOURS: Record<string, TourDef> = {
  overview: {
    key: "overview",
    label: "Platform overview",
    description: "A quick tour of the dashboard and navigation",
    route: "/clinic/dashboard",
    steps: [
      {
        title: "Welcome to Dirxctional 👋",
        description:
          "Here's a 60-second tour of the essentials. You can replay this — and every other walkthrough — anytime from the Help button.",
      },
      {
        element: '[data-tour="dashboard-stats"]',
        title: "Your dashboard at a glance",
        description:
          "These cards summarize what needs attention, PAs expiring soon, referrals in review, and what's been sent to the pharmacy.",
        side: "bottom",
        align: "start",
      },
      {
        element: '[data-tour="clinic-nav"]',
        title: "Getting around",
        description:
          "Your main navigation lives here — Dashboard, Patients, New Referral, and My Referrals.",
        side: "right",
        align: "start",
      },
      {
        element: '[data-tour="nav-new-referral"]',
        title: "Start a referral",
        description:
          "Click here to create a new specialty pharmacy referral with our guided, step-by-step wizard.",
        side: "right",
        align: "center",
      },
      {
        element: '[data-tour="nav-referrals"]',
        title: "Track everything",
        description:
          "My Referrals lists every referral you've submitted, with its live status and PA status.",
        side: "right",
        align: "center",
      },
      {
        element: '[data-tour="help-button"]',
        title: "Need a refresher?",
        description:
          "Open Help anytime to replay any tutorial or read the full Clinic User Guide.",
        side: "left",
        align: "end",
      },
    ],
  },

  createReferral: {
    key: "createReferral",
    label: "Create a referral",
    description: "Walk through the referral wizard",
    route: "/clinic/referrals/new",
    steps: [
      {
        element: '[data-tour="wizard-steps"]',
        title: "Four simple steps",
        description:
          "The wizard guides you through Select Patient → Referral info → Choose Pharmacy → Review & Submit.",
        side: "bottom",
        align: "start",
      },
      {
        element: '[data-tour="wizard-body"]',
        title: "Start with the patient",
        description:
          "Pick an existing patient or add a new one. Each step fills in as you go — nothing is submitted until the final review.",
        side: "top",
        align: "center",
      },
      {
        element: '[data-tour="wizard-next"]',
        title: "Move forward (or back)",
        description:
          "Use Continue to advance once a step is complete. You can always step back to make changes before submitting.",
        side: "left",
        align: "center",
      },
    ],
  },

  checkStatus: {
    key: "checkStatus",
    label: "Check a referral's status",
    description: "Find and track any referral",
    route: "/clinic/referrals",
    steps: [
      {
        element: '[data-tour="referrals-filters"]',
        title: "Filter your referrals",
        description:
          "Narrow the list by status — in review, sent to pharmacy, needs attention — or search by patient, drug, or ID.",
        side: "bottom",
        align: "start",
      },
      {
        element: '[data-tour="referrals-table"]',
        title: "See live status",
        description:
          "Each row shows the referral's current status and PA status. Click any row to open the full detail.",
        side: "top",
        align: "center",
      },
    ],
  },

  needsAttention: {
    key: "needsAttention",
    label: "When a referral needs attention",
    description: "Handle a flagged referral and resubmit",
    route: "/clinic/referrals",
    steps: [
      {
        element: '[data-tour="referrals-needs-attention"]',
        title: "Where flagged referrals show up",
        description:
          "When a referral needs your attention, it lands here with a Needs Attention badge. Nothing is lost — it's just waiting on a quick fix.",
        side: "bottom",
        align: "start",
      },
      {
        element: '[data-tour="referrals-table"]',
        title: "Open it to see what's needed",
        description:
          "Open that referral to see exactly what's needed — usually a corrected document or a missing detail.",
        side: "top",
        align: "center",
      },
      {
        title: "Fix it and resubmit",
        description:
          "On the referral you'll see the reason spelled out and an Upload documents / Resubmit button. Fix the flagged item and resubmit — our team re-runs the prior authorization the same day.",
      },
    ],
  },

  statuses: {
    key: "statuses",
    label: "What your statuses mean",
    description: "A quick read on referral + PA status",
    route: "/clinic/referrals",
    steps: [
      {
        element: '[data-tour="referrals-table"]',
        title: "Your referral status",
        description:
          "Every referral has a colored status — Uploaded, Processing, In Review, Approved, Sent, Needs Attention. Most need nothing from you; we email you when something changes.",
        side: "top",
        align: "center",
      },
      {
        element: '[data-tour="referrals-pa-col"]',
        title: "PA status — we handle it",
        description:
          "PA Status is the prior authorization. You don't submit PAs — the Dirxctional team handles them. Just watch this column.",
        side: "bottom",
        align: "center",
      },
      {
        title: "Want the full list?",
        description:
          "Want the full meaning of each status? It's all in the Clinic User Guide via the Help button.",
      },
    ],
  },

  addPatient: {
    key: "addPatient",
    label: "Add a patient",
    description: "Create a new patient record",
    route: "/clinic/patients",
    steps: [
      {
        element: '[data-tour="add-patient"]',
        title: "Add a patient",
        description:
          "Click here to add a new patient. You'll enter their demographics and insurance — then you can start a referral for them.",
        side: "left",
        align: "center",
      },
    ],
  },

  addNote: {
    key: "addNote",
    label: "Add a note to a referral",
    description: "Message our team about a referral",
    route: "/clinic/referrals",
    steps: [
      {
        element: '[data-tour="referrals-table"]',
        title: "Open a referral",
        description:
          "Notes live inside each referral. Click any referral in this list to open its detail page.",
        side: "top",
        align: "center",
      },
      {
        title: "Use the Notes tab",
        description:
          "On the referral detail page, switch to the Notes tab, type your message, and send. Our team sees it and can reply right there.",
      },
    ],
  },
};

/** Tours shown in the Tutorials menu, in display order. */
export const TUTORIAL_ORDER: string[] = [
  "overview",
  "createReferral",
  "checkStatus",
  "needsAttention",
  "statuses",
  "addPatient",
  "addNote",
];

export const OVERVIEW_SEEN_KEY = "dx_tour_overview_seen";
