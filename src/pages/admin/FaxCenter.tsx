import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Inbox, Send, FileText, ExternalLink, CheckCheck, Link2 } from "lucide-react";
import {
  adminApi,
  type AdminFaxInbound,
  type AdminFaxOutbound,
  type AdminFaxOutboundKind,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { formatDateShort } from "@/lib/dateUtils";
import "../clinic/wizard.css";
import "../clinic/dashboard.css";
import "../clinic/referrals.css";
import "./admin-faxes.css";

type Tab = "inbound" | "outbound";

const KIND_LABEL: Record<AdminFaxOutboundKind, string> = {
  referral: "Referral",
  appeal: "Appeal",
  enrollment: "Enrollment",
};

function KindChip({ kind }: { kind: AdminFaxOutboundKind }) {
  return <span className={`fx-kind ${kind}`}>{KIND_LABEL[kind] || kind}</span>;
}

function InboundStatusBadge({ status }: { status: AdminFaxInbound["status"] }) {
  const isNew = status === "new";
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", fontSize: 11, fontWeight: isNew ? 700 : 600,
        padding: "2px 9px", borderRadius: 9999,
        color: isNew ? "var(--color-teal-700)" : "var(--text-muted)",
        background: isNew ? "var(--color-teal-50)" : "var(--bg-muted)",
      }}
    >
      {isNew ? "New" : "Reviewed"}
    </span>
  );
}

function OutboundStatusBadge({ status, errorDetail }: { status: string; errorDetail?: string | null }) {
  const s = (status || "").toLowerCase();
  const isDelivered = s === "delivered";
  const isFailed = s === "failed";
  return (
    <span
      title={isFailed ? errorDetail || "Fax failed" : undefined}
      style={{
        display: "inline-flex", alignItems: "center", fontSize: 11, fontWeight: 700,
        padding: "2px 9px", borderRadius: 9999,
        color: isDelivered ? "var(--status-approved-fg)" : isFailed ? "var(--status-rejected-fg, #b91c1c)" : "var(--text-muted)",
        background: isDelivered ? "var(--status-approved-bg)" : isFailed ? "var(--status-rejected-bg, #fee2e2)" : "var(--bg-muted)",
      }}
    >
      {status ? status.replace(/_/g, " ") : "—"}
    </span>
  );
}

