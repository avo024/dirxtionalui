import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams, useLocation, useNavigate } from "react-router-dom";
import {
  Search, Plus, FileSearch, ChevronLeft, ChevronRight, ListFilter,
  ChevronsUpDown, ChevronUp, ChevronDown, Eye,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { ClinicPABadge } from "@/components/ClinicPABadge";
import { CreatedByAvatar } from "@/components/CreatedByAvatar";
import { clinicApi } from "@/lib/api";
import { mapReferralsFromBackend } from "@/lib/dataMapper";
import { useToast } from "@/hooks/use-toast";
import { formatDateShort } from "@/lib/dateUtils";
import type { Referral } from "@/types/index";
import "./wizard.css";
import "./dashboard.css";
import "./referrals.css";

const filters = [
  { label: "All", value: "all" },
  { label: "In Review", value: "in_review" },
  { label: "Needs Attention", value: "rejected" },
  { label: "Sent", value: "sent_to_pharmacy" },
];
const filterStatusMap: Record<string, string[]> = {
  all: [],
  in_review: ["processing", "ready_for_review", "uploaded"],
  rejected: ["rejected"],
  sent_to_pharmacy: ["sent_to_pharmacy", "approved_to_send"],
};

type Sort = { col: "status" | "created" | "updated"; dir: "asc" | "desc" } | null;

// Ellipsis-aware page window: 1 … c-1 c c+1 … total
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

export default function ReferralsList() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [activeFilter, setActiveFilter] = useState(searchParams.get("filter") || "all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState("10");
  const [sort, setSort] = useState<Sort>(null);
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchReferrals() {
      try {
        setLoading(true);
        const response = await clinicApi.getReferrals();
        setReferrals(mapReferralsFromBackend((response as any).items || response || []));
      } catch (err) {
        console.error("Failed to fetch referrals:", err);
        toast({ title: "Error loading referrals", description: err instanceof Error ? err.message : "Could not connect to the server.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    fetchReferrals();
    const handleFocus = () => fetchReferrals();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [toast, location.key]);

  const getFilterCount = (value: string): number => {
    if (value === "all") return referrals.length;
    const statuses = filterStatusMap[value] || [value];
    return referrals.filter((r) => statuses.includes(r.status)).length;
  };

  const filtered = useMemo(() => {
    const base = referrals.filter((r) => {
      const q = search.toLowerCase();
      const matchesSearch = r.patient_name.toLowerCase().includes(q) || r.drug.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (activeFilter === "all") return true;
      const statuses = filterStatusMap[activeFilter] || [activeFilter];
      return statuses.includes(r.status);
    });
    if (!sort) return base;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...base].sort((a: any, b: any) => {
      let av: any, bv: any;
      if (sort.col === "created") { av = new Date(a.created_at || 0).getTime(); bv = new Date(b.created_at || 0).getTime(); }
      else if (sort.col === "updated") { av = new Date(a.updated_at || 0).getTime(); bv = new Date(b.updated_at || 0).getTime(); }
      else { av = a.status || ""; bv = b.status || ""; }
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  }, [activeFilter, search, referrals, sort]);

  const itemsPerPage = parseInt(pageSize);
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);
  const startItem = filtered.length === 0 ? 0 : (safePage - 1) * itemsPerPage + 1;
  const endItem = Math.min(safePage * itemsPerPage, filtered.length);

  const handleFilter = (value: string) => { setActiveFilter(value); setCurrentPage(1); };
  const handleSearch = (value: string) => { setSearch(value); setCurrentPage(1); };
  const onSort = (col: "status" | "created" | "updated") =>
    setSort((s) => (!s || s.col !== col ? { col, dir: "asc" } : s.dir === "asc" ? { col, dir: "desc" } : null));
  const clearFilters = () => { setSearch(""); setActiveFilter("all"); };

  const SortCaret = ({ col }: { col: "status" | "created" | "updated" }) => {
    const active = sort?.col === col;
    const Icon = !active ? ChevronsUpDown : sort!.dir === "asc" ? ChevronUp : ChevronDown;
    return <span className={`rl-caret${active ? " on" : ""}`}><Icon size={13} /></span>;
  };
  const SortTh = ({ col, children }: { col: "status" | "created" | "updated"; children: React.ReactNode }) => (
    <th><button className="rl-sortbtn" onClick={() => onSort(col)}>{children}<SortCaret col={col} /></button></th>
  );

  return (
    <div className="rw-page rl-page rw-fade">
      {/* Header */}
      <div className="rl-header">
        <div>
          <h1 className="rl-h1 serif">My Referrals</h1>
          <p className="rl-sub">View and track all your submitted referrals</p>
        </div>
        <Link to="/clinic/referrals/new" className="rw-btn primary"><Plus size={15} />New Referral</Link>
      </div>

      {/* Toolbar — segmented filter + dropdown + search */}
      <div className="rl-toolbar" data-tour="referrals-filters">
        <div className="rl-seg-wrap">
          <div className="rl-seg">
            {filters.map((f) => (
              <button key={f.value} className={`rl-seg-btn${activeFilter === f.value ? " on" : ""}`} onClick={() => handleFilter(f.value)}>
                {f.label}<span className="rl-seg-n num">{getFilterCount(f.value)}</span>
              </button>
            ))}
          </div>
          <div className="rl-statusdd">
            <ListFilter size={15} />
            <select className="rl-select" value={activeFilter} onChange={(e) => handleFilter(e.target.value)}>
              {filters.map((f) => <option key={f.value} value={f.value}>{f.label} ({getFilterCount(f.value)})</option>)}
            </select>
          </div>
        </div>
        <div className="rl-search">
          <span className="rl-search-ic"><Search size={16} /></span>
          <input className="rl-search-input" placeholder="Search by patient, drug, or ID..." value={search} onChange={(e) => handleSearch(e.target.value)} />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="rl-skel">{[0, 1, 2, 3].map((i) => <div key={i} className="rl-skel-row" />)}</div>
      ) : filtered.length > 0 ? (
        <div className="dh-table-wrap" data-tour="referrals-table">
          <table className="dh-table">
            <thead>
              <tr>
                <th>ID</th><th>Patient Name</th><th>Drug</th>
                <SortTh col="status">Status</SortTh>
                <th>PA Status</th>
                <SortTh col="created">Created</SortTh>
                <SortTh col="updated">Updated</SortTh>
                <th className="r">Actions</th><th></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((r: any) => (
                <tr key={r.id} onClick={() => navigate(`/clinic/referrals/${r.id}`)}>
                  <td><span className="dh-id">{(r.id || "").toUpperCase()}</span></td>
                  <td><span className="dh-pt"><span className="dh-pt-nm">{r.patient_name}</span></span></td>
                  <td>{r.drug || r.drug_requested || "—"}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td><ClinicPABadge status={r.pa_status} /></td>
                  <td className="dh-muted-cell">{r.created_at ? formatDateShort(r.created_at) : "—"}</td>
                  <td className="dh-muted-cell">{r.updated_at ? formatDateShort(r.updated_at) : "—"}</td>
                  <td className="r" onClick={(e) => e.stopPropagation()}><Link to={`/clinic/referrals/${r.id}`} className="rw-btn outline sm"><Eye size={14} />View</Link></td>
                  <td><CreatedByAvatar name={r.created_by_name} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : search || activeFilter !== "all" ? (
        <div className="dh-empty">
          <div className="dh-empty-ic sm"><FileSearch size={20} /></div>
          <p className="rl-empty-t">No referrals found</p>
          <p className="rl-empty-s">Try adjusting your search or filters</p>
          <button className="rw-btn outline sm" onClick={clearFilters}>Clear Filters</button>
        </div>
      ) : (
        <div className="dh-empty">
          <div className="dh-empty-ic"><FileSearch size={26} /></div>
          <h3>You haven't created any referrals yet</h3>
          <p>Create your first referral to get started</p>
          <Link to="/clinic/referrals/new" className="rw-btn primary" style={{ display: "inline-flex" }}><Plus size={15} />Create Your First Referral</Link>
        </div>
      )}

      {/* Pagination — compact */}
      {!loading && filtered.length > 0 && (
        <div className="rl-pag">
          <div className="rl-pag-meta">
            <span>Showing {startItem}-{endItem} of {filtered.length} referrals</span>
            <select className="rl-pagesize" value={pageSize} onChange={(e) => { setPageSize(e.target.value); setCurrentPage(1); }}>
              {["5", "10", "25", "50"].map((s) => <option key={s} value={s}>{s} per page</option>)}
            </select>
          </div>
          <div className="rl-pag-ctrl">
            <button className="rw-btn outline sm" disabled={safePage === 1} onClick={() => setCurrentPage(safePage - 1)}><ChevronLeft size={15} />Prev</button>
            <div className="rl-pg-window">
              {pageWindow(totalPages, safePage).map((n, i) => (
                n === "…" ? <span key={`e${i}`} className="rl-pg-ell">…</span>
                  : <button key={n} className={`rl-pg-num${n === safePage ? " on" : ""}`} onClick={() => setCurrentPage(n as number)}>{n}</button>
              ))}
            </div>
            <span className="rl-pg-xy">Page {safePage} of {totalPages}</span>
            <button className="rw-btn outline sm" disabled={safePage === totalPages} onClick={() => setCurrentPage(safePage + 1)}>Next<ChevronRight size={15} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
