import type { ReactNode } from "react";

export type EmptyArtName =
  | "referrals"
  | "referrals-filtered"
  | "patients"
  | "documents"
  | "history"
  | "notes"
  | "support"
  | "faxes"
  | "pharmacies"
  | "clinics"
  | "insights"
  | "caught-up";

const T = "var(--color-teal-500)";
const G = "var(--color-stone-300)";

const ART: Record<EmptyArtName, ReactNode> = {
  referrals: <><path d="M34 12h20l10 10v32a3 3 0 0 1-3 3H34a3 3 0 0 1-3-3V15a3 3 0 0 1 3-3z" strokeDasharray="3 4" /><path d="M54 12v10h10" /><circle cx="64" cy="52" r="9" fill="#fff" stroke={T} /><path d="M64 48v8M60 52h8" stroke={T} /></>,
  patients: <><circle cx="38" cy="24" r="8" /><path d="M24 56v-3a11 11 0 0 1 11-11h6a11 11 0 0 1 11 11v3" /><circle cx="62" cy="27" r="6.5" stroke={T} strokeDasharray="3 3.5" /><path d="M56 43h5a9 9 0 0 1 9 9v4" stroke={T} strokeDasharray="3 3.5" /></>,
  documents: <><path d="M48 8v18M42 20l6 6 6-6" stroke={T} /><path d="M22 42l7-10h7M60 32h7l7 10v12a3 3 0 0 1-3 3H25a3 3 0 0 1-3-3z" /><path d="M22 42h14a12 6 0 0 0 24 0h14" /></>,
  notes: <><path d="M24 12h48a4 4 0 0 1 4 4v24a4 4 0 0 1-4 4H44l-10 9v-9H24a4 4 0 0 1-4-4V16a4 4 0 0 1 4-4z" /><path d="M30 23h36M30 32h22" stroke={T} strokeDasharray="2 4" /></>,
  support: <><path d="M22 12h44a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H42l-10 9v-9H22a4 4 0 0 1-4-4V16a4 4 0 0 1 4-4z" /><path d="M28 22h32M28 30h18" /><circle cx="68" cy="48" r="9" fill="#fff" stroke={T} /><path d="M64 48l3 3 5-6" stroke={T} /></>,
  "referrals-filtered": <><path d="M30 10h22l10 10v34a3 3 0 0 1-3 3H30a3 3 0 0 1-3-3V13a3 3 0 0 1 3-3z" /><path d="M52 10v10h10" /><path d="M34 30h14M34 38h8" /><circle cx="60" cy="44" r="9" fill="#fff" stroke={T} /><path d="M67 51l7 7" stroke={T} /></>,
  history: <><circle cx="48" cy="34" r="21" /><path d="M48 21v13l9 5" stroke={T} /><path d="M27 34h-5M74 34h-5M48 13v-4M48 59v-4" strokeDasharray="1 5" /></>,
  faxes: <><path d="M35 30V14a2 2 0 0 1 2-2h18l7 7v11" /><path d="M55 12v7h7" /><path d="M26 30h44a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H26a4 4 0 0 1-4-4V34a4 4 0 0 1 4-4z" /><path d="M30 46h16" stroke={T} /><circle cx="62" cy="46" r="2.5" stroke={T} /></>,
  pharmacies: <><path d="M20 32L48 14l28 18" /><path d="M25 28v28a2 2 0 0 0 2 2h42a2 2 0 0 0 2-2V28" /><path d="M48 36v14M41 43h14" stroke={T} /></>,
  clinics: <><path d="M30 58V16a3 3 0 0 1 3-3h30a3 3 0 0 1 3 3v42" /><path d="M40 24h4M52 24h4M40 34h4M52 34h4" /><path d="M43 58V47h10v11" stroke={T} /></>,
  insights: <><path d="M24 58V44M38 58V34M52 58V40M66 58V26" /><path d="M24 30l14-8 14 6 16-14" stroke={T} /><circle cx="68" cy="14" r="2.5" fill="#fff" stroke={T} /></>,
  "caught-up": <><path d="M40 12h-7a3 3 0 0 0-3 3v40a3 3 0 0 0 3 3h30a3 3 0 0 0 3-3V15a3 3 0 0 0-3-3h-7" /><rect x="40" y="8" width="16" height="8" rx="2" /><path d="M39 36l6.5 6.5L58 30" stroke={T} /></>,
};

/** Line illustration in the icon stroke language (round, navy + one teal accent, no faces). 64px wide = 48px tall by default. */
export function EmptyArt({ art, size = 64 }: { art: EmptyArtName; size?: number }) {
  return (
    <svg width={size} height={size * 0.75} viewBox="0 0 96 72" fill="none" stroke="currentColor" strokeWidth={(1.75 * 96) / size} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ART[art]}
      <path d="M18 64h60" stroke={G} />
    </svg>
  );
}

interface EmptyStateProps {
  art: EmptyArtName;
  title: string;
  text?: ReactNode;
  actions?: ReactNode;
  /** "sm" lays it out in a row for use inside cards. */
  size?: "sm";
}

export function EmptyState({ art, title, text, actions, size }: EmptyStateProps) {
  return (
    <div className="es" data-size={size}>
      <EmptyArt art={art} size={size === "sm" ? 56 : 64} />
      <div>
        <h4>{title}</h4>
        {text && <p>{text}</p>}
        {actions && <div className="acts">{actions}</div>}
      </div>
    </div>
  );
}
