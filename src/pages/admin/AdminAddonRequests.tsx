import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, Inbox, Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DynamicIcon } from "@/components/DynamicIcon";

import {
  adminAddonsApi,
  type AddonRequestStatus,
  type AdminAddonRequest,
} from "@/lib/servicesApi";

type TabKey = AddonRequestStatus | "all";

const TABS: { key: TabKey; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "denied", label: "Denied" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All" },
];

export default function AdminAddonRequests() {
  const [tab, setTab] = useState<TabKey>("pending");
  const [approveTarget, setApproveTarget] = useState<AdminAddonRequest | null>(null);
  const [denyTarget, setDenyTarget] = useState<AdminAddonRequest | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [adminNotes, setAdminNotes] = useState("");

  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "addon-requests", tab],
    queryFn: () => adminAddonsApi.listRequests(tab),
  });

  // Pending count for the Pending tab badge
  const { data: pendingData } = useQuery({
    queryKey: ["admin", "addon-requests", "pending"],
    queryFn: () => adminAddonsApi.listRequests("pending"),
  });
  const pendingCount = pendingData?.requests.length ?? 0;

  const decideMutation = useMutation({
    mutationFn: ({
      id,
      decision,
      admin_notes,
      quantity,
    }: {
      id: string;
      decision: "approve" | "deny";
      admin_notes?: string;
      quantity?: number;
    }) =>
      adminAddonsApi.decideRequest(id, {
        decision,
        admin_notes,
        quantity,
      }),
    onSuccess: (_data, vars) => {
      const target = vars.decision === "approve" ? approveTarget : denyTarget;
      toast.success(
        vars.decision === "approve"
          ? `Approved — ${target?.addon_name} activated for ${target?.clinic_name}`
          : `Denied`,
      );
      setApproveTarget(null);
      setDenyTarget(null);
      setQuantity(1);
      setAdminNotes("");
      queryClient.invalidateQueries({ queryKey: ["admin", "addon-requests"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const requests = data?.requests ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Add-on Requests</h1>
        <p className="text-muted-foreground mt-1">
          Approve or deny add-on requests from clinics
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label}
              {t.key === "pending" && pendingCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="py-12 text-center text-destructive">
            {(error as Error).message}
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && requests.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            {tab === "pending" ? (
              <>
                <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500 mb-3" />
                <p className="text-muted-foreground">
                  No pending requests right now.
                </p>
              </>
            ) : (
              <>
                <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  Nothing matches this filter.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {requests.map((req) => (
          <Card key={req.id}>
            <CardContent className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="h-11 w-11 rounded-lg bg-muted text-foreground flex items-center justify-center shrink-0">
                    <DynamicIcon name={req.addon_icon} className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <p className="font-semibold">{req.addon_name}</p>
                      <span className="text-sm text-muted-foreground">
                        ${req.monthly_price_usd}/mo
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {req.clinic_name}
                      </span>
                      {req.clinic_specialty && ` · ${req.clinic_specialty}`}
                      {" · "}Requested{" "}
                      {formatDistanceToNow(new Date(req.requested_at), {
                        addSuffix: true,
                      })}
                    </p>
                    {req.clinic_notes && (
                      <div className="mt-3 rounded-md bg-muted/60 p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Clinic notes
                        </p>
                        <p className="text-sm whitespace-pre-wrap">
                          {req.clinic_notes}
                        </p>
                      </div>
                    )}
                    {req.admin_notes && req.status !== "pending" && (
                      <div className="mt-2 rounded-md bg-muted/40 p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Admin notes
                        </p>
                        <p className="text-sm whitespace-pre-wrap">
                          {req.admin_notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {req.status === "pending" ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => {
                        setApproveTarget(req);
                        setQuantity(1);
                        setAdminNotes("");
                      }}
                    >
                      <ThumbsUp className="h-4 w-4 mr-1" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setDenyTarget(req);
                        setAdminNotes("");
                      }}
                    >
                      <ThumbsDown className="h-4 w-4 mr-1" /> Deny
                    </Button>
                  </div>
                ) : (
                  <Badge
                    variant="secondary"
                    className="capitalize shrink-0"
                  >
                    {req.status}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Approve dialog */}
      <Dialog
        open={!!approveTarget}
        onOpenChange={(open) => !open && setApproveTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Add-on Request</DialogTitle>
            <DialogDescription>
              Activate {approveTarget?.addon_name} for{" "}
              {approveTarget?.clinic_name}? After approval, you'll need to add
              the corresponding line item to their Stripe subscription manually.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground">
                Default 1. Use higher only for per-unit add-ons (e.g. 2 extra
                provider seats).
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="approve_notes">Internal notes (optional)</Label>
              <Textarea
                id="approve_notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveTarget(null)}
              disabled={decideMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                approveTarget &&
                decideMutation.mutate({
                  id: approveTarget.id,
                  decision: "approve",
                  quantity,
                  admin_notes: adminNotes.trim() || undefined,
                })
              }
              disabled={decideMutation.isPending}
            >
              {decideMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Approve & activate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deny dialog */}
      <Dialog
        open={!!denyTarget}
        onOpenChange={(open) => !open && setDenyTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny Add-on Request</DialogTitle>
            <DialogDescription>
              Deny the request for {denyTarget?.addon_name} from{" "}
              {denyTarget?.clinic_name}. Please record a reason for the file.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="deny_notes">Reason</Label>
            <Textarea
              id="deny_notes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="e.g. clinic doesn't qualify, requested by mistake, etc."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDenyTarget(null)}
              disabled={decideMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                denyTarget &&
                decideMutation.mutate({
                  id: denyTarget.id,
                  decision: "deny",
                  admin_notes: adminNotes.trim() || undefined,
                })
              }
              disabled={decideMutation.isPending || !adminNotes.trim()}
            >
              {decideMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Deny request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
