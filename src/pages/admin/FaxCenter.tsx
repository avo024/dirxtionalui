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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { FilterToolbar } from "@/components/patterns/FilterToolbar";
import { cn } from "@/lib/utils";
import { PageContainer } from "@/components/patterns/PageContainer";

type Tab = "inbound" | "outbound";

const KIND_LABEL: Record<AdminFaxOutboundKind, string> = {
  referral: "Referral",
  appeal: "Appeal",
  enrollment: "Enrollment",
};

const KIND_CLASS: Record<AdminFaxOutboundKind, string> = {
  referral: "bg-primary/10 text-primary",
  appeal: "bg-warning/15 text-[#92610B]",
  enrollment: "bg-teal-600/10 text-teal-700",
};

function KindChip({ kind }: { kind: AdminFaxOutboundKind }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold", KIND_CLASS[kind] || "bg-muted text-muted-foreground")}>
      {KIND_LABEL[kind] || kind}
    </span>
  );
}

function InboundStatusBadge({ status }: { status: AdminFaxInbound["status"] }) {
  const isNew = status === "new";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px]",
        isNew ? "font-bold bg-teal-600/10 text-teal-700" : "font-semibold bg-muted text-muted-foreground",
      )}
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
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold",
        isDelivered ? "bg-success/15 text-success" : isFailed ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground",
      )}
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
      toast({ title: "Linked", description: "It will surface in Waiting on us as \"Review inbound fax\"." });
      setLinkDrafts((d) => ({ ...d, [row.id]: "" }));
      load(); // refetch so the linked patient name comes from the backend
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to link fax to referral", variant: "destructive" });
    } finally {
      setLinkingId(null);
    }
  };

  return (
    <PageContainer>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold font-editorial text-foreground">Fax Center</h1>
        <p className="text-sm text-muted-foreground mt-1">All inbound and outbound fax traffic across referrals, appeals, and enrollments</p>
      </div>

      <div className="mb-4">
        <FilterToolbar
          filters={[
            { value: "inbound", label: "Inbound", count: undefined, alert: inboundNewCount },
            { value: "outbound", label: "Outbound", count: outbound.length },
          ]}
          active={tab}
          onFilter={(v) => setTab(v as Tab)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 width={26} height={26} strokeWidth={1.75} className="animate-spin text-primary" />
        </div>
      ) : tab === "inbound" ? (
        inbound.length > 0 ? (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Pages</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Linked patient</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inbound.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap">{row.from_number || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateShort(row.received_at)}</TableCell>
                    <TableCell className="text-muted-foreground">{row.page_count ?? "—"}</TableCell>
                    <TableCell><InboundStatusBadge status={row.status} /></TableCell>
                    <TableCell>
                      {row.linked_referral_id ? (
                        <Link to={`/admin/referrals/${row.linked_referral_id}`} className="text-primary font-medium hover:underline">
                          {row.linked_patient_name || "View referral"}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        {row.has_pdf && (
                          <Button size="sm" variant="outline" onClick={() => handleViewPDF(row)}>
                            <FileText width={13} height={13} strokeWidth={1.75} /> View PDF
                          </Button>
                        )}
                        {row.status === "new" && (
                          <Button
                            size="sm"
                            className="bg-success text-success-foreground hover:bg-success/90"
                            disabled={reviewingId === row.id}
                            onClick={() => handleMarkReviewed(row)}
                          >
                            {reviewingId === row.id ? <Loader2 width={13} height={13} strokeWidth={1.75} className="animate-spin" /> : <CheckCheck width={13} height={13} strokeWidth={1.75} />}
                            Mark reviewed
                          </Button>
                        )}
                        {!row.linked_referral_id && (
                          <span className="inline-flex items-center gap-1.5">
                            <Input
                              className="h-8 w-32 text-xs"
                              placeholder="Referral ID…"
                              value={linkDrafts[row.id] || ""}
                              onChange={(e) => setLinkDrafts((d) => ({ ...d, [row.id]: e.target.value }))}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={linkingId === row.id || !(linkDrafts[row.id] || "").trim()}
                              onClick={() => handleLink(row)}
                            >
                              {linkingId === row.id ? <Loader2 width={13} height={13} strokeWidth={1.75} className="animate-spin" /> : <Link2 width={13} height={13} strokeWidth={1.75} />}
                            </Button>
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground"><Inbox width={20} height={20} strokeWidth={1.75} /></span>
            <p className="text-sm font-semibold text-foreground">No inbound faxes yet</p>
            <p className="text-sm text-muted-foreground">They'll appear here as they arrive.</p>
          </div>
        )
      ) : outbound.length > 0 ? (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kind</TableHead>
                <TableHead>Counterparty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pages</TableHead>
                <TableHead>Sent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {outbound.map((row) => (
                <TableRow key={row.id}>
                  <TableCell><KindChip kind={row.kind} /></TableCell>
                  <TableCell>
                    {row.referral_id ? (
                      <Link to={`/admin/referrals/${row.referral_id}`} className="inline-flex items-center gap-1 text-primary font-medium hover:underline">
                        {row.counterparty} <ExternalLink width={12} height={12} strokeWidth={1.75} />
                      </Link>
                    ) : (
                      row.counterparty
                    )}
                  </TableCell>
                  <TableCell><OutboundStatusBadge status={row.status} errorDetail={row.error_detail} /></TableCell>
                  <TableCell className="text-muted-foreground">{row.page_count ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateShort(row.at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground"><Send width={20} height={20} strokeWidth={1.75} /></span>
          <p className="text-sm font-semibold text-foreground">No outbound faxes sent yet</p>
          <p className="text-sm text-muted-foreground">Referral, appeal, and enrollment faxes will show up here as they're sent.</p>
        </div>
      )}
    </PageContainer>
  );
}
