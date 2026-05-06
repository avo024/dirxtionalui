import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClinicFormModal } from "@/components/ClinicFormModal";
import { ClinicAddonsPanel } from "@/components/admin/ClinicAddonsPanel";
import { adminApi, type AdminClinic } from "@/lib/api";

export default function ClinicDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<AdminClinic | null>(null);

  // No dedicated GET — fetch the list and find the clinic. Cheap for now.
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "clinics"],
    queryFn: () => adminApi.getClinics(),
  });

  const clinic = data?.items.find((c) => c.id === id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !clinic) {
    return (
      <div className="space-y-4">
        <Link
          to="/admin/clinics"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to clinics
        </Link>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Clinic not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin/clinics"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to clinics
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{clinic.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {clinic.specialty || "—"}
            {clinic.email && ` · ${clinic.email}`}
          </p>
        </div>
        <Button variant="outline" onClick={() => setEditing(clinic)}>
          <Pencil className="h-4 w-4 mr-2" /> Edit clinic
        </Button>
      </div>

      <ClinicAddonsPanel clinicId={clinic.id} clinicName={clinic.name} />

      <ClinicFormModal
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        clinic={editing}
      />
    </div>
  );
}
