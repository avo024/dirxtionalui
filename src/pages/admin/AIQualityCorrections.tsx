import { useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, Search, Check, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAIQualityCorrections } from "@/hooks/useAIQuality";
import { CorrectionRow } from "@/components/admin/CorrectionRow";
import type { AIQualityCorrection } from "@/lib/aiQualityApi";
import "../clinic/wizard.css";
import "../clinic/dashboard.css";
import "../clinic/referrals.css";
import "./aiq.css";

const DAY_OPTIONS = [7, 14, 30, 90] as const;

export default function AIQualityCorrections() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialHighConf = searchParams.get("high_conf_only") === "true";
  const initialField = searchParams.get("field") ?? "";

  const [days, setDays] = useState<number>(7);
  const [field, setField] = useState(initialField);
  const [highConfOnly, setHighConfOnly] = useState(initialHighConf);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [accumulated, setAccumulated] = useState<AIQualityCorrection[]>([]);

  const query = useAIQualityCorrections({
    days,
    field: field || undefined,
    highConfOnly,
    limit: 50,
    cursor,
  });

  // Reset accumulator when filters change.
  useEffect(() => {
    setAccumulated([]);
    setCursor(undefined);
  }, [days, field, highConfOnly]);

  // Append new page when query data lands.
  useEffect(() => {
    if (query.data?.items) {
      setAccumulated((prev) => {
        const ids = new Set(prev.map((c, i) => c.id ?? `${c.referral_id}-${c.field_path}-${c.edited_at}-${i}`));
        const next = query.data!.items.filter(
          (c, i) => !ids.has(c.id ?? `${c.referral_id}-${c.field_path}-${c.edited_at}-${i}`),
        );
        return [...prev, ...next];
      });
    }
  }, [query.data]);

  if (user && user.role !== "internal_admin") {
    return <Navigate to="/clinic/dashboard" replace />;
  }

  const nextCursor = query.data?.next_cursor ?? null;

  return (
    <div className="aiq-page narrow rw-fade">
      {/* Header */}
      <div className="aiq-head">
        <div className="aiq-head-l">
          <Link className="aiq-back" to="/admin/ai-quality" style={{ marginBottom: 12 }}>
            <ArrowLeft size={15} />Back to overview
          </Link>
          <h1 className="aiq-h1">Corrections feed</h1>
          <p className="aiq-sub">
            Every reviewer edit, newest first. The amber border marks edits the model was confident about (≥ 0.85).
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="aiq-card aiq-card-pad">
        <div className="aiq-filterbar">
          <div className="aiq-window">
            {DAY_OPTIONS.map((d) => (
              <button key={d} className={`aiq-window-btn${days === d ? " on" : ""}`} onClick={() => setDays(d)}>{d}d</button>
            ))}
          </div>
          <div className="aiq-tbl-search" style={{ width: 280 }}>
            <span className="rl-search-ic"><Search size={15} /></span>
            <input placeholder="Filter by field path…" value={field} onChange={(e) => setField(e.target.value)} />
          </div>
          <button className={`aiq-check-inline${highConfOnly ? " on" : ""}`} onClick={() => setHighConfOnly((v) => !v)}>
            <span className="aiq-check-box">{highConfOnly && <Check size={12} />}</span>
            High-confidence only (≥ 0.85)
          </button>
          <span style={{ marginLeft: "auto", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            {accumulated.length} loaded
          </span>
        </div>
      </div>

      {/* List */}
      {query.isLoading && accumulated.length === 0 ? (
        <div className="aiq-empty"><Loader2 className="rw-spin" style={{ color: "var(--color-teal)", display: "inline-block" }} size={26} /></div>
      ) : query.isError ? (
        <div className="aiq-card aiq-card-pad" style={{ borderColor: "color-mix(in srgb, var(--color-error) 30%, transparent)", color: "var(--color-error)" }}>
          Failed to load corrections: {(query.error as Error)?.message}
        </div>
      ) : accumulated.length === 0 ? (
        <div className="aiq-card aiq-empty">No corrections match these filters.</div>
      ) : (
        <div className="aiq-corr-list">
          {accumulated.map((c, i) => (
            <CorrectionRow key={c.id ?? `${c.referral_id}-${c.field_path}-${c.edited_at}-${i}`} correction={c} />
          ))}
        </div>
      )}

      {nextCursor && (
        <div className="aiq-loadmore">
          <button className="rw-btn outline" disabled={query.isFetching} onClick={() => setCursor(nextCursor)}>
            <ChevronDown size={15} />{query.isFetching ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
