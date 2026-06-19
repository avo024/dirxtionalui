import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Pencil, Power, MapPin, Mail, Phone, Printer, PhoneCall, UserRound, Ban, ShieldOff,
} from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { PharmacyFormModal } from "@/components/PharmacyFormModal";
import { getInitials } from "@/components/CreatedByAvatar";
import { pharmacyApi } from "@/lib/api";
import { toast } from "sonner";
import "../clinic/wizard.css";
import "../clinic/dashboard.css";
import "./admin-clinics.css";
import "./admin-pharmacies.css";

function formatPhone(value: string | null): string {
  if (!value) return "—";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return value;
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", fontSize: 11, fontWeight: 700,
        padding: "2px 9px", borderRadius: 9999,
        color: active ? "var(--status-approved-fg)" : "var(--text-muted)",
        background: active ? "var(--status-approved-bg)" : "var(--bg-muted)",
      }}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function IconRow({ icon: Icon, label, value, mono }: { icon: any; label: string; value: string; mono?: boolean }) {
  return (
    <div className="cl-d-kv">
      <span className="cl-d-kv-ic"><Icon size={15} /></span>
      <div>
        <div className="cl-d-kv-lbl">{label}</div>
        <div className={`cl-d-kv-val${mono ? " mono" : ""}`}>{value}</div>
      </div>
    </div>
  );
}

export default function PharmacyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  const { data: pharmacy, isLoading, isError } = useQuery({
    queryKey: ["pharmacy", id],
    queryFn: () => pharmacyApi.getPharmacy(id!),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => pharmacyApi.deletePharmacy(id!),
    onSuccess: () => {
      toast.success("Pharmacy deactivated");
      queryClient.invalidateQueries({ queryKey: ["pharmacies"] });
      navigate("/admin/pharmacies");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to deactivate pharmacy"),
  });

  if (isLoading) {
    return (
      <div className="rw-page rw-fade">
        <div className="cl-skel">
          {[0, 1, 2, 3].map((i) => <div key={i} className="cl-skel-row" />)}
        </div>
      </div>
    );
  }

  if (isError || !pharmacy) {
    return (
      <div className="rw-page rw-fade">
        <div className="dh-empty">
          <div className="dh-empty-ic cl-error-ic"><ShieldOff size={24} /></div>
          <h3>Pharmacy not found</h3>
          <p>We couldn’t load this pharmacy.</p>
          <button className="rw-btn primary" onClick={() => navigate("/admin/pharmacies")}>Back to pharmacies</button>
        </div>
      </div>
    );
  }

  const p = pharmacy;
  const fullAddress = [p.address, p.city, p.state, p.zip].filter(Boolean).join(", ") || "—";
  const secondary = [p.contact_email, p.contact_phone ? formatPhone(p.contact_phone) : null].filter(Boolean).join(" · ") || "—";

  const FIELDS = [
    { icon: MapPin, label: "Address", value: fullAddress },
    { icon: Mail, label: "Email", value: p.email || "—" },
    { icon: Phone, label: "Phone", value: formatPhone(p.phone), mono: true },
    { icon: Printer, label: "Fax", value: formatPhone(p.fax), mono: true },
    { icon: PhoneCall, label: "Alt Phone / Fax", value: p.alt_phone_fax || "—", mono: true },
    { icon: UserRound, label: "Secondary Contact", value: secondary },
  ];

  return (
    <div className="rw-page rw-fade">
      <button className="cl-back" onClick={() => navigate("/admin/pharmacies")}>
        <ArrowLeft size={16} />All pharmacies
      </button>

      {/* Header */}
      <div className={`cl-d-header ph-d-header${!p.is_active ? " inactive" : ""}`}>
        <span className="dh-avatar cl-d-avatar">{getInitials(p.name)}</span>
        <div className="cl-d-head-meta">
          <div className="cl-d-title-row">
            <h1 className="cl-d-title">{p.name}</h1>
            <StatusPill active={p.is_active} />
            {p.accepts_no_insurance && (
              <span className="ph-badge-noins"><ShieldOff size={12} />Accepts no insurance</span>
            )}
          </div>
          {p.city && <p className="cl-d-sub">{[p.city, p.state].filter(Boolean).join(", ")}</p>}
        </div>
        <div className="ph-d-actions">
          <button className="rw-btn outline" onClick={() => setEditOpen(true)}><Pencil size={15} />Edit</button>
          <button className="rw-btn outline ph-d-deact" disabled={!p.is_active} onClick={() => setDeactivateOpen(true)}>
            <Power size={15} />Deactivate
          </button>
        </div>
      </div>

      <div className="cl-d-stack">
        {/* Details */}
        <div className="cl-card-plain">
          <div className="cl-panel-head"><h3>Pharmacy details</h3></div>
          <div className="cl-d-kvs ph-d-kvs">
            {FIELDS.map((f) => <IconRow key={f.label} icon={f.icon} label={f.label} value={f.value} mono={f.mono} />)}
          </div>
        </div>

        {/* Blocked medications */}
        <div className="cl-card-plain">
          <div className="cl-panel-head">
            <h3>Blocked Medications</h3>
            <span className="cl-panel-sub">{p.blocked_medications.length} blocked</span>
          </div>
          <div className="ph-blocked">
            {p.blocked_medications.length > 0 ? (
              <div className="ph-blocked-list">
                {p.blocked_medications.map((m) => (
                  <span key={m} className="ph-blocked-chip"><Ban size={12} />{m}</span>
                ))}
              </div>
            ) : (
              <p className="ph-blocked-empty">No blocked medications — this pharmacy can receive referrals for any drug.</p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="cl-card-plain">
          <div className="cl-panel-head"><h3>Notes</h3></div>
          <div className="ph-notes">
            {p.notes ? <p>{p.notes}</p> : <p className="ph-notes-empty">No notes for this pharmacy.</p>}
          </div>
        </div>
      </div>

      <PharmacyFormModal open={editOpen} onOpenChange={setEditOpen} pharmacy={p} />

      <ConfirmModal
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        title="Deactivate pharmacy?"
        description={`Deactivate ${p.name}? They won't appear in new referrals.`}
        confirmLabel="Deactivate"
        variant="destructive"
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}
