import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, LifeBuoy, MessageSquareHeart, ChevronRight, Inbox, AlertTriangle } from "lucide-react";
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
  { value: "delivery_issue", label: "Delivery" },
];


function CategoryChip({ category }: { category: string }) {
  if (category === "delivery_issue") {
    return (
      <span className="as-cat delivery_issue">
        <span className="ci"><AlertTriangle size={12} /></span>Delivery issue
      </span>
    );
  }
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
  const [status, setStatus] = useState("open");  // land on incoming — the claim queue
  const [category, setCategory] = useState("all");
  const [assigned, setAssigned] = useState("all");
  const month = "all";  // month control removed at pilot volume — search + status tabs suffice
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
          assigned: assigned === "all" ? undefined : assigned,
        });
        if (!cancelled) {
          const items: SupportCaseSummary[] = res.items || [];
          // Triage order: unclaimed first (grab-me), then by recency.
          items.sort((a, b) => Number(!!a.assigned_admin_id) - Number(!!b.assigned_admin_id));
          setItems(items);
          setCounts(res.counts || {});
        }
      } catch (e: any) {
        if (!cancelled) toast({ title: "Error", description: e.message || "Failed to load support cases", variant: "destructive" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const t = setTimeout(fetchCases, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [status, category, search, assigned]);

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
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div className="rl-seg">
            {[{ value: "all", label: "Everyone" }, { value: "me", label: "Mine" }, { value: "unassigned", label: "Unclaimed" }].map((t) => (
              <button key={t.value} className={`rl-seg-btn${assigned === t.value ? " on" : ""}`} onClick={() => setAssigned(t.value)}>{t.label}</button>
            ))}
          </div>
          <select className="rl-select" style={{ border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", height: 38, padding: "0 10px", background: "#fff" }}
            value={category} onChange={(e) => setCategory(e.target.value)}>
            {CAT_TABS.map((t) => <option key={t.value} value={t.value}>{t.value === "all" ? "All categories" : t.label}</option>)}
          </select>
        </div>
      </div>

      <div className="rl-toolbar" style={{ marginTop: 2, gap: 12 }}>
        <div className="rl-search">
          <span className="rl-search-ic"><Search size={16} /></span>
          <input className="rl-search-input" placeholder="Search by clinic or subject (all time)…" value={search} onChange={(e) => setSearch(e.target.value)} />
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
              <tr><th>Clinic</th><th>Subject</th><th>Category</th><th>Status</th><th>Assigned</th><th>Last activity</th><th className="r"></th></tr>
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
                    {c.referral_id && (
                      <span className="as-id" style={{ color: "var(--color-teal-700)", fontWeight: 600 }}> · Ref #{c.referral_short}</span>
                    )}
                  </td>
                  <td><CategoryChip category={c.category} /></td>
                  <td><SupportStatusBadge status={c.status} /></td>
                  <td className="as-activity">{c.assigned_admin_name || <span style={{ opacity: 0.45 }}>—</span>}</td>
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
