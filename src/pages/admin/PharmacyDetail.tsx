import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Pencil, Power, Ban, ShieldOff,
} from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { PharmacyFormModal } from "@/components/PharmacyFormModal";
import { getInitials } from "@/components/CreatedByAvatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DefinitionList } from "@/components/patterns/DefinitionList";
import { pharmacyApi } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function formatPhone(value: string | null): string {
  if (!value) return "—";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return value;
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold",
        active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
      )}
    >
      {active ? "Active" : "Inactive"}
    </span>
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
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      </div>
    );
  }

  if (isError || !pharmacy) {
    return (
      <div className="rw-page rw-fade">
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive"><ShieldOff width={24} height={24} strokeWidth={1.75} /></span>
          <h3 className="text-base font-semibold text-foreground">Pharmacy not found</h3>
          <p className="text-sm text-muted-foreground">We couldn't load this pharmacy.</p>
          <Button size="sm" onClick={() => navigate("/admin/pharmacies")}>Back to pharmacies</Button>
        </div>
      </div>
    );
  }

  const p = pharmacy;
  const fullAddress = [p.address, p.city, p.state, p.zip].filter(Boolean).join(", ") || "—";
  const secondary = [p.contact_email, p.contact_phone ? formatPhone(p.contact_phone) : null].filter(Boolean).join(" · ") || "—";

  const FIELD_ROWS = [
    { label: "Address", value: fullAddress },
    { label: "Email", value: p.email || undefined },
    { label: "Phone", value: formatPhone(p.phone), mono: true },
    { label: "Fax", value: formatPhone(p.fax), mono: true },
    { label: "Alt Phone / Fax", value: p.alt_phone_fax || undefined, mono: true },
    { label: "Secondary Contact", value: secondary },
  ];

  return (
    <div className="rw-page rw-fade">
      <Button variant="ghost" size="sm" className="mb-3 -ml-2 text-muted-foreground" onClick={() => navigate("/admin/pharmacies")}>
        <ArrowLeft width={16} height={16} strokeWidth={1.75} />All pharmacies
      </Button>

      {/* Header */}
      <div className={cn("flex items-center gap-3 mb-6", !p.is_active && "opacity-70")}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{getInitials(p.name)}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold serif text-foreground truncate">{p.name}</h1>
            <StatusPill active={p.is_active} />
            {p.accepts_no_insurance && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 text-[#92610B] px-2 py-0.5 text-[11px] font-medium">
                <ShieldOff width={12} height={12} strokeWidth={1.75} />Accepts no insurance
              </span>
            )}
          </div>
          {p.city && <p className="text-sm text-muted-foreground">{[p.city, p.state].filter(Boolean).join(", ")}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil width={15} height={15} strokeWidth={1.75} />Edit</Button>
          <Button variant="outline" className="disabled:opacity-40" disabled={!p.is_active} onClick={() => setDeactivateOpen(true)}>
            <Power width={15} height={15} strokeWidth={1.75} />Deactivate
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <DefinitionList title="Pharmacy details" rows={FIELD_ROWS} />

        {/* Blocked medications */}
        <div className="bg-card border border-border rounded-lg p-[var(--density-card-pad)]">
          <div className="flex items-center gap-2 mb-2.5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">Blocked Medications</h3>
            <span className="text-xs text-muted-foreground">{p.blocked_medications.length} blocked</span>
          </div>
          {p.blocked_medications.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {p.blocked_medications.map((m) => (
                <span key={m} className="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive px-2.5 py-0.5 text-xs font-medium">
                  <Ban width={12} height={12} strokeWidth={1.75} />{m}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No blocked medications — this pharmacy can receive referrals for any drug.</p>
          )}
        </div>

        {/* Notes */}
        <div className="bg-card border border-border rounded-lg p-[var(--density-card-pad)]">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground mb-2.5">Notes</h3>
          {p.notes ? <p className="text-sm text-foreground whitespace-pre-wrap">{p.notes}</p> : <p className="text-sm text-muted-foreground">No notes for this pharmacy.</p>}
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
