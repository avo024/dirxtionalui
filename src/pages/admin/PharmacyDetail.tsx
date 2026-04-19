import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Power, MapPin, Mail, Phone, Printer, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmModal } from "@/components/ConfirmModal";
import { PharmacyFormModal } from "@/components/PharmacyFormModal";
import { pharmacyApi } from "@/lib/api";
import { toast } from "sonner";

function formatPhone(value: string | null): string {
  if (!value) return "—";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return value;
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
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !pharmacy) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Pharmacy not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/pharmacies")}>Back</Button>
      </div>
    );
  }

  const fullAddress = [pharmacy.address, pharmacy.city, pharmacy.state, pharmacy.zip].filter(Boolean).join(", ") || "—";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/pharmacies")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{pharmacy.name}</h1>
            <Badge
              variant={pharmacy.is_active ? "default" : "secondary"}
              className={pharmacy.is_active ? "bg-success/10 text-success border-0" : ""}
            >
              {pharmacy.is_active ? "Active" : "Inactive"}
            </Badge>
            {pharmacy.accepts_no_insurance && (
              <Badge variant="outline" className="text-xs">Accepts no insurance</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
          {pharmacy.is_active && (
            <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeactivateOpen(true)}>
              <Power className="h-4 w-4 mr-1" />
              Deactivate
            </Button>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="rounded-xl border border-border bg-card p-6 card-shadow">
        <h3 className="font-semibold text-foreground mb-4">Pharmacy Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Address</p>
              <p className="font-medium">{fullAddress}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium">{pharmacy.email || "—"}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="font-medium">{formatPhone(pharmacy.phone)}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Printer className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Fax</p>
              <p className="font-medium">{formatPhone(pharmacy.fax)}</p>
            </div>
          </div>
          {pharmacy.alt_phone_fax && (
            <div className="flex items-start gap-2">
              <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Alt Phone/Fax</p>
                <p className="font-medium">{pharmacy.alt_phone_fax}</p>
              </div>
            </div>
          )}
          {(pharmacy.contact_email || pharmacy.contact_phone) && (
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Secondary Contact</p>
                <p className="font-medium">{pharmacy.contact_email || "—"}</p>
                {pharmacy.contact_phone && (
                  <p className="font-medium text-muted-foreground">{formatPhone(pharmacy.contact_phone)}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {pharmacy.blocked_medications && pharmacy.blocked_medications.length > 0 && (
          <div className="mt-6">
            <p className="text-xs text-muted-foreground mb-2">Blocked Medications</p>
            <div className="flex flex-wrap gap-1">
              {pharmacy.blocked_medications.map((med) => (
                <Badge key={med} variant="secondary" className="text-xs">{med}</Badge>
              ))}
            </div>
          </div>
        )}

        {pharmacy.notes && (
          <div className="mt-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <FileText className="h-3.5 w-3.5" />
              Notes
            </div>
            <p className="text-sm whitespace-pre-wrap">{pharmacy.notes}</p>
          </div>
        )}
      </div>

      <PharmacyFormModal open={editOpen} onOpenChange={setEditOpen} pharmacy={pharmacy} />

      <ConfirmModal
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        title="Deactivate pharmacy?"
        description={`Deactivate ${pharmacy.name}? They won't appear in new referrals.`}
        confirmLabel="Deactivate"
        variant="destructive"
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}
