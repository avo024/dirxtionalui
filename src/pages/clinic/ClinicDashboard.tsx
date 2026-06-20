import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Clock, XCircle, Plus, CalendarDays, FileSearch, AlertTriangle, ArrowRight, Send,
  ChevronDown, Eye, Store,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { ClinicPABadge } from "@/components/ClinicPABadge";
import { CreatedByAvatar } from "@/components/CreatedByAvatar";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import { clinicApi, getMyClinic } from "@/lib/api";
import { ClinicSettingsModal } from "@/components/ClinicSettingsModal";
import { mapReferralsFromBackend } from "@/lib/dataMapper";
import { getGreeting, getFormattedDate, formatDateShort } from "@/lib/dateUtils";
import "./wizard.css";
import "./dashboard.css";

type Tone = "warning" | "primary" | "destructive";
const TONE_STYLE: Record<Tone, { fg: string; bg: string }> = {
  warning: { fg: "var(--color-warning)", bg: "color-mix(in srgb, var(--color-warning) 12%, transparent)" },
  primary: { fg: "var(--color-navy)", bg: "color-mix(in srgb, var(--color-navy) 10%, transparent)" },
  destructive: { fg: "var(--color-error)", bg: "color-mix(in srgb, var(--color-error) 10%, transparent)" },
};
function StatIcon({ tone, icon: Icon, size = 18 }: { tone: Tone; icon: any; size?: number }) {
  const t = TONE_STYLE[tone];
  return <span className="dh-stat-ic" style={{ background: t.bg, color: t.fg }}><Icon size={size} /></span>;
}

