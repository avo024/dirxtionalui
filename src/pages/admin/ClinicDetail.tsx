import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Pencil, Mail, Phone, Printer, Stethoscope, MapPin, Hash,
  Plus, Copy, Trash2, MailPlus, Clock, TriangleAlert,
} from "lucide-react";
import { ClinicFormModal } from "@/components/ClinicFormModal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { getInitials } from "@/components/CreatedByAvatar";
import { adminApi, type AdminClinic, type AdminInvite } from "@/lib/api";
import { formatDateForTable } from "@/lib/dateUtils";
import { toast } from "sonner";
import "../clinic/wizard.css";
import "../clinic/dashboard.css";
import "./admin-clinics.css";

const INVITE_BASE_URL = "https://app.dirxctional.com/invite";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isExpiringSoon(expiresAt: string): boolean {
  try {
    const ms = new Date(expiresAt).getTime() - Date.now();
    return ms > 0 && ms < 48 * 60 * 60 * 1000;
  } catch { return false; }
}

function isPending(iv: AdminInvite): boolean {
  if (iv.used_at || iv.revoked_at) return false;
  try { return new Date(iv.expires_at).getTime() > Date.now(); } catch { return true; }
}

function DetailKV({ icon: Icon, label, value, mono }: { icon: any; label: string; value: string; mono?: boolean }) {
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

/* Team & Invites — folded in from the retired AdminInvites page.
   Clinic is implied by the page, so there is NO clinic picker and NO clinic column. */
function TeamInvitesPanel({ clinic }: { clinic: AdminClinic }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<AdminInvite | null>(null);

  const { data } = useQuery({
    queryKey: ["admin", "invites"],
    queryFn: () => adminApi.listInvites(),
  });
  const invites = (data?.items ?? []).filter((iv) => iv.clinic_id === clinic.id && isPending(iv));

  const valid = EMAIL_RE.test(email.trim());

  const createMut = useMutation({
    mutationFn: (addr: string) => adminApi.createInvite({ clinic_id: clinic.id, email: addr }),
    onSuccess: (_d, addr) => {
      toast.success(`Invite sent to ${addr}`);
      setEmail(""); setTouched(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "invites"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to send invite"),
  });

  const resendMut = useMutation({
    mutationFn: (token: string) => adminApi.resendInvite(token),
    onSuccess: () => toast.success("Invite email resent"),
    onError: (e: any) => toast.error(e?.message || "Failed to resend"),
  });

  const revokeMut = useMutation({
    mutationFn: (token: string) => adminApi.revokeInvite(token),
    onSuccess: () => {
      toast.success("Invite revoked");
      queryClient.invalidateQueries({ queryKey: ["admin", "invites"] });
      setRevokeTarget(null);
    },
    onError: (e: any) => toast.error(e?.message || "Failed to revoke"),
  });

  const submit = () => {
    if (!valid) { setTouched(true); return; }
    createMut.mutate(email.trim());
  };

  const copyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(`${INVITE_BASE_URL}/${token}`);
      toast.success("Link copied");
    } catch { toast.error("Failed to copy link"); }
  };

  return (
    <div className="cl-panel cl-team">
      <div className="cl-panel-head">
        <h3>Team &amp; Invites</h3>
        <span className="cl-panel-sub">{invites.length} pending</span>
      </div>

      {/* Invite a member */}
      <div className="cl-invite-form">
        <div className="cl-invite-row">
          <div className={`cl-invite-input${touched && !valid ? " err" : ""}`}>
            <span className="cl-invite-input-ic"><Mail size={16} /></span>
            <input
              className="cl-invite-field"
              type="email"
              placeholder="teammate@clinic.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            />
          </div>
          <button className="rw-btn primary" onClick={submit} disabled={createMut.isPending}>
            <Plus size={15} />Invite member
          </button>
        </div>
        {touched && !valid && <p className="cl-invite-hint">Enter a valid email address.</p>}
        <p className="cl-invite-note">Sends an invitation to join <strong>{clinic.name}</strong> on DiRxctional.</p>
      </div>

      {/* Pending invites */}
      <div className="cl-invite-pending">
        <div className="cl-subhead">Pending invites</div>
        {invites.length === 0 ? (
          <div className="cl-invite-empty">
            <span className="cl-invite-empty-ic"><MailPlus size={18} /></span>
            No pending invites — invite a teammate above.
          </div>
        ) : (
          <div className="cl-invite-table-wrap">
            <table className="dh-table cl-invite-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Sent</th>
                  <th>Expires</th>
                  <th className="r">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((iv) => {
                  const soon = isExpiringSoon(iv.expires_at);
                  return (
                    <tr key={iv.token}>
                      <td><span className="cl-invite-email">{iv.email}</span></td>
                      <td className="dh-muted-cell">{formatDateForTable(iv.created_at)}</td>
                      <td>
                        <span className={`cl-invite-exp${soon ? " soon" : ""}`}>
                          {soon && <Clock size={12} />}
                          {formatDateForTable(iv.expires_at)}
                        </span>
                      </td>
                      <td className="r">
                        <div className="cl-invite-acts">
                          <button className="rw-ic-btn" title="Copy link" aria-label="Copy invite link" onClick={() => copyLink(iv.token)}><Copy size={15} /></button>
                          <button className="rw-ic-btn" title="Resend email" aria-label="Resend email" disabled={resendMut.isPending} onClick={() => resendMut.mutate(iv.token)}><Mail size={15} /></button>
                          <button className="rw-ic-btn cl-revoke" title="Revoke" aria-label="Revoke invite" onClick={() => setRevokeTarget(iv)}><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!revokeTarget}
        onOpenChange={(o) => !o && setRevokeTarget(null)}
        title="Revoke invite?"
        description={revokeTarget ? `Revoke invite for ${revokeTarget.email}? The link will stop working.` : ""}
        confirmLabel="Revoke"
        variant="destructive"
        onConfirm={() => revokeTarget && revokeMut.mutate(revokeTarget.token)}
      />
    </div>
  );
}

export default function ClinicDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<AdminClinic | null>(null);

  // No dedicated GET — fetch the list and find the clinic. Cheap for now.
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "clinics"],
    queryFn: () => adminApi.getClinics(),
  });
  const clinic = data?.items.find((c) => c.id === id);

  if (isLoading) {
    return (
      <div className="rw-page rw-fade">
        <div className="cl-skel">
          {[0, 1, 2, 3].map((i) => <div key={i} className="cl-skel-row" />)}
        </div>
      </div>
    );
  }

  if (isError || !clinic) {
    return (
      <div className="rw-page rw-fade">
        <div className="dh-empty">
          <div className="dh-empty-ic cl-error-ic"><TriangleAlert size={24} /></div>
          <h3>Clinic not found</h3>
          <p>We couldn’t load this clinic.</p>
          <button className="rw-btn primary" onClick={() => navigate("/admin/clinics")}>Back to clinics</button>
        </div>
      </div>
    );
  }

  const FIELDS = [
    { icon: Mail, label: "Email", value: clinic.email || "—" },
    { icon: Phone, label: "Phone", value: clinic.phone || "—" },
    { icon: Printer, label: "Fax", value: clinic.fax || "—" },
    { icon: Stethoscope, label: "Specialty", value: clinic.specialty || "—" },
    { icon: MapPin, label: "Address", value: clinic.address || "—" },
    { icon: Hash, label: "NPI", value: clinic.npi || "—", mono: true },
  ];

  return (
    <div className="rw-page rw-fade">
      <button className="cl-back" onClick={() => navigate("/admin/clinics")}>
        <ArrowLeft size={16} />All clinics
      </button>

      <div className="cl-d-header">
        <span className="dh-avatar cl-d-avatar">{getInitials(clinic.name)}</span>
        <div className="cl-d-head-meta">
          <div className="cl-d-title-row"><h1 className="cl-d-title">{clinic.name}</h1></div>
          <p className="cl-d-sub">{[clinic.specialty, clinic.email].filter(Boolean).join(" · ") || "—"}</p>
        </div>
        <button className="rw-btn outline cl-d-edit" onClick={() => setEditing(clinic)}>
          <Pencil size={15} />Edit
        </button>
      </div>

      <div className="cl-d-stack">
        <div className="cl-card-plain cl-d-info">
          <div className="cl-panel-head"><h3>Clinic details</h3></div>
          <div className="cl-d-kvs">
            {FIELDS.map((f) => <DetailKV key={f.label} icon={f.icon} label={f.label} value={f.value} mono={f.mono} />)}
          </div>
        </div>

        <TeamInvitesPanel clinic={clinic} />
      </div>

      <ClinicFormModal open={!!editing} onOpenChange={(o) => !o && setEditing(null)} clinic={editing} />
    </div>
  );
}
