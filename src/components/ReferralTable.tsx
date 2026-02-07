import { useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Referral } from "@/data/mockData";

interface ReferralTableProps {
  referrals: Referral[];
  userType: "clinic" | "admin";
  showClinic?: boolean;
}

export function ReferralTable({ referrals, userType, showClinic = false }: ReferralTableProps) {
  const navigate = useNavigate();

  const handleView = (id: string) => {
    if (userType === "clinic") {
      navigate(`/clinic/referrals/${id}`);
    } else {
      navigate(`/admin/referrals/${id}`);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/50 hover:bg-secondary/50">
            {userType === "admin" && <TableHead className="text-xs font-semibold uppercase text-muted-foreground">ID</TableHead>}
            <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Patient Name</TableHead>
            {showClinic && <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Clinic</TableHead>}
            <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Drug</TableHead>
            <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Status</TableHead>
            <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Created</TableHead>
            {userType === "clinic" && <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Updated</TableHead>}
            <TableHead className="text-xs font-semibold uppercase text-muted-foreground text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {referrals.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No referrals found
              </TableCell>
            </TableRow>
          ) : (
            referrals.map((ref, i) => (
              <TableRow
                key={ref.id}
                className="cursor-pointer transition-colors hover:bg-secondary/30"
                onClick={() => handleView(ref.id)}
              >
                {userType === "admin" && (
                  <TableCell className="font-mono text-xs text-muted-foreground">{ref.id}</TableCell>
                )}
                <TableCell className="font-medium">{ref.patient_name}</TableCell>
                {showClinic && <TableCell className="text-sm text-muted-foreground">{ref.clinic_name}</TableCell>}
                <TableCell className="text-sm">{ref.drug}</TableCell>
                <TableCell><StatusBadge status={ref.status} /></TableCell>
                <TableCell className="text-sm text-muted-foreground">{ref.created_at}</TableCell>
                {userType === "clinic" && <TableCell className="text-sm text-muted-foreground">{ref.updated_at}</TableCell>}
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleView(ref.id); }}>
                    <Eye className="h-4 w-4 mr-1" />
                    {userType === "admin" ? "Review" : "View"}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
