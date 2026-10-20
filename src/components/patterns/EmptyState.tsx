import type { ReactNode } from "react";

export type EmptyArtName = "referrals" | "patients" | "documents" | "notes" | "support" | "caught-up";

const T = "var(--color-teal-500)";
const G = "var(--color-stone-300)";

const ART: Record<EmptyArtName, ReactNode> = {
  referrals: <><path d="M34 12h20l10 10v32a3 3 0 0 1-3 3H34a3 3 0 0 1-3-3V15a3 3 0 0 1 3-3z" strokeDasharray="3 4" /><path d="M54 12v10h10" /><circle cx="64" cy="52" r="9" fill="#fff" stroke={T} /><path d="M64 48v8M60 52h8" stroke={T} /></>,
  patients: <><circle cx="38" cy="24" r="8" /><path d="M24 56v-3a11 11 0 0 1 11-11h6a11 11 0 0 1 11 11v3" /><circle cx="62" cy="27" r="6.5" stroke={T} strokeDasharray="3 3.5" /><path d="M56 43h5a9 9 0 0 1 9 9v4" stroke={T} strokeDasharray="3 3.5" /></>,
  documents: <><path d="M48 8v18M42 20l6 6 6-6" stroke={T} /><path d="M22 42l7-10h7M60 32h7l7 10v12a3 3 0 0 1-3 3H25a3 3 0 0 1-3-3z" /><path d="M22 42h14a12 6 0 0 0 24 0h14" /></>,
  notes: <><path d="M24 12h48a4 4 0 0 1 4 4v24a4 4 0 0 1-4 4H44l-10 9v-9H24a4 4 0 0 1-4-4V16a4 4 0 0 1 4-4z" /><path d="M30 23h36M30 32h22" stroke={T} strokeDasharray="2 4" /></>,
  support: <><path d="M22 12h44a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H42l-10 9v-9H22a4 4 0 0 1-4-4V16a4 4 0 0 1 4-4z" /><path d="M28 22h32M28 30h18" /><circle cx="68" cy="48" r="9" fill="#fff" stroke={T} /><path d="M64 48l3 3 5-6" stroke={T} /></>,
  "caught-up": <><path d="M40 12h-7a3 3 0 0 0-3 3v40a3 3 0 0 0 3 3h30a3 3 0 0 0 3-3V15a3 3 0 0 0-3-3h-7" /><rect x="40" y="8" width="16" height="8" rx="2" /><path d="M39 36l6.5 6.5L58 30" stroke={T} /></>,
};

/** Line illustration in the icon stroke language (round, navy + one teal accent, no faces). */
export function EmptyArt({ art, size = 96 }: { art: EmptyArtName; size?: number }) {
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
      <EmptyArt art={art} size={size === "sm" ? 72 : 96} />
      <div>
        <h4>{title}</h4>
        {text && <p>{text}</p>}
        {actions && <div className="acts">{actions}</div>}
      </div>
    </div>
  );
}
