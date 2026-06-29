import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, LifeBuoy, MessageSquareHeart, ChevronRight, Inbox, CalendarDays } from "lucide-react";
import { adminApi, type SupportCaseSummary } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { getRelativeTime } from "@/lib/dateUtils";
import { SupportStatusBadge } from "@/components/SupportStatusBadge";
import "../clinic/wizard.css";
import "../clinic/dashboard.css";
import "../clinic/referrals.css";
import "./admin-support.css";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
];
const CAT_TABS = [
  { value: "all", label: "All" },
  { value: "support", label: "Support" },
  { value: "feedback", label: "Feedback" },
];

function monthValue(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthOptions() {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString("default", { month: "long", year: "numeric" });
    opts.push({ value: monthValue(d), label: i === 0 ? `${label} · this month` : label });
  }
  opts.push({ value: "all", label: "All time" });
  return opts;
}
const CURRENT_MONTH = monthValue(new Date());

function CategoryChip({ category }: { category: string }) {
  const isFeedback = category === "feedback";
  return (
    <span className={`as-cat ${category}`}>
      <span className="ci">{isFeedback ? <MessageSquareHeart size={12} /> : <LifeBuoy size={12} />}</span>
      {isFeedback ? "Feedback" : "Support"}
    </span>
  );
}

export default function AdminSupportList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<SupportCaseSummary[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    const fetchCases = async () => {
      setLoading(true);
      try {
        const res = await adminApi.getSupportCases({
          status: status === "all" ? undefined : status,
          category: category === "all" ? undefined : category,
          month,
          search: search.trim() || undefined,
        });
        if (!cancelled) { setItems(res.items || []); setCounts(res.counts || {}); }
      } catch (e: any) {
        if (!cancelled) toast({ title: "Error", description: e.message || "Failed to load support cases", variant: "destructive" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const t = setTimeout(fetchCases, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [status, category, month, search]);

  const months = useMemo(monthOptions, []);
  const totalCount = (counts.open || 0) + (counts.in_progress || 0) + (counts.resolved || 0);
  const chipCount = (v: string) => (v === "all" ? totalCount : counts[v] || 0);

  return (
    <div className="rw-page rl-page rw-fade">
      <div className="rl-header">
        <div>
          <h1 className="rl-h1 serif">Support</h1>
          <p className="rl-sub">Clinic support cases and product feedback</p>
        </div>
      </div>

      <div className="rl-toolbar as-toolbar">
        <div className="rl-seg">
          {STATUS_FILTERS.map((f) => (
            <button key={f.value} className={`rl-seg-btn${status === f.value ? " on" : ""}`} onClick={() => setStatus(f.value)}>
              {f.label}<span className="rl-seg-n num">{chipCount(f.value)}</span>
            </button>
          ))}
        </div>
        <div className="rl-seg">
          {CAT_TABS.map((t) => (
            <button key={t.value} className={`rl-seg-btn${category === t.value ? " on" : ""}`} onClick={() => setCategory(t.value)}>{t.label}</button>
          ))}
        </div>
      </div>

      <div className="rl-toolbar" style={{ marginTop: -4 }}>
        <div className="rl-search">
          <span className="rl-search-ic"><Search size={16} /></span>
          <input className="rl-search-input" placeholder="Search by clinic or subject (all time)…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="rl-statusdd">
          <CalendarDays size={15} />
          <select className="rl-select" value={month} onChange={(e) => setMonth(e.target.value)} disabled={!!search.trim()}>
            {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
          <span className="rw-spin" style={{ color: "var(--color-teal)" }}><Loader2 size={26} /></span>
        </div>
      ) : items.length > 0 ? (
        <div className="dh-table-wrap as-table-wrap">
          <table className="dh-table as-table">
            <thead>
              <tr><th>Clinic</th><th>Subject</th><th>Category</th><th>Status</th><th>Last activity</th><th className="r"></th></tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} onClick={() => navigate(`/admin/support/${c.id}`)}>
                  <td className="as-clinic">
                    <span className="as-clinic-wrap">
                      {c.needs_reply && <span className="as-reply-dot" title="Needs reply — clinic spoke last" />}
                      <span className="as-clinic-nm">{c.clinic_name}</span>
                    </span>
                  </td>
                  <td>
                    <div className="as-subject" title={c.subject}>{c.subject}</div>
                    <span className="as-id">#{c.short_id}</span>
                  </td>
                  <td><CategoryChip category={c.category} /></td>
                  <td><SupportStatusBadge status={c.status} /></td>
                  <td className="as-activity">{getRelativeTime(c.last_message_at || c.updated_at)}</td>
                  <td className="r"><span className="as-open-cta"><ChevronRight size={16} /></span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="dh-empty">
          <div className="dh-empty-ic sm"><Inbox size={20} /></div>
          <p className="rl-empty-t">No cases here</p>
          <p className="rl-empty-s">Nothing matches these filters. When a clinic opens a case or sends feedback, it lands here.</p>
        </div>
      )}
    </div>
  );
}
