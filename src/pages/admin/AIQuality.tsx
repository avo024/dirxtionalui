import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  Loader2, AlertTriangle, Search, FileText, CheckCircle2, PencilLine,
  ChevronsUpDown, ChevronUp, ChevronDown, ArrowRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAIQualityOverview, useAIQualityCorrections } from "@/hooks/useAIQuality";
import { getRelativeTime } from "@/lib/dateUtils";
import { CorrectionRow } from "@/components/admin/CorrectionRow";
import type { AIQualityFieldRow } from "@/lib/aiQualityApi";
import "../clinic/wizard.css";
import "../clinic/dashboard.css";
import "../clinic/referrals.css";
import "./aiq.css";

const DAY_OPTIONS = [7, 14, 30, 90] as const;

type SortKey =
  | "field_path"
  | "edit_count"
  | "high_conf_wrong_count"
  | "acceptance_rate"
  | "avg_model_confidence"
  | "last_edited_at";

function pct(v: number | null): string {
  if (v === null || v === undefined) return "—";
  return `${Math.round(v * 100)}%`;
}
function confFmt(v: number | null): string {
  if (v === null || v === undefined) return "—";
  return v.toFixed(2);
}
function acceptTone(v: number | null): "low" | "mid" | "high" {
  if (v === null || v === undefined) return "mid";
  if (v >= 0.9) return "high";
  if (v >= 0.7) return "mid";
  return "low";
}

const STAT_TONE: Record<string, { fg: string; bg: string }> = {
  primary: { fg: "var(--color-navy)", bg: "color-mix(in srgb, var(--color-navy) 10%, transparent)" },
  success: { fg: "var(--color-success)", bg: "color-mix(in srgb, var(--color-success) 12%, transparent)" },
  warning: { fg: "var(--color-warning)", bg: "color-mix(in srgb, var(--color-warning) 14%, transparent)" },
  teal: { fg: "var(--color-teal-600)", bg: "color-mix(in srgb, var(--color-teal-500) 13%, transparent)" },
};

