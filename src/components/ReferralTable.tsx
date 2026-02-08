import { useNavigate } from "react-router-dom";
import { Eye, Pill, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { PAStatusCell, paSortOrder } from "@/components/PAStatusCell";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Referral } from "@/data/mockData";
import { getReferralPAInfo } from "@/data/mockData";
import { getRelativeTime, formatDateTime } from "@/lib/dateUtils";
import { toast } from "@/hooks/use-toast";

interface ReferralTableProps {
  referrals: Referral[];
  userType: "clinic" | "admin";
  showClinic?: boolean;
  paSortDirection?: "asc" | "desc" | null;
  onPASortToggle?: () => void;
}

export function ReferralTable({ referrals, userType, showClinic = false, paSortDirection, onPASortToggle }: ReferralTableProps) {
  const navigate = useNavigate();
  const isAdmin = userType === "admin";

  const handleView = (id: string) => {
    if (userType === "clinic") {
      navigate(`/clinic/referrals/${id}`);
    } else {
      navigate(`/admin/referrals/${id}`);
    }
  };

  const copyId = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    toast({ title: "Copied!", description: `${id} copied to clipboard` });
  };

  // Sort referrals by PA status if sorting is active
  const sortedReferrals = (() => {
    if (!isAdmin || !paSortDirection) return referrals;
    return [...referrals].sort((a, b) => {
      const paA = getReferralPAInfo(a);
      const paB = getReferralPAInfo(b);
      const orderA = paSortOrder[paA.status];
      const orderB = paSortOrder[paB.status];
      return paSortDirection === "asc" ? orderA - orderB : orderB - orderA;
    });
  })();

  if (referrals.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Eye className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">No referrals found</p>
        <p className="text-sm text-muted-foreground">Try adjusting your filters or search terms</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden card-shadow">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/50 hover:bg-secondary/50">
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">ID</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patient Name</TableHead>
            {showClinic && <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Clinic</TableHead>}
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Drug</TableHead>
            {isAdmin && (
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <button
                  onClick={onPASortToggle}
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  PA Status
                  <ArrowUpDown className={`h-3 w-3 ${paSortDirection ? 'text-foreground' : 'text-muted-foreground/50'}`} />
                </button>
              </TableHead>
            )}
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Created</TableHead>
            {userType === "clinic" && <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Updated</TableHead>}
            <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedReferrals.map((ref) => {
            const paInfo = isAdmin ? getReferralPAInfo(ref) : null;
            return (
              <TableRow
                key={ref.id}
                className="cursor-pointer transition-colors hover:bg-primary/[0.03] even:bg-secondary/20"
                onClick={() => handleView(ref.id)}
              >
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => copyId(e, ref.id)}
                        className="font-mono text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded hover:bg-secondary/80 transition-colors"
                      >
                        {ref.id.toUpperCase()}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Click to copy</TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <span className="font-medium text-foreground hover:underline">{ref.patient_name}</span>
                </TableCell>
                {showClinic && (
                  <TableCell className="text-sm text-muted-foreground">{ref.clinic_name}</TableCell>
                )}
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Pill className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm">{ref.drug}</span>
                  </div>
                </TableCell>
                {isAdmin && paInfo && (
                  <TableCell>
                    <PAStatusCell paInfo={paInfo} />
                  </TableCell>
                )}
                <TableCell>
                  <StatusBadge status={ref.status} context={userType} />
                </TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger className="text-sm text-muted-foreground">
                      {getRelativeTime(ref.created_at)}
                    </TooltipTrigger>
                    <TooltipContent>{formatDateTime(ref.created_at)}</TooltipContent>
                  </Tooltip>
                </TableCell>
                {userType === "clinic" && (
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger className="text-sm text-muted-foreground">
                        {getRelativeTime(ref.updated_at)}
                      </TooltipTrigger>
                      <TooltipContent>{formatDateTime(ref.updated_at)}</TooltipContent>
                    </Tooltip>
                  </TableCell>
                )}
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={(e) => { e.stopPropagation(); handleView(ref.id); }}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    {isAdmin ? "Review" : "View"}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
