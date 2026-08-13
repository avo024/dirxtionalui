import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Search, Loader2, ListFilter, ChevronsUpDown, ChevronUp, ChevronDown,
  ChevronLeft, ChevronRight, ClipboardCheck, AlertTriangle, Zap, Archive, RotateCcw,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { ClinicPABadge } from "@/components/ClinicPABadge";
import { adminApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { formatDateShort } from "@/lib/dateUtils";
import "../clinic/wizard.css";
import "../clinic/dashboard.css";
import "../clinic/referrals.css";

const FILTERS = [
  { value: "all", short: "All", long: "All" },
  { value: "needs_review", short: "Needs Review", long: "Needs Review" },
  { value: "pa_pending", short: "PA Pending", long: "PA Pending" },
  { value: "approved_to_send", short: "Ready to Send", long: "Ready to Send" },
  { value: "appeal", short: "First Appeal", long: "First Appeal" },
  { value: "rejected", short: "Rejected", long: "Rejected" },
  { value: "sent_to_pharmacy", short: "Sent", long: "Sent" },
];
// PA-workflow tabs are server-side views (all time, triage-sorted oldest clock
// first); the rest filter the month-scoped load client-side as before.
// Server-side views (all-time, filtered by the backend): the two PA tabs plus
// the dashboard's task-replies drill-in (not a visible tab — reached via card).
const PA_VIEWS = new Set(["pa_pending", "appeal", "task_replies"]);
function matchesFilter(r: any, f: string) {
  if (f === "all") return true;
  if (f === "needs_review")
    // A filed or in-appeal PA has its own home (PA Pending / First Appeal),
    // and a handed-off/final appeal is out of our hands entirely — Needs
    // Review holds only work nobody has moved forward yet.
    return (r.status === "ready_for_review" || r.status === "processing")
      && !["submitted", "appeal"].includes(r.pa_status)
      && !(r.pa_status === "denied" && ["level2", "final"].includes(r.appeal_outcome));
  if (f === "pa_pending") return ["pending", "submitted"].includes(r.pa_status) && !["sent_to_pharmacy", "rejected"].includes(r.status);
  if (f === "appeal") return r.pa_status === "appeal";
  return r.status === f;
}

// 72h follow-up clock: countdown from PA submission (or appeal start) — flips
// to a red OVERDUE chip once the backend says follow-up is due. It's OUR
// follow-up discipline (expedited-appeal SLA), labeled as such — not a payer
// deadline breach.
function ClockChip({ r }: { r: any }) {
  const startIso = r.pa_status === "appeal" ? r.appeal_started_at : r.pa_submitted_at;
  const overdue = r.pa_status === "appeal" ? r.appeal_followup_due : r.pa_followup_due;
  if (!startIso) return null;
  if (overdue) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 9999, background: "color-mix(in srgb, var(--color-error) 14%, transparent)", color: "var(--color-error)" }}>
        <AlertTriangle size={10} />FOLLOW-UP DUE
      </span>
    );
  }
  const msLeft = new Date(startIso).getTime() + 72 * 3600_000 - Date.now();
  const hrs = Math.max(0, Math.floor(msLeft / 3600_000));
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 9999, background: "var(--color-teal-50)", color: "var(--color-teal-700)" }}>
      check in {hrs}h
    </span>
  );
}

const UrgentTag = () => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 9999, background: "color-mix(in srgb, var(--color-error) 14%, transparent)", color: "var(--color-error)" }}><AlertTriangle size={10} />URGENT</span>
);
const TaskTag = ({ n }: { n: number }) => (
  <span title={`${n} open task${n === 1 ? "" : "s"} with the clinic`} style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 9999, background: "color-mix(in srgb, var(--color-warning) 16%, transparent)", color: "#92610B" }}>
    <ClipboardCheck size={10} />{n} task{n === 1 ? "" : "s"}
  </span>
);
const PA_RANK: Record<string, number> = { processing: 0, denied: 1, submitted: 2, pending: 3, approved: 4 };
const paRank = (s: string) => (s in PA_RANK ? PA_RANK[s] : 5);

type Sort = { col: "pa" | "status" | "created"; dir: "asc" | "desc" } | null;
const PAGE_SIZE = 25;

