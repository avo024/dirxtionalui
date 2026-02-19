import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Eye, Pencil, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockPharmacies } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";

export default function PharmaciesList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filtered = mockPharmacies.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pharmacies</h1>
          <p className="text-muted-foreground mt-1">Manage specialty pharmacy partners</p>
        </div>
        <Button onClick={() => toast({ title: "Add Pharmacy", description: "Pharmacy creation form coming soon." })}>
          <Plus className="h-4 w-4 mr-2" />
          Add Pharmacy
        </Button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search pharmacies..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50 hover:bg-secondary/50">
              <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Pharmacy Name</TableHead>
              <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Address</TableHead>
              <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Contact Email</TableHead>
              <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Phone</TableHead>
              <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Status</TableHead>
              <TableHead className="text-xs font-semibold uppercase text-muted-foreground text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((pharm) => (
              <TableRow key={pharm.id} className="cursor-pointer hover:bg-secondary/30" onClick={() => navigate(`/admin/pharmacies/${pharm.id}`)}>
                <TableCell className="font-medium">{pharm.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{pharm.address}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{pharm.contact_email}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{pharm.phone}</TableCell>
                <TableCell>
                  <Badge variant={pharm.status === "active" ? "default" : "secondary"} className={pharm.status === "active" ? "bg-success/10 text-success border-0" : ""}>
                    {pharm.status === "active" ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); navigate(`/admin/pharmacies/${pharm.id}`); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); toast({ title: "Edit", description: "Edit form coming soon." }); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); toast({ title: "Status toggled" }); }}>
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
  );
}
