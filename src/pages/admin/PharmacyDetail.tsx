import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil, Power, MapPin, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockPharmacies } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";

export default function PharmacyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const pharmacy = mockPharmacies.find((p) => p.id === id);

  if (!pharmacy) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Pharmacy not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/pharmacies")}>Back</Button>
      </div>
    );
  }

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
            <Badge variant={pharmacy.status === "active" ? "default" : "secondary"} className={pharmacy.status === "active" ? "bg-success/10 text-success border-0" : ""}>
              {pharmacy.status === "active" ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => toast({ title: "Edit Pharmacy" })}>
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast({ title: "Status toggled" })}>
            <Power className="h-4 w-4 mr-1" />
            {pharmacy.status === "active" ? "Deactivate" : "Activate"}
          </Button>
        </div>
      </div>

      {/* Details card */}
      <div className="rounded-xl border border-border bg-card p-6 card-shadow">
        <h3 className="font-semibold text-foreground mb-4">Pharmacy Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Address</p>
              <p className="font-medium">{pharmacy.address}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Contact Email</p>
              <p className="font-medium">{pharmacy.contact_email}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="font-medium">{pharmacy.phone}</p>
            </div>
          </div>
          {pharmacy.fax && (
            <div className="flex items-start gap-2">
              <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Fax</p>
                <p className="font-medium">{pharmacy.fax}</p>
              </div>
            </div>
          )}
        </div>
        <div className="mt-4">
          <p className="text-xs text-muted-foreground mb-2">Insurance Compatibility</p>
          <div className="flex flex-wrap gap-1">
            {pharmacy.insurance_compatibility.map((ins) => (
              <Badge key={ins} variant="secondary" className="text-xs">{ins}</Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
