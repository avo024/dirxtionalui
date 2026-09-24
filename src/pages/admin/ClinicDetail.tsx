import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Pencil, Mail, Copy, Trash2, MailPlus, Clock, TriangleAlert, Users,
} from "lucide-react";
import { ClinicFormModal } from "@/components/ClinicFormModal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { getInitials } from "@/components/CreatedByAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Combobox } from "@/components/ui/combobox";
import { DefinitionList } from "@/components/patterns/DefinitionList";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { adminApi, type AdminClinic, type AdminInvite, type AdminClinicUser } from "@/lib/api";
import { CLINIC_ROLES, DEFAULT_CLINIC_ROLE, type ClinicRoleValue, roleLabel } from "@/lib/roles";
import { formatDateForTable } from "@/lib/dateUtils";
import { useClinicHasOfficeManager } from "@/hooks/useClinicHasOfficeManager";
import { toast } from "sonner";
import { PageContainer } from "@/components/patterns/PageContainer";

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

/* Team members — accepted clinic_users for this clinic, with an inline role
   changer. Separate from TeamInvitesPanel below, which is pending invites. */
function TeamMembersPanel({ clinic }: { clinic: AdminClinic }) {
  const queryClient = useQueryClient();
  const teamKey = ["admin", "clinic-team", clinic.id];

  const { data, isLoading } = useQuery({
    queryKey: teamKey,
    queryFn: () => adminApi.getClinicTeam(clinic.id),
  });
  const members = data?.items ?? [];
  const hasOfficeManager = members.some((m) => m.role === "office_manager");

  const roleMut = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      adminApi.updateClinicUserRole(clinic.id, userId, role),
    onMutate: async ({ userId, role }) => {
      await queryClient.cancelQueries({ queryKey: teamKey });
      const previous = queryClient.getQueryData<{ items: AdminClinicUser[] }>(teamKey);
      queryClient.setQueryData<{ items: AdminClinicUser[] }>(teamKey, (old) =>
        old ? { items: old.items.map((m) => (m.id === userId ? { ...m, role } : m)) } : old,
      );
      return { previous };
    },
    onSuccess: () => toast.success("Role updated"),
    onError: (e: any, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(teamKey, ctx.previous);
      toast.error(e?.message || "Failed to update role");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: teamKey }),
  });

  return (
    <div className="bg-card border border-border rounded-lg p-[var(--density-card-pad)]">
      <div className="flex items-center gap-2 mb-3">
        <Users width={16} height={16} strokeWidth={1.75} className="text-muted-foreground" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">Team</h3>
        <span className="text-xs text-muted-foreground">{members.length} member{members.length === 1 ? "" : "s"}</span>
      </div>

      {!isLoading && !hasOfficeManager && (
        <div className="mb-3 rounded-md border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          No office manager yet — every referral email falls back to the main email / all users, and anyone can change clinic settings.
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[0, 1].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : members.length === 0 ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
          <Users width={18} height={18} strokeWidth={1.75} />
          No team members yet — send an invite below.
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => {
                const name = [m.first_name, m.last_name].filter(Boolean).join(" ");
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-semibold text-foreground">{name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{m.email}</TableCell>
                    <TableCell>
                      <Combobox
                        size="sm"
                        className="h-8 w-48"
                        placeholder={roleLabel(m.role)}
                        value={m.role ?? ""}
                        onValueChange={(role) => roleMut.mutate({ userId: m.id, role })}
                        options={CLINIC_ROLES.map((r) => ({ value: r.value, label: r.label, hint: r.description }))}
                        searchable={false}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

/* Team & Invites — folded in from the retired AdminInvites page.
   Clinic is implied by the page, so there is NO clinic picker and NO clinic column. */
function TeamInvitesPanel({ clinic }: { clinic: AdminClinic }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [role, setRole] = useState<ClinicRoleValue>(DEFAULT_CLINIC_ROLE);
  const [roleTouched, setRoleTouched] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<AdminInvite | null>(null);

  const { data } = useQuery({
    queryKey: ["admin", "invites"],
    queryFn: () => adminApi.listInvites(),
  });
  const invites = (data?.items ?? []).filter((iv) => iv.clinic_id === clinic.id && isPending(iv));

  const valid = EMAIL_RE.test(email.trim());

  const { hasOfficeManager, hasPendingOfficeManagerInvite, loading: omLoading } =
    useClinicHasOfficeManager(clinic.id);
  const needsOfficeManager = !omLoading && !hasOfficeManager && !hasPendingOfficeManagerInvite;
  const showOfficeManagerNote = needsOfficeManager && role === "office_manager";
  const showSendAnywayWarning = needsOfficeManager && role !== "office_manager";

  // Soft default: first invite for a clinic should be the office manager.
  // Only auto-applies while the admin hasn't manually picked a role.
  useEffect(() => {
    if (omLoading || roleTouched) return;
    setRole(needsOfficeManager ? "office_manager" : DEFAULT_CLINIC_ROLE);
  }, [omLoading, needsOfficeManager, roleTouched]);

  const createMut = useMutation({
    mutationFn: (addr: string) => adminApi.createInvite({ clinic_id: clinic.id, email: addr, role }),
    onSuccess: (_d, addr) => {
      toast.success(`Invite sent to ${addr}`);
      setEmail(""); setTouched(false); setRoleTouched(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "invites"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "clinic-team", clinic.id] });
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
    <div className="bg-card border border-border rounded-lg p-[var(--density-card-pad)]">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">Team &amp; Invites</h3>
        <span className="text-xs text-muted-foreground">{invites.length} pending</span>
      </div>

      {/* Invite a member */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Mail width={16} height={16} strokeWidth={1.75} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="email"
              placeholder="teammate@clinic.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              className={`pl-8 ${touched && !valid ? "border-destructive" : ""}`}
            />
          </div>
          <Combobox
            size="sm"
            className="h-9 w-44 shrink-0"
            placeholder="Select a role"
            value={role}
            onValueChange={(v) => {
              setRole(v as ClinicRoleValue);
              setRoleTouched(true);
            }}
            options={CLINIC_ROLES.map((r) => ({ value: r.value, label: r.label, hint: r.description }))}
            searchable={false}
          />
          <Button onClick={submit} disabled={createMut.isPending}>
            <MailPlus width={15} height={15} strokeWidth={1.75} />
            {showSendAnywayWarning ? "Send anyway" : "Invite member"}
          </Button>
        </div>
        {touched && !valid && <p className="text-xs text-destructive">Enter a valid email address.</p>}
        {showOfficeManagerNote && (
          <p className="rounded-md bg-teal-50 px-2.5 py-2 text-xs text-teal-700">
            This clinic has no office manager yet — invite them first. They'll own clinic settings and get every
            referral that needs action.
          </p>
        )}
        {showSendAnywayWarning && (
          <p className="rounded-md border border-amber-300/60 bg-amber-50 px-2.5 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            No office manager yet — send this anyway?
          </p>
        )}
        <p className="text-xs text-muted-foreground">Sends an invitation to join <strong>{clinic.name}</strong> on Dirxctional.</p>
      </div>

      {/* Pending invites */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Pending invites</div>
        {invites.length === 0 ? (
          <div className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
            <MailPlus width={18} height={18} strokeWidth={1.75} />
            No pending invites — invite a teammate above.
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((iv) => {
                  const soon = isExpiringSoon(iv.expires_at);
                  return (
                    <TableRow key={iv.token}>
                      <TableCell className="font-semibold text-foreground">{iv.email}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDateForTable(iv.created_at)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 ${soon ? "text-warning font-medium" : "text-muted-foreground"}`}>
                          {soon && <Clock width={12} height={12} strokeWidth={1.75} />}
                          {formatDateForTable(iv.expires_at)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Copy link" aria-label="Copy invite link" onClick={() => copyLink(iv.token)}><Copy width={15} height={15} strokeWidth={1.75} /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Resend email" aria-label="Resend email" disabled={resendMut.isPending} onClick={() => resendMut.mutate(iv.token)}><Mail width={15} height={15} strokeWidth={1.75} /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Revoke" aria-label="Revoke invite" onClick={() => setRevokeTarget(iv)}><Trash2 width={15} height={15} strokeWidth={1.75} /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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
      <PageContainer>
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      </PageContainer>
    );
  }

  if (isError || !clinic) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive"><TriangleAlert width={24} height={24} strokeWidth={1.75} /></span>
          <h3 className="text-base font-semibold text-foreground">Clinic not found</h3>
          <p className="text-sm text-muted-foreground">We couldn't load this clinic.</p>
          <Button size="sm" onClick={() => navigate("/admin/clinics")}>Back to clinics</Button>
        </div>
      </PageContainer>
    );
  }

  const FIELD_ROWS = [
    { label: "Email", value: clinic.email || undefined },
    { label: "Phone", value: clinic.phone || undefined },
    { label: "Fax", value: clinic.fax || undefined },
    { label: "Specialty", value: clinic.specialty || undefined },
    { label: "Address", value: clinic.address || undefined },
    { label: "NPI", value: clinic.npi || undefined, mono: true },
  ];

  return (
    <PageContainer>
      <Button variant="ghost" size="sm" className="mb-3 -ml-2 text-muted-foreground" onClick={() => navigate("/admin/clinics")}>
        <ArrowLeft width={16} height={16} strokeWidth={1.75} />All clinics
      </Button>

      <div className="flex items-center gap-3 mb-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{getInitials(clinic.name)}</span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-foreground truncate">{clinic.name}</h1>
          <p className="text-sm text-muted-foreground">{[clinic.specialty, clinic.email].filter(Boolean).join(" · ") || "—"}</p>
        </div>
        <Button variant="outline" onClick={() => setEditing(clinic)}>
          <Pencil width={15} height={15} strokeWidth={1.75} />Edit
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <DefinitionList title="Clinic details" rows={FIELD_ROWS} />
        <TeamMembersPanel clinic={clinic} />
        <TeamInvitesPanel clinic={clinic} />
      </div>

      <ClinicFormModal open={!!editing} onOpenChange={(o) => !o && setEditing(null)} clinic={editing} />
    </PageContainer>
  );
}
