import { useState } from "react";
import { AlertOctagon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReassignPharmacyModal } from "@/components/ReassignPharmacyModal";
import { mockBlockedReferrals } from "@/data/mockData";

export default function BlockedReferrals() {
  const [reassignId, setReassignId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <AlertOctagon className="h-6 w-6 text-warning" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Blocked Referrals</h1>
          <p className="text-muted-foreground mt-1">Referrals that couldn't be sent to the assigned pharmacy</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50 hover:bg-secondary/50">
              <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Patient Name</TableHead>
              <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Clinic</TableHead>
              <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Drug</TableHead>
              <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Pharmacy (Blocked)</TableHead>
              <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Reason</TableHead>
              <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Date</TableHead>
              <TableHead className="text-xs font-semibold uppercase text-muted-foreground text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockBlockedReferrals.map((ref) => (
              <TableRow key={ref.id}>
                <TableCell className="font-medium">{ref.patient_name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{ref.clinic_name}</TableCell>
                <TableCell className="text-sm">{ref.drug}</TableCell>
                <TableCell className="text-sm text-destructive font-medium">{ref.pharmacy}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{ref.reason}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{ref.date}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => setReassignId(ref.id)}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    Reassign
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ReassignPharmacyModal
        open={!!reassignId}
        onOpenChange={(open) => !open && setReassignId(null)}
        referralId={reassignId || ""}
      />
    </div>
  );
}