export default function AIQuality() {
  const { user } = useAuth();
  const [days, setDays] = useState<number>(7);
  const [formType, setFormType] = useState<string>("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("edit_count");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const overview = useAIQualityOverview(days, formType || undefined);
  const feed = useAIQualityCorrections({ days, limit: 20 });

  // Defensive client-side role gate (AdminLayout already enforces this).
  if (user && user.role !== "internal_admin") {
    return <Navigate to="/clinic/dashboard" replace />;
  }

  const sortedFields = useMemo<AIQualityFieldRow[]>(() => {
    const rows = overview.data?.fields ?? [];
    const filtered = search
      ? rows.filter((r) => r.field_path.toLowerCase().includes(search.toLowerCase()))
      : rows;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [overview.data, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const SortTh = ({ k, children, cls }: { k: SortKey; children: React.ReactNode; cls?: string }) => {
    const active = sortKey === k;
    const Caret = !active ? ChevronsUpDown : sortDir === "asc" ? ChevronUp : ChevronDown;
    return (
      <th className={cls}>
        <button className="rl-sortbtn" onClick={() => toggleSort(k)}>
          {children}<span className={`rl-caret${active ? " on" : ""}`}><Caret size={13} /></span>
        </button>
      </th>
    );
  };

  const totals = overview.data?.totals;
  const formTypes = overview.data?.by_form_type ?? [];
  const watchList = (overview.data?.top_problem_fields ?? []).filter((f) => f.high_conf_wrong_count > 0);

  const stats = [
    { key: "extractions", label: "Extractions", tone: "primary", icon: FileText, value: String(totals?.extractions ?? 0), sub: "in window" },
    { key: "acceptance", label: "Acceptance rate", tone: "success", icon: CheckCircle2, value: pct(totals?.acceptance_rate ?? null), sub: "no human edits" },
    { key: "hcw", label: "High-confidence-but-edited", tone: "warning", icon: AlertTriangle, value: String(totals?.high_conf_wrong ?? 0), sub: "model was confident AND wrong" },
    { key: "corrections", label: "Corrections logged", tone: "teal", icon: PencilLine, value: String(totals?.corrections ?? 0), sub: "across all fields" },
  ];

  return (
    <div className="aiq-page rw-fade">
      {/* Header */}
      <div className="aiq-head">
        <div className="aiq-head-l">
          <h1 className="aiq-h1 serif">AI Extraction Quality</h1>
          <p className="aiq-sub">
            Internal — track how often the AI extraction needs human correction. Used to iterate on the extraction prompt.
          </p>
        </div>
        <div className="aiq-head-r">
          <div className="aiq-window">
            {DAY_OPTIONS.map((d) => (
              <button key={d} className={`aiq-window-btn${days === d ? " on" : ""}`} onClick={() => setDays(d)}>{d}d</button>
            ))}
          </div>
          <div className="rl-statusdd">
            <FileText size={15} />
            <select className="rl-select" value={formType || "all"} onChange={(e) => setFormType(e.target.value === "all" ? "" : e.target.value)}>
              <option value="all">All form types</option>
              {formTypes.map((f) => <option key={f.form_type} value={f.form_type}>{f.form_type}</option>)}
            </select>
          </div>
        </div>
      </div>

      {overview.isLoading ? (
        <div className="aiq-empty"><Loader2 className="rw-spin" style={{ color: "var(--color-teal)", display: "inline-block" }} size={26} /></div>
      ) : overview.isError ? (
        <div className="aiq-card aiq-card-pad" style={{ borderColor: "color-mix(in srgb, var(--color-error) 30%, transparent)", color: "var(--color-error)" }}>
          Failed to load AI quality metrics: {(overview.error as Error)?.message}
        </div>
      ) : (
        <>
          {/* Stat tiles */}
          <div className="aiq-stat-grid">
            {stats.map((s) => {
              const t = STAT_TONE[s.tone];
              return (
                <div key={s.key} className={`aiq-stat${s.tone === "warning" ? " warn" : ""}`}>
                  <div className="aiq-stat-top">
                    <p className="aiq-stat-lbl">{s.label}</p>
                    <span className="aiq-stat-ic" style={{ background: t.bg, color: t.fg }}><s.icon size={18} /></span>
                  </div>
                  <p className="aiq-stat-val num">{s.value}</p>
                  <p className="aiq-stat-sub">{s.sub}</p>
                </div>
              );
            })}
          </div>

          {/* Watch list */}
          {watchList.length > 0 && (
            <div className="aiq-card aiq-card-pad">
              <div className="aiq-sec-head">
                <div>
                  <h2>Watch list <AlertTriangle size={16} style={{ color: "var(--color-warning)", verticalAlign: "-2px", marginLeft: 4 }} /></h2>
                  <p className="aiq-sec-sub">Fields the model was confident about (≥ 0.85) but reviewers still corrected.</p>
                </div>
                <Link className="aiq-sec-link" to="/admin/ai-quality/corrections?high_conf_only=true">
                  View high-conf corrections <ArrowRight size={14} />
                </Link>
              </div>
              <div className="aiq-watch-grid">
                {watchList.slice(0, 8).map((f) => (
                  <Link key={f.field_path} className="aiq-watch-card" to={`/admin/ai-quality/corrections?high_conf_only=true&field=${encodeURIComponent(f.field_path)}`}>
                    <div className="aiq-watch-field">{f.field_path}</div>
                    <div className="aiq-watch-row">
                      <span className="aiq-watch-n">{f.high_conf_wrong_count}</span>
                      <span className="aiq-watch-k">high-conf edits</span>
                    </div>
                    <div className="aiq-watch-conf">{f.edit_count} total edits</div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Per-field accuracy table */}
          <div className="aiq-card aiq-card-pad">
            <div className="aiq-sec-head">
              <div>
                <h2>Per-field accuracy</h2>
                <p className="aiq-sec-sub">Every extracted field, ranked. Amber flags confident-but-wrong counts.</p>
              </div>
              <div className="aiq-tbl-search">
                <span className="rl-search-ic"><Search size={15} /></span>
                <input placeholder="Filter by field path…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            {sortedFields.length === 0 ? (
              <p className="aiq-empty">
                No corrections logged yet. Once admins or clinic users edit AI-extracted fields, you'll see them here.
              </p>
            ) : (
              <div className="aiq-tbl-wrap">
                <table className="dh-table aiq-tbl">
                  <thead>
                    <tr>
                      <SortTh k="field_path">Field path</SortTh>
                      <SortTh k="edit_count" cls="num">Edits</SortTh>
                      <SortTh k="high_conf_wrong_count" cls="num">High-conf wrong</SortTh>
                      <SortTh k="acceptance_rate" cls="num">Acceptance</SortTh>
                      <SortTh k="avg_model_confidence" cls="num">Avg conf</SortTh>
                      <SortTh k="last_edited_at">Last edited</SortTh>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedFields.map((row) => (
                      <tr key={row.field_path} style={{ cursor: "pointer" }}>
                        <td>
                          <Link className="aiq-fieldpath" to={`/admin/ai-quality/corrections?field=${encodeURIComponent(row.field_path)}`}>
                            {row.field_path}
                          </Link>
                        </td>
                        <td className="num">{row.edit_count}</td>
                        <td className="num">
                          <span className={`aiq-hcw${row.high_conf_wrong_count === 0 ? " zero" : ""}`}>
                            {row.high_conf_wrong_count > 0 && <AlertTriangle size={11} />}{row.high_conf_wrong_count}
                          </span>
                        </td>
                        <td className="num"><span className={`aiq-accept ${acceptTone(row.acceptance_rate)}`}>{pct(row.acceptance_rate)}</span></td>
                        <td className="num">
                          <span className="aiq-conf">{confFmt(row.avg_model_confidence)}</span>
                          {row.avg_model_confidence !== null && (
                            <span className="aiq-bar"><span style={{ width: `${row.avg_model_confidence * 100}%` }} /></span>
                          )}
                        </td>
                        <td className="aiq-mutecell">{row.last_edited_at ? getRelativeTime(row.last_edited_at) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Form-type rollup */}
          {formTypes.length > 0 && (
            <div className="aiq-card aiq-card-pad">
              <div className="aiq-sec-head"><div><h2>By form type</h2><p className="aiq-sec-sub">Correction load per document type.</p></div></div>
              <div className="aiq-tbl-wrap">
                <table className="dh-table aiq-tbl" style={{ minWidth: 480 }}>
                  <thead><tr><th>Form type</th><th className="num">Edits</th><th className="num">Edited referrals</th></tr></thead>
                  <tbody>
                    {formTypes.map((f) => (
                      <tr key={f.form_type}>
                        <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>{f.form_type}</td>
                        <td className="num">{f.edits}</td>
                        <td className="num">{f.edited_referrals}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent corrections */}
          <div className="aiq-card aiq-card-pad">
            <div className="aiq-sec-head">
              <div><h2>Recent corrections</h2></div>
              <Link className="aiq-sec-link" to="/admin/ai-quality/corrections">View all <ArrowRight size={14} /></Link>
            </div>
            {feed.isLoading ? (
              <div className="aiq-empty"><Loader2 className="rw-spin" style={{ color: "var(--text-muted)", display: "inline-block" }} size={22} /></div>
            ) : feed.data && feed.data.items.length > 0 ? (
              <div className="aiq-corr-list">
                {feed.data.items.map((c, i) => (
                  <CorrectionRow key={c.id ?? `${c.referral_id}-${c.field_path}-${i}`} correction={c} />
                ))}
              </div>
            ) : (
              <p className="aiq-empty">No corrections in the last {days} days.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