export default function FaxCenter() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("inbound");
  const [loading, setLoading] = useState(true);
  const [inbound, setInbound] = useState<AdminFaxInbound[]>([]);
  const [outbound, setOutbound] = useState<AdminFaxOutbound[]>([]);
  const [inboundNewCount, setInboundNewCount] = useState(0);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [linkDrafts, setLinkDrafts] = useState<Record<string, string>>({});

  const load = () => {
    setLoading(true);
    adminApi.getFaxes()
      .then((res) => {
        setInbound(res.inbound || []);
        setOutbound(res.outbound || []);
        setInboundNewCount(res.inbound_new_count || 0);
      })
      .catch((e: any) => toast({ title: "Error", description: e.message || "Failed to load fax traffic", variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleViewPDF = async (row: AdminFaxInbound) => {
    try {
      const blob = await adminApi.getInboundFaxPDF(row.id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to open fax PDF", variant: "destructive" });
    }
  };

  const handleMarkReviewed = async (row: AdminFaxInbound) => {
    const reviewedBy = user?.name || user?.email || "Admin";
    const prevInbound = inbound;
    const prevCount = inboundNewCount;

    // Optimistic update
    setInbound((items) => items.map((r) => (r.id === row.id ? { ...r, status: "reviewed", reviewed_by: reviewedBy } : r)));
    if (row.status === "new") setInboundNewCount((n) => Math.max(0, n - 1));
    setReviewingId(row.id);

    try {
      await adminApi.reviewInboundFax(row.id, reviewedBy);
    } catch (err: any) {
      setInbound(prevInbound);
      setInboundNewCount(prevCount);
      toast({ title: "Error", description: err.message || "Failed to mark fax reviewed", variant: "destructive" });
    } finally {
      setReviewingId(null);
    }
  };

  const handleLink = async (row: AdminFaxInbound) => {
    const referralId = (linkDrafts[row.id] || "").trim();
    if (!referralId) return;
    setLinkingId(row.id);
    try {
      await adminApi.linkInboundFax(row.id, referralId);
      toast({ title: "Linked", description: "Fax linked to referral." });
      setLinkDrafts((d) => ({ ...d, [row.id]: "" }));
      load(); // refetch so the linked patient name comes from the backend
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to link fax to referral", variant: "destructive" });
    } finally {
      setLinkingId(null);
    }
  };

  return (
    <div className="rw-page rl-page rw-fade">
      <div className="rl-header">
        <div>
          <h1 className="rl-h1 serif">Fax Center</h1>
          <p className="rl-sub">All inbound and outbound fax traffic across referrals, appeals, and enrollments</p>
        </div>
      </div>

      <div className="rl-toolbar fx-toolbar">
        <div className="rl-seg">
          <button className={`rl-seg-btn${tab === "inbound" ? " on" : ""}`} onClick={() => setTab("inbound")}>
            <Inbox size={14} /> Inbound
            {inboundNewCount > 0 && <span className="rl-seg-n num">{inboundNewCount}</span>}
          </button>
          <button className={`rl-seg-btn${tab === "outbound" ? " on" : ""}`} onClick={() => setTab("outbound")}>
            <Send size={14} /> Outbound
            <span className="rl-seg-n num">{outbound.length}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
          <span className="rw-spin" style={{ color: "var(--color-teal)" }}><Loader2 size={26} /></span>
        </div>
      ) : tab === "inbound" ? (
        inbound.length > 0 ? (
          <div className="dh-table-wrap fx-table-wrap">
            <table className="dh-table fx-table">
              <thead>
                <tr>
                  <th>From</th>
                  <th>Received</th>
                  <th>Pages</th>
                  <th>Status</th>
                  <th>Linked patient</th>
                  <th className="r"></th>
                </tr>
              </thead>
              <tbody>
                {inbound.map((row) => (
                  <tr key={row.id}>
                    <td className="fx-nowrap">{row.from_number || "—"}</td>
                    <td className="fx-nowrap">{formatDateShort(row.received_at)}</td>
                    <td>{row.page_count ?? "—"}</td>
                    <td><InboundStatusBadge status={row.status} /></td>
                    <td>
                      {row.linked_referral_id ? (
                        <Link to={`/admin/referrals/${row.linked_referral_id}`} className="fx-referral-link">
                          {row.linked_patient_name || "View referral"}
                        </Link>
                      ) : (
                        <span style={{ opacity: 0.45 }}>—</span>
                      )}
                    </td>
                    <td className="r">
                      <div className="fx-row-actions">
                        {row.has_pdf && (
                          <button className="rw-btn outline sm" onClick={() => handleViewPDF(row)}>
                            <FileText size={13} /> View PDF
                          </button>
                        )}
                        {row.status === "new" && (
                          <button
                            className="rw-btn success sm"
                            disabled={reviewingId === row.id}
                            onClick={() => handleMarkReviewed(row)}
                          >
                            {reviewingId === row.id ? <Loader2 size={13} className="rw-spin" /> : <CheckCheck size={13} />}
                            Mark reviewed
                          </button>
                        )}
                        {!row.linked_referral_id && (
                          <span className="fx-link-form">
                            <input
                              className="fx-link-input"
                              placeholder="Referral ID…"
                              value={linkDrafts[row.id] || ""}
                              onChange={(e) => setLinkDrafts((d) => ({ ...d, [row.id]: e.target.value }))}
                            />
                            <button
                              className="rw-btn outline sm"
                              disabled={linkingId === row.id || !(linkDrafts[row.id] || "").trim()}
                              onClick={() => handleLink(row)}
                            >
                              {linkingId === row.id ? <Loader2 size={13} className="rw-spin" /> : <Link2 size={13} />}
                            </button>
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="dh-empty">
            <div className="dh-empty-ic sm"><Inbox size={20} /></div>
            <p className="rl-empty-t">No inbound faxes yet</p>
            <p className="rl-empty-s">They'll appear here as they arrive.</p>
          </div>
        )
      ) : outbound.length > 0 ? (
        <div className="dh-table-wrap fx-table-wrap">
          <table className="dh-table fx-table">
            <thead>
              <tr>
                <th>Kind</th>
                <th>Counterparty</th>
                <th>Status</th>
                <th>Pages</th>
                <th>Sent</th>
              </tr>
            </thead>
            <tbody>
              {outbound.map((row) => (
                <tr key={row.id}>
                  <td><KindChip kind={row.kind} /></td>
                  <td className="fx-counterparty">
                    {row.referral_id ? (
                      <Link to={`/admin/referrals/${row.referral_id}`} className="fx-referral-link">
                        {row.counterparty} <ExternalLink size={12} />
                      </Link>
                    ) : (
                      row.counterparty
                    )}
                  </td>
                  <td><OutboundStatusBadge status={row.status} errorDetail={row.error_detail} /></td>
                  <td>{row.page_count ?? "—"}</td>
                  <td className="fx-nowrap">{formatDateShort(row.at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="dh-empty">
          <div className="dh-empty-ic sm"><Send size={20} /></div>
          <p className="rl-empty-t">No outbound faxes sent yet</p>
          <p className="rl-empty-s">Referral, appeal, and enrollment faxes will show up here as they're sent.</p>
        </div>
      )}
    </div>
  );
}
