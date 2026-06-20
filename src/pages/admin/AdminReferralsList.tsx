import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Search, Loader2, ListFilter, ChevronsUpDown, ChevronUp, ChevronDown,
  ChevronLeft, ChevronRight, ClipboardCheck, AlertTriangle, Zap,
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
  { value: "rejected", short: "Rejected", long: "Rejected" },
  { value: "approved_to_send", short: "Ready to Send", long: "Ready to Send" },
  { value: "sent_to_pharmacy", short: "Sent", long: "Sent" },
];
function matchesFilter(r: any, f: string) {
  if (f === "all") return true;
  if (f === "needs_review") return r.status === "ready_for_review" || r.status === "processing";
  return r.status === f;
}
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

export default function AdminReferralsList() {
  const location = useLocation();
  const navigate = useNavigate();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [clinicFilter, setClinicFilter] = useState("all");
  const [sort, setSort] = useState<Sort>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchReferrals = async () => {
      try {
        setLoading(true);
        const response = await adminApi.getReferrals();
        setReferrals((response.items || []).map((r: any) => ({ ...r, drug: r.drug_requested, dob: r.patient_dob })));
      } catch (err: any) {
        toast({ title: "Error", description: err.message || "Failed to load referrals", variant: "destructive" });
      } finally { setLoading(false); }
    };
    fetchReferrals();
    const handleFocus = () => fetchReferrals();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [location.key]);

  const clinics = useMemo(() => [...new Set(referrals.map((r: any) => r.clinic_name).filter(Boolean))], [referrals]);
  const filterCount = (value: string) => referrals.filter((r) => matchesFilter(r, value)).length;

  const filtered = useMemo(() => {
    const base = referrals.filter((r: any) => {
      const q = search.toLowerCase();
      if (!((r.patient_name || "").toLowerCase().includes(q) || (r.id || "").toLowerCase().includes(q))) return false;
      if (clinicFilter !== "all" && r.clinic_name !== clinicFilter) return false;
      return matchesFilter(r, activeFilter);
    });
    if (!sort) return base;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...base].sort((a: any, b: any) => {
      let av: any, bv: any;
      if (sort.col === "created") { av = new Date(a.created_at || 0).getTime(); bv = new Date(b.created_at || 0).getTime(); }
      else if (sort.col === "pa") { av = paRank(a.pa_status); bv = paRank(b.pa_status); }
      else { av = a.status || ""; bv = b.status || ""; }
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  }, [referrals, search, clinicFilter, activeFilter, sort]);

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

      <div className="rl-toolbar">
        <div className="rl-seg-wrap">
          <div className="rl-seg">
            {FILTERS.map((f) => (
              <button key={f.value} className={`rl-seg-btn${activeFilter === f.value ? " on" : ""}`} onClick={() => handleFilter(f.value)}>
                {f.short}<span className="rl-seg-n num">{filterCount(f.value)}</span>
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
                  <td><ClinicPABadge status={r.pa_status} /></td>
                  <td><span style={{ display: "inline-flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}><StatusBadge status={r.status} />{r.insurance_expired && <ExpiredTag />}</span></td>
                  <td className="dh-muted-cell">{r.pharmacy_name || "—"}</td>
                  <td className="dh-muted-cell">{r.created_at ? formatDateShort(r.created_at) : "—"}</td>
                  <td className="r" onClick={(e) => e.stopPropagation()}>
                    <button className="rw-btn primary sm" onClick={() => navigate(`/admin/referrals/${r.id}`)}><ClipboardCheck size={14} />Review</button>
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