export default function ClinicDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [referrals, setReferrals] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertsOpen, setAlertsOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { data: clinic } = useQuery({ queryKey: ["my-clinic"], queryFn: getMyClinic });
  const needsDefaultPharmacy = !!clinic && !clinic.default_pharmacy_id;

  useEffect(() => {
    const fetchData = () => {
      Promise.all([clinicApi.getReferrals(), clinicApi.getPatients()])
        .then(([refData, patData]) => {
          setReferrals(mapReferralsFromBackend(refData.items || []));
          setPatients(patData.items || []);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    };
    fetchData();
    const handleFocus = () => fetchData();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [location.key]);

  const processingCount = referrals.filter((r) => ["processing", "ready_for_review", "uploaded"].includes(r.status)).length;
  const sentCount = referrals.filter((r) => ["approved_to_send", "sent_to_pharmacy"].includes(r.status)).length;
  const needsAttentionCount = referrals.filter((r) => r.status === "rejected").length;

  const isExpiringSoon = (p: any) => {
    if (!p.pa_expiration_date) return false;
    const days = Math.ceil((new Date(p.pa_expiration_date).getTime() - Date.now()) / 86400000);
    return days <= 30 && days > 0;
  };
  const patientsExpiringPA = patients.filter(isExpiringSoon);
  const paExpiringSoonCount = patientsExpiringPA.length;
  const rejectedReferrals = referrals.filter((r) => r.status === "rejected");

  const urgencyOrder: Record<string, number> = { rejected: 0, needs_info: 1, ready_for_review: 2, processing: 3, approved_to_send: 4, uploaded: 5 };
  const sortedRecentReferrals = [...referrals].sort((a, b) => (urgencyOrder[a.status] ?? 99) - (urgencyOrder[b.status] ?? 99)).slice(0, 5);

  const STAT: Record<string, any> = {
    in_review: { label: "In Review", value: processingCount, icon: Clock, tone: "warning", sub: "Being reviewed", link: "/clinic/referrals?filter=in_review" },
    sent: { label: "Sent to Pharmacy", value: sentCount, icon: Send, tone: "primary", sub: "At pharmacy", link: "/clinic/referrals?filter=sent_to_pharmacy" },
    attention: { label: "Needs Attention", value: needsAttentionCount, icon: XCircle, tone: "destructive", sub: "Action required", link: "/clinic/referrals?filter=rejected" },
    expiring: { label: "PA Expiring Soon", value: paExpiringSoonCount, icon: AlertTriangle, tone: "warning", sub: "Within 30 days", link: "/clinic/patients?filter=expiring" },
  };
  const actionStats = [STAT.attention, STAT.expiring]; // needs-first: red before amber
  const mutedStats = [STAT.in_review, STAT.sent];
  const alertCount = (paExpiringSoonCount > 0 ? 1 : 0) + rejectedReferrals.length;

  const patientName = (p: any) => p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim();

  return (
    <div className="rw-page dh-page rw-fade">
      {/* Header */}
      <div className="dh-header">
        <div className="dh-greet">
          <h1 className="dh-h1 serif">{getGreeting()}, {user?.clinic_name}</h1>
          <p className="dh-sub">Here's what's happening with your referrals today</p>
        </div>
        <div className="dh-header-right">
          <NotificationBell referrals={referrals} noteField="latest_admin_note_at" actionStatus="rejected" linkBase="/clinic/referrals" />
          <div className="dh-date"><CalendarDays size={15} /><span>{getFormattedDate()}</span></div>
          <Link to="/clinic/referrals/new" className="rw-btn primary"><Plus size={15} />New Referral</Link>
        </div>
      </div>

      {needsDefaultPharmacy && (
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", marginBottom: 18, borderRadius: "var(--radius-lg)", border: "1px solid var(--color-teal-100)", background: "var(--color-teal-50)" }}>
          <span style={{ flexShrink: 0, width: 38, height: 38, borderRadius: "var(--radius-md)", background: "#fff", border: "1px solid var(--color-teal-100)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--color-teal-700)" }}><Store size={18} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Set your default pharmacy</p>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", margin: "2px 0 0" }}>Pick the pharmacy your referrals should default to — you can change it any time in Clinic Settings.</p>
          </div>
          <button className="rw-btn primary sm" onClick={() => setSettingsOpen(true)} style={{ flexShrink: 0 }}><Store size={14} />Set pharmacy</button>
        </div>
      )}

      {/* Stats — action-split */}
      {loading ? (
        <div className="dh-split">
          <div className="dh-split-action"><div className="dh-skel" style={{ height: 86 }} /><div className="dh-skel" style={{ height: 86 }} /></div>
          <div className="dh-split-muted"><div className="dh-skel" style={{ height: 36 }} /><div className="dh-skel" style={{ height: 36 }} /></div>
        </div>
      ) : (
        <div className="dh-split">
          <div className="dh-split-action">
            {actionStats.map((s) => (
              <Link key={s.label} to={s.link} className={`dh-action-card ${s.tone}`}>
                <StatIcon tone={s.tone} icon={s.icon} size={20} />
                <div className="dh-action-meta">
                  <div className="dh-action-head"><span className="dh-action-val num">{s.value}</span><span className="dh-action-lbl">{s.label}</span></div>
                  <span className="dh-action-sub">{s.sub}</span>
                </div>
                <span className="dh-action-arrow"><ArrowRight size={16} /></span>
              </Link>
            ))}
          </div>
          <div className="dh-split-muted">
            {mutedStats.map((s) => (
              <Link key={s.label} to={s.link} className="dh-muted-card">
                <div className="dh-muted-top"><span className="dh-muted-lbl">{s.label}</span><StatIcon tone={s.tone} icon={s.icon} size={15} /></div>
                <span className="dh-muted-val num">{s.value}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Alerts — collapsible, red first */}
      {!loading && alertCount > 0 && (
        <div className={`dh-collapse${alertsOpen ? " open" : ""}`}>
          <button className="dh-collapse-trig" onClick={() => setAlertsOpen((o) => !o)}>
            <span className="dh-collapse-ic"><AlertTriangle size={16} /></span>
            <span className="dh-collapse-t">Needs attention <span className="dh-collapse-n">{alertCount}</span></span>
            <span className="dh-collapse-peek">{rejectedReferrals.length} rejected · {paExpiringSoonCount} PA expiring</span>
            <span className="dh-collapse-chev"><ChevronDown size={16} /></span>
          </button>
          {alertsOpen && (
            <div className="dh-collapse-body">
              {rejectedReferrals.map((ref) => (
                <Link key={ref.id} to={`/clinic/referrals/${ref.id}`} className="dh-alert dest">
                  <span className="dh-alert-ic"><XCircle size={16} /></span>
                  <div className="dh-alert-body">
                    <p className="dh-alert-t">{ref.patient_name} — Needs Attention</p>
                    <p className="dh-alert-s">{ref.drug_requested || ref.drug || "—"} · {ref.rejection_reason ? ref.rejection_reason.slice(0, 80) + "..." : "Review required"}</p>
                  </div>
                  <span className="dh-alert-arrow"><ArrowRight size={16} /></span>
                </Link>
              ))}
              {patientsExpiringPA.length > 0 && (
                <Link to="/clinic/patients?filter=expiring" className="dh-alert warn">
                  <span className="dh-alert-ic"><AlertTriangle size={16} /></span>
                  <div className="dh-alert-body">
                    <p className="dh-alert-t">{patientsExpiringPA.length} patient{patientsExpiringPA.length > 1 ? "s" : ""} with PA expiring in the next 30 days</p>
                    <p className="dh-alert-s">{patientsExpiringPA.map(patientName).join(", ")}</p>
                  </div>
                  <span className="dh-alert-arrow"><ArrowRight size={16} /></span>
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {/* Recent referrals */}
      {loading ? (
        <div><div className="dh-skel" style={{ height: 24, width: 160, marginBottom: 14 }} /><div className="dh-skel" style={{ height: 200 }} /></div>
      ) : referrals.length > 0 ? (
        <div>
          <div className="dh-sec-head">
            <h2>Recent Referrals</h2>
            <Link to="/clinic/referrals" className="dh-viewall">View All →</Link>
          </div>
          <div className="dh-table-wrap">
            <table className="dh-table">
              <thead>
                <tr><th>ID</th><th>Patient Name</th><th>Drug</th><th>Status</th><th>PA Status</th><th>Created</th><th>Updated</th><th className="r">Actions</th><th></th></tr>
              </thead>
              <tbody>
                {sortedRecentReferrals.map((r) => (
                  <tr key={r.id} onClick={() => navigate(`/clinic/referrals/${r.id}`)}>
                    <td><span className="dh-id">{(r.id || "").toUpperCase()}</span></td>
                    <td><span className="dh-pt"><span className="dh-pt-nm">{r.patient_name}</span></span></td>
                    <td>{r.drug || r.drug_requested || "—"}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td><ClinicPABadge status={r.pa_status} /></td>
                    <td className="dh-muted-cell">{r.created_at ? formatDateShort(r.created_at) : "—"}</td>
                    <td className="dh-muted-cell">{r.updated_at ? formatDateShort(r.updated_at) : "—"}</td>
                    <td className="r" onClick={(e) => e.stopPropagation()}>
                      <Link to={`/clinic/referrals/${r.id}`} className="rw-btn outline sm"><Eye size={14} />View</Link>
                    </td>
                    <td><CreatedByAvatar name={r.created_by_name} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="dh-empty">
          <div className="dh-empty-ic"><FileSearch size={26} /></div>
          <h3>No referrals yet</h3>
          <p>Create your first referral to get started</p>
          <Link to="/clinic/referrals/new" className="rw-btn primary" style={{ display: "inline-flex" }}><Plus size={15} />New Referral</Link>
        </div>
      )}
      <ClinicSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
