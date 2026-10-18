import type { ReactNode } from "react";

export interface ReferralHeaderBand {
  /** Short key on the left edge ("Sent", "To fix", "Your team asked"...). */
  k: string;
  /** Holder hue for the key. */
  h?: "clinic" | "pharm" | "dx" | "done";
  body: ReactNode;
}

interface ReferralHeaderProps {
  patient: ReactNode;
  status: ReactNode;
  pa?: ReactNode;
  drug?: ReactNode;
  created: ReactNode;
  by?: string | null;
  /** Signed-in user's name; "by X" shows only when it is somebody else. */
  me?: string | null;
  tools?: ReactNode;
  band?: ReferralHeaderBand | null;
  /** Rows under the band (sent documents). */
  docs?: ReactNode;
}

/**
 * One header for the clinic referral detail: name (serif) + status + meta,
 * quiet tools on the right, then one band keyed by the referral's state.
 */
export function ReferralHeader({ patient, status, pa, drug, created, by, me, tools, band, docs }: ReferralHeaderProps) {
  return (
    <section className="rh mb-5">
      <div className="rh-top">
        <div style={{ minWidth: 0 }}>
          <div className="rh-name">
            <h1 className="ty-title">{patient}</h1>
            {status}
          </div>
          <div className="rh-meta">
            <b>{drug || "—"}</b>
            {pa && <><span className="sep">·</span>{pa}</>}
            <span className="sep">·</span>
            <span>Created {created}</span>
            {by && by !== me && <><span className="sep">·</span><span>by {by}</span></>}
          </div>
        </div>
        <div className="rh-tools">{tools}</div>
      </div>
      {band && (
        <div className="rh-band" data-h={band.h}>
          <span className="k">{band.k}</span>
          <div className="v">{band.body}</div>
        </div>
      )}
      {docs && <div className="rh-docs">{docs}</div>}
    </section>
  );
}