function pageWindow(total: number, cur: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const lo = Math.max(2, cur - 1), hi = Math.min(total - 1, cur + 1);
  if (lo > 2) out.push("…");
  for (let i = lo; i <= hi; i++) out.push(i);
  if (hi < total - 1) out.push("…");
  out.push(total);
  return out;
}

const ExpiredTag = () => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 9999, background: "color-mix(in srgb, var(--color-warning) 16%, transparent)", color: "#92610B" }}><AlertTriangle size={10} />Ins. Expired</span>
);
const BridgeTag = () => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 9999, background: "var(--color-teal-50)", color: "var(--color-teal-700)" }}><Zap size={10} />Bridge</span>
);

function monthOptions() {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString("default", { month: "long", year: "numeric" });
    opts.push({ value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: i === 0 ? `${label} · this month` : label });
  }
  opts.push({ value: "all", label: "All time" });
  return opts;
}

export default function AdminReferralsList() {
  const location = useLocation();
  const navigate = useNavigate();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Triage-first: land on Needs Review (the incoming queue) — same pattern as
  // the support queue landing on Open. Deep links (?filter=) still win.
  const [searchParams] = useSearchParams();
  const [activeFilter, setActiveFilter] = useState(searchParams.get("filter") || "needs_review");
  const [search, setSearch] = useState("");
  const [clinicFilter, setClinicFilter] = useState("all");
  const [sort, setSort] = useState<Sort>(null);
  const [page, setPage] = useState(1);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [showArchived, setShowArchived] = useState(false);

  const [paCounts, setPaCounts] = useState<any>({});
  // PA-view rows live in their own state so switching to a PA tab never
  // replaces the month-scoped base load — the other tabs' badges count from
  // the base load, so overwriting it zeroed every count (the tab-count bug).
  const [viewRows, setViewRows] = useState<any[]>([]);
  const paView = PA_VIEWS.has(activeFilter);

  useEffect(() => {
    const mapRows = (response: any) =>
      (response.items || []).map((r: any) => ({ ...r, drug: r.drug_requested, dob: r.patient_dob }));
    const fetchReferrals = async () => {
      try {
        setLoading(true);
        // Base month-scoped load ALWAYS runs (feeds tab counts + non-PA tabs);
        // the active PA tab additionally fetches its all-time server view.
        const [base, view] = await Promise.all([
          adminApi.getReferrals({ month: search.trim() ? "all" : month, archived: showArchived }),
          paView ? adminApi.getReferrals({ view: activeFilter, month: "all" }) : Promise.resolve(null),
        ]);
        setReferrals(mapRows(base));
        setViewRows(view ? mapRows(view) : []);
      } catch (err: any) {
        toast({ title: "Error", description: err.message || "Failed to load referrals", variant: "destructive" });
      } finally { setLoading(false); }
    };
    const fetchCounts = () =>
      adminApi.getReferralCounts().then(setPaCounts).catch(() => { /* badges just won't show */ });
    fetchReferrals();
    fetchCounts();
    const handleFocus = () => { fetchReferrals(); fetchCounts(); };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [location.key, month, showArchived, paView, activeFilter, search.trim() === "" ? "m" : "all"]);

  const clinics = useMemo(() => [...new Set(referrals.map((r: any) => r.clinic_name).filter(Boolean))], [referrals]);
  // PA tabs count all-time from the counts endpoint (the local load is
  // month-scoped, so counting rows would undercount them).
  const filterCount = (value: string) => {
    if (value === "pa_pending") return paCounts.pa_pending ?? 0;
    if (value === "appeal") return paCounts.appeal ?? 0;
    return referrals.filter((r) => matchesFilter(r, value)).length;
  };
  const overdueCount = (value: string) =>
    value === "pa_pending" ? (paCounts.pa_followup_due ?? 0)
      : value === "appeal" ? (paCounts.appeal_followup_due ?? 0) : 0;

  const filtered = useMemo(() => {
    // PA tabs display their all-time server view; other tabs the month load.
    const source = paView ? viewRows : referrals;
    const base = source.filter((r: any) => {
      const q = search.toLowerCase();
      if (!((r.patient_name || "").toLowerCase().includes(q) || (r.id || "").toLowerCase().includes(q))) return false;
      if (clinicFilter !== "all" && r.clinic_name !== clinicFilter) return false;
      return paView || matchesFilter(r, activeFilter);
    });
    // All is priority-stacked: closed referrals (nothing left to do) sink to
    // the bottom; everything else keeps recency order.
    if (!sort && activeFilter === "all") {
      return [...base].sort((a: any, b: any) =>
        (a.status === "closed" ? 1 : 0) - (b.status === "closed" ? 1 : 0));
    }
    if (!sort) return base;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...base].sort((a: any, b: any) => {
      let av: any, bv: any;
      if (sort.col === "created") { av = new Date(a.created_at || 0).getTime(); bv = new Date(b.created_at || 0).getTime(); }
      else if (sort.col === "pa") { av = paRank(a.pa_status); bv = paRank(b.pa_status); }
      else { av = a.status || ""; bv = b.status || ""; }
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  }, [referrals, viewRows, paView, search, clinicFilter, activeFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleFilter = (v: string) => { setActiveFilter(v); setPage(1); };
  const onSort = (col: "pa" | "status" | "created") =>
    setSort((s) => (!s || s.col !== col ? { col, dir: "asc" } : s.dir === "asc" ? { col, dir: "desc" } : null));
  const SortTh = ({ col, children }: { col: "pa" | "status" | "created"; children: React.ReactNode }) => {
    const active = sort?.col === col;
    const Icon = !active ? ChevronsUpDown : sort!.dir === "asc" ? ChevronUp : ChevronDown;
    return <th><button className="rl-sortbtn" onClick={() => onSort(col)}>{children}<span className={`rl-caret${active ? " on" : ""}`}><Icon size={13} /></span></button></th>;
  };

  if (loading) {
    return <div className="rw-page" style={{ display: "flex", justifyContent: "center", padding: 64 }}><span className="rw-spin" style={{ color: "var(--color-teal)" }}><Loader2 size={26} /></span></div>;
  }

  return (
    <div className="rw-page rl-page rw-fade">
      <div className="rl-header">
        <div>
          <h1 className="rl-h1 serif">All Referrals</h1>
          <p className="rl-sub">Manage and review referrals from all clinics</p>
        </div>
      </div>

      {activeFilter === "task_replies" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "9px 13px", borderRadius: "var(--radius-md)", background: "color-mix(in srgb, var(--color-warning) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--color-warning) 35%, transparent)", fontSize: 13, fontWeight: 600, color: "#92610B" }}>
          <ClipboardCheck size={15} />
          Showing referrals with task replies to review — wherever they sit in the pipeline
          <button className="rw-btn outline sm" style={{ marginLeft: "auto" }} onClick={() => handleFilter("needs_review")}>Back to queue</button>
        </div>
      )}
      <div className="rl-toolbar">
        <div className="rl-seg-wrap">
          <div className="rl-seg">
            {FILTERS.map((f) => (
              <button key={f.value} className={`rl-seg-btn${activeFilter === f.value ? " on" : ""}`} onClick={() => handleFilter(f.value)}>
                {f.short}<span className="rl-seg-n num">{filterCount(f.value)}</span>
                {overdueCount(f.value) > 0 && (
                  <span className="num" title="follow-up due" style={{ marginLeft: 4, fontSize: 10, fontWeight: 700, padding: "0 5px", borderRadius: 9999, background: "color-mix(in srgb, var(--color-error) 14%, transparent)", color: "var(--color-error)" }}>
                    {overdueCount(f.value)}!
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="rl-statusdd">
            <ListFilter size={15} />
            <select className="rl-select" value={activeFilter} onChange={(e) => handleFilter(e.target.value)}>
              {FILTERS.map((f) => <option key={f.value} value={f.value}>{f.long} ({filterCount(f.value)})</option>)}
            </select>
          </div>
        </div>
        <div className="rl-search">
          <span className="rl-search-ic"><Search size={16} /></span>
          <input className="rl-search-input" placeholder="Search by patient name or ID..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="rl-select" style={{ border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", height: 38, padding: "0 10px", background: "#fff" }}
          value={clinicFilter} onChange={(e) => { setClinicFilter(e.target.value); setPage(1); }}>
          <option value="all">All Clinics</option>
          {clinics.map((c: any) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="rl-select" style={{ border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", height: 38, padding: "0 10px", background: "#fff" }}
          value={month} disabled={!!search.trim() || showArchived}
          title={search.trim() ? "Search looks across all time" : undefined}
          onChange={(e) => { setMonth(e.target.value); setPage(1); }}>
          {monthOptions().map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <button className={`rw-btn sm ${showArchived ? "primary" : "outline"}`} onClick={() => { setShowArchived(v => !v); setPage(1); }}>
          <Archive size={14} />{showArchived ? "Back to referrals" : "Archived"}
        </button>
      </div>

      {filtered.length > 0 ? (
        <div className="dh-table-wrap">
          <table className="dh-table">
            <thead>
              <tr>
                <th>ID</th><th>Patient</th><th>Clinic</th><th>Drug</th>
                <SortTh col="pa">PA Status</SortTh>
                <SortTh col="status">Status</SortTh>
                <th>Pharmacy</th>
                <SortTh col="created">Created</SortTh>
                <th className="r">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((r: any) => (
                <tr key={r.id} onClick={() => navigate(`/admin/referrals/${r.id}`)}>
                  <td><span className="dh-id">{(r.id || "").toUpperCase()}</span></td>
                  <td><span className="dh-pt"><span className="dh-pt-nm">{r.patient_name}</span></span></td>
                  <td className="dh-muted-cell">{r.clinic_name || "—"}</td>
                  <td><span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>{r.drug || r.drug_requested || "—"}{r.is_bridge_program && <BridgeTag />}</span></td>
                  <td><span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <ClinicPABadge status={r.pa_status} appealOutcome={r.appeal_outcome} />
                    {paView && <ClockChip r={r} />}
                    {r.pa_status === "appeal" && <UrgentTag />}
                  </span></td>
                  <td><span style={{ display: "inline-flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}><StatusBadge status={r.status} />{r.insurance_expired && <ExpiredTag />}{(r.open_task_count ?? 0) > 0 && <TaskTag n={r.open_task_count} />}</span></td>
                  <td className="dh-muted-cell">{r.pharmacy_name || "—"}</td>
                  <td className="dh-muted-cell">{r.created_at ? formatDateShort(r.created_at) : "—"}</td>
                  <td className="r" onClick={(e) => e.stopPropagation()}>
                    {showArchived ? (
                      <button className="rw-btn outline sm" onClick={async () => {
                        try { await adminApi.unarchiveReferral(r.id); setReferrals((prev) => prev.filter((x: any) => x.id !== r.id)); toast({ title: "Referral restored" }); }
                        catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
                      }}><RotateCcw size={14} />Unarchive</button>
                    ) : (
                      <button className="rw-btn primary sm" onClick={() => navigate(`/admin/referrals/${r.id}`)}><ClipboardCheck size={14} />Review</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="dh-empty">
          <div className="dh-empty-ic sm"><Search size={20} /></div>
          <p className="rl-empty-t">No referrals found</p>
          <p className="rl-empty-s">Try adjusting your filters</p>
          <button className="rw-btn outline sm" onClick={() => { setSearch(""); setActiveFilter("all"); setClinicFilter("all"); }}>Clear Filters</button>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="rl-pag">
          <div className="rl-pag-meta"><span>Showing {(safePage - 1) * PAGE_SIZE + 1}-{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} referrals</span></div>
          <div className="rl-pag-ctrl">
            <button className="rw-btn outline sm" disabled={safePage === 1} onClick={() => setPage(safePage - 1)}><ChevronLeft size={15} />Prev</button>
            <div className="rl-pg-window">
              {pageWindow(totalPages, safePage).map((n, i) => (
                n === "…" ? <span key={`e${i}`} className="rl-pg-ell">…</span>
                  : <button key={n} className={`rl-pg-num${n === safePage ? " on" : ""}`} onClick={() => setPage(n as number)}>{n}</button>
              ))}
            </div>
            <span className="rl-pg-xy">Page {safePage} of {totalPages}</span>
            <button className="rw-btn outline sm" disabled={safePage === totalPages} onClick={() => setPage(safePage + 1)}>Next<ChevronRight size={15} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
