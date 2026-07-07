import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Sparkles, Clock, Check } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmModal } from "@/components/ConfirmModal";
import { DynamicIcon } from "@/components/DynamicIcon";

import {
  cancelAddonRequest,
  getMyServices,
  requestAddon,
  type PendingRequest,
  type ServiceCatalogItem,
} from "@/lib/servicesApi";

export default function Services() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["clinic", "services"],
    queryFn: getMyServices,
    retry: 1,
  });

  const [requestTarget, setRequestTarget] = useState<ServiceCatalogItem | null>(null);
  const [notes, setNotes] = useState("");
  const [cancelTarget, setCancelTarget] = useState<PendingRequest | null>(null);

  const refetch = () =>
    queryClient.invalidateQueries({ queryKey: ["clinic", "services"] });

  const requestMutation = useMutation({
    mutationFn: requestAddon,
    onSuccess: () => {
      toast.success(
        "Request submitted — we'll confirm via email within 1 business day",
      );
      setRequestTarget(null);
      setNotes("");
      refetch();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelAddonRequest,
    onSuccess: () => {
      toast.success("Request cancelled");
      setCancelTarget(null);
      refetch();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    const status = (error as Error & { status?: number }).status;
    return (
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">Services</h1>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {status === 403
              ? "This section is for clinic users."
              : (error as Error).message || "Failed to load services."}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const { active_addons, pending_requests, catalog } = data;
  const availableCatalog = catalog.filter((a) => a.state !== "active");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Services</h1>
        <p className="text-muted-foreground mt-1">
          Manage your Dirxctional plan and add-on services
        </p>
      </div>

      {/* Section 1 — Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>Your Dirxctional subscription</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Plan</p>
              <p className="text-sm text-muted-foreground">
                Contact your account manager
              </p>
              <p className="text-sm text-muted-foreground">
                Plan changes are coordinated with our team. Email{" "}
                <a
                  href="mailto:hello@dirxctional.com"
                  className="underline text-accent"
                >
                  hello@dirxctional.com
                </a>{" "}
                if you need to adjust your subscription.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2 — Active Add-ons */}
      {active_addons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Add-ons</CardTitle>
            <CardDescription>
              Services currently included on your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {active_addons.map((addon) => (
              <div
                key={addon.id}
                className="flex flex-wrap items-start justify-between gap-4 p-4 rounded-lg border bg-card"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <DynamicIcon name={addon.addon_icon} className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">{addon.addon_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {addon.addon_description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      ${addon.monthly_price_usd}/mo
                    </p>
                    {addon.quantity > 1 && (
                      <p className="text-xs text-muted-foreground">
                        × {addon.quantity}
                      </p>
                    )}
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-transparent">
                    <Check className="h-3 w-3 mr-1" /> Active
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Section 3 — Available Add-ons */}
      <Card>
        <CardHeader>
          <CardTitle>Available Add-ons</CardTitle>
          <CardDescription>
            Click "Request" to ask our team to add a service. We'll confirm and
            bill on your next cycle.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availableCatalog.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You've already activated or requested every available add-on.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableCatalog.map((addon) => (
                <div
                  key={addon.id}
                  className="flex flex-col gap-3 p-4 rounded-lg border bg-card h-full"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted text-foreground flex items-center justify-center shrink-0">
                      <DynamicIcon name={addon.icon} className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium">{addon.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {addon.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-2">
                    <p className="text-sm font-medium">
                      ${addon.monthly_price_usd}/mo
                    </p>
                    {addon.state === "requested" ? (
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-transparent">
                        <Clock className="h-3 w-3 mr-1" /> Requested
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          setRequestTarget(addon);
                          setNotes("");
                        }}
                      >
                        Request
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4 — Pending Requests */}
      {pending_requests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Requests</CardTitle>
            <CardDescription>Awaiting our team's review</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending_requests.map((req) => (
              <div
                key={req.id}
                className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <DynamicIcon name={req.addon_icon} className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">{req.addon_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Requested{" "}
                      {formatDistanceToNow(new Date(req.requested_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <p className="text-sm text-muted-foreground">
                    ${req.monthly_price_usd}/mo
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCancelTarget(req)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Request dialog */}
      <Dialog
        open={!!requestTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRequestTarget(null);
            setNotes("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request {requestTarget?.name}</DialogTitle>
            <DialogDescription>
              ${requestTarget?.monthly_price_usd}/mo — billed on your next cycle
              once our team confirms.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes (optional)</label>
            <Textarea
              placeholder="Anything we should know? Optional."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRequestTarget(null);
                setNotes("");
              }}
              disabled={requestMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!requestTarget) return;
                requestMutation.mutate({
                  addon_id: requestTarget.id,
                  clinic_notes: notes.trim() || undefined,
                });
              }}
              disabled={requestMutation.isPending}
            >
              {requestMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Submit request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel confirmation */}
      <ConfirmModal
        open={!!cancelTarget}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null);
        }}
        title="Cancel request?"
        description={
          cancelTarget
            ? `Cancel request for ${cancelTarget.addon_name}? You can request it again any time.`
            : ""
        }
        confirmLabel="Cancel request"
        cancelLabel="Keep request"
        variant="destructive"
        onConfirm={() => {
          if (cancelTarget) cancelMutation.mutate(cancelTarget.id);
        }}
      />
    </div>
  );
}
