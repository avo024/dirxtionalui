import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Power, MapPin, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
      </div>

      {/* Details card */}
      <div className="rounded-xl border border-border bg-card p-6 card-shadow">
        <h3 className="font-semibold text-foreground mb-4">Pharmacy Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Contact Email</p>
              <p className="font-medium">{pharmacy.contact_email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="font-medium">{pharmacy.phone}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Insurance Compatibility</p>
            <div className="flex flex-wrap gap-1">
              {pharmacy.insurance_compatibility.map((ins) => (
                <Badge key={ins} variant="secondary" className="text-xs">{ins}</Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Locations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Locations ({pharmacy.locations.length})</h3>
          <Button size="sm" onClick={() => toast({ title: "Add Location", description: "Location form coming soon." })}>
            <Plus className="h-4 w-4 mr-1" />
            Add Location
          </Button>
        </div>
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Address</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Zip Codes Served</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Email</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Phone</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Status</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pharmacy.locations.map((loc) => (
                <TableRow key={loc.id}>
                  <TableCell className="font-medium text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      {loc.address}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{loc.zip_codes_served.join(", ")}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{loc.email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{loc.phone}</TableCell>
                  <TableCell>
                    <Badge variant={loc.active ? "default" : "secondary"} className={loc.active ? "bg-success/10 text-success border-0" : ""}>
                      {loc.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast({ title: "Edit location" })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast({ title: "Status toggled" })}>
                        <Power className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
