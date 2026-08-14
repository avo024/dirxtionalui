import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search, Plus, Users, ChevronLeft, ChevronRight, Loader2, ListFilter,
  ChevronsUpDown, ChevronUp, ChevronDown,
} from "lucide-react";
import { PAStatusBadge } from "@/components/PAStatusBadge";
import { clinicApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { formatDateShort, parseLocalDate } from "@/lib/dateUtils";
import "./wizard.css";
import "./dashboard.css";
import "./referrals.css";

const FILTERS = [
  { value: "all", short: "All", long: "All Patients" },
  { value: "active", short: "Active", long: "Active (Recent Referral)" },
  { value: "inactive", short: "Inactive", long: "Inactive" },
  { value: "expiring", short: "Expiring", long: "PA Expiring Soon" },
];

function isExpiringSoon(p: any): boolean {
  if (!p.pa_expiration_date) return false;
  const daysLeft = Math.ceil((parseLocalDate(p.pa_expiration_date).getTime() - Date.now()) / 86400000);
  return daysLeft > 0 && daysLeft <= 30;
}

function matchesFilter(p: any, filter: string) {
  if (filter === "active") return p.pa_status === "approved" && p.last_drug;
  if (filter === "inactive") return !p.pa_status || p.pa_status === "none" || p.pa_status === "expired";
  if (filter === "expiring") return isExpiringSoon(p);
  return true;
}

type Sort = { col: "name" | "dob" | "created"; dir: "asc" | "desc" } | null;

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
function getAge(dob: string) {
  const b = parseLocalDate(dob), t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
  return age;
}

export default function PatientsList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [sort, setSort] = useState<Sort>(null);
  const pageSize = 10;
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    clinicApi.getPatients(search)
      .then((data) => setPatients(data.items || []))
      .catch(() => toast({ title: "Error", description: "Failed to load patients", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [search]);

  const filterCount = (value: string) => value === "all" ? patients.length : patients.filter((p) => matchesFilter(p, value)).length;

  const filtered = useMemo(() => {
    const base = patients.filter((p) => matchesFilter(p, filter));
    if (!sort) return base;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...base].sort((a, b) => {
      let av: any, bv: any;
      if (sort.col === "name") { av = (a.full_name || "").toLowerCase(); bv = (b.full_name || "").toLowerCase(); }
      else if (sort.col === "dob") { av = new Date(a.dob || 0).getTime(); bv = new Date(b.dob || 0).getTime(); }
      else { av = new Date(a.created_at || 0).getTime(); bv = new Date(b.created_at || 0).getTime(); }
      return av < bv ? -dir : av > bv ? dir : 0;
    });
  }, [patients, filter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const startItem = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, filtered.length);

  const handleFilter = (v: string) => { setFilter(v); setCurrentPage(1); };
  const onSort = (col: "name" | "dob" | "created") =>
    setSort((s) => (!s || s.col !== col ? { col, dir: "asc" } : s.dir === "asc" ? { col, dir: "desc" } : null));

  const SortCaret = ({ col }: { col: "name" | "dob" | "created" }) => {
    const active = sort?.col === col;
    const Icon = !active ? ChevronsUpDown : sort!.dir === "asc" ? ChevronUp : ChevronDown;
    return <span className={`rl-caret${active ? " on" : ""}`}><Icon size={13} /></span>;
  };
  const SortTh = ({ col, children }: { col: "name" | "dob" | "created"; children: React.ReactNode }) => (
    <th><button className="rl-sortbtn" onClick={() => onSort(col)}>{children}<SortCaret col={col} /></button></th>
  );

  return (
    <div className="rw-page rl-page rw-fade">
      <div className="rl-header">
        <div>
          <h1 className="rl-h1 serif">Patients</h1>
          <p className="rl-sub">Manage your patients and their referrals</p>
        </div>
        <Link to="/clinic/patients/new" className="rw-btn primary" data-tour="add-patient"><Plus size={15} />Add New Patient</Link>
      </div>

      <div className="rl-toolbar">
        <div className="rl-seg-wrap">
          <div className="rl-seg">
            {FILTERS.map((f) => (
              <button key={f.value} className={`rl-seg-btn${filter === f.value ? " on" : ""}`} onClick={() => handleFilter(f.value)}>
                {f.short}<span className="rl-seg-n num">{filterCount(f.value)}</span>
              </button>
            ))}
          </div>
          <div className="rl-statusdd">
            <ListFilter size={15} />
            <select className="rl-select" value={filter} onChange={(e) => handleFilter(e.target.value)}>
              {FILTERS.map((f) => <option key={f.value} value={f.value}>{f.long} ({filterCount(f.value)})</option>)}
            </select>
          </div>
        </div>
        <div className="rl-search">
          <span className="rl-search-ic"><Search size={16} /></span>
          <input className="rl-search-input" placeholder="Search by name, DOB, phone, or email..." value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} />
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 48 }}><span className="rw-spin" style={{ color: "var(--color-teal)" }}><Loader2 size={26} /></span></div>
      ) : paginated.length > 0 ? (
        <div className="dh-table-wrap">
          <table className="dh-table">
            <thead>
              <tr>
                <SortTh col="name">Patient Name</SortTh>
                <SortTh col="dob">DOB (Age)</SortTh>
                <th>Last Drug</th>
                <SortTh col="created">Last Referral</SortTh>
                <th>PA Status</th>
                <th className="r">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((p) => (
                <tr key={p.id} onClick={() => navigate(`/clinic/patients/${p.id}`)}>
                  <td><span className="dh-pt-nm">{p.full_name || "—"}</span></td>
                  <td className="dh-muted-cell">{p.dob ? `${formatDateShort(p.dob)} (${getAge(p.dob)})` : "—"}</td>
                  <td>{p.last_drug || "—"}{p.last_dosage && <span style={{ color: "var(--text-muted)", marginLeft: 5, fontSize: "var(--text-xs)" }}>{p.last_dosage}</span>}</td>
                  <td className="dh-muted-cell">{p.created_at ? formatDateShort(p.created_at) : "—"}</td>
                  <td><PAStatusBadge status={p.pa_status || "none"} expirationDate={p.pa_expiration_date} /></td>
                  <td className="r" onClick={(e) => e.stopPropagation()}>
                    <span style={{ display: "inline-flex", gap: 8, justifyContent: "flex-end" }}>
                      <Link to={`/clinic/patients/${p.id}`} className="rw-btn outline sm">View</Link>
                      <Link to={`/clinic/referrals/new?patientId=${p.id}`} className="rw-btn primary sm">New Referral</Link>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : search || filter !== "all" ? (
        <div className="dh-empty">
          <div className="dh-empty-ic sm"><Users size={20} /></div>
          <p className="rl-empty-t">No patients found</p>
          <p className="rl-empty-s">Try adjusting your search or filters</p>
          <button className="rw-btn outline sm" onClick={() => { setSearch(""); setFilter("all"); }}>Clear Filters</button>
        </div>
      ) : (
        <div className="dh-empty">
          <div className="dh-empty-ic"><Users size={26} /></div>
          <h3>No patients yet</h3>
          <p>Add your first patient to get started</p>
          <Link to="/clinic/patients/new" className="rw-btn primary" style={{ display: "inline-flex" }}><Plus size={15} />Add Your First Patient</Link>
        </div>
      )}

      {!loading && filtered.length > pageSize && (
        <div className="rl-pag">
          <div className="rl-pag-meta"><span>Showing {startItem}-{endItem} of {filtered.length} patients</span></div>
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
