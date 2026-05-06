import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronDown, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DynamicIcon } from "@/components/DynamicIcon";

import {
  adminAddonsApi,
  type AdminClinicActiveAddon,
} from "@/lib/servicesApi";

interface Props {
  clinicId: string;
  clinicName: string;
}

export function ClinicAddonsPanel({ clinicId, clinicName }: Props) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "clinic-addons", clinicId],
    queryFn: () => adminAddonsApi.getClinicAddons(clinicId),
  });

  const { data: catalog } = useQuery({
    queryKey: ["admin", "addon-catalog"],
    queryFn: () => adminAddonsApi.listCatalog(),
    staleTime: 5 * 60 * 1000,
  });

  const [addOpen, setAddOpen] = useState(false);
  const [selectedAddonId, setSelectedAddonId] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [removeTarget, setRemoveTarget] = useState<AdminClinicActiveAddon | null>(null);
  const [removeNotes, setRemoveNotes] = useState("");

  const refetch = () =>
    queryClient.invalidateQueries({
      queryKey: ["admin", "clinic-addons", clinicId],
    });

  const addMutation = useMutation({
    mutationFn: (body: { addon_id: string; quantity: number; notes?: string }) =>
      adminAddonsApi.addClinicAddon(clinicId, body),
    onSuccess: () => {
      toast.success("Activated");
      setAddOpen(false);
      setSelectedAddonId("");
      setQuantity(1);
      setNotes("");
      refetch();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      adminAddonsApi.removeClinicAddon(clinicId, id, notes ? { notes } : undefined),
    onSuccess: () => {
      toast.success("Removed");
      setRemoveTarget(null);
      setRemoveNotes("");
      refetch();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        {(error as Error).message}
      </div>
    );
  }

  if (!data) return null;

  const activeAddonIds = new Set(data.active_addons.map((a) => a.addon_id));
  const availableForAdd = (catalog?.addons ?? []).filter(
    (a) => a.active && !activeAddonIds.has(a.id),
  );

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">Add-on Services</h2>
          <p className="text-sm text-muted-foreground">
            Active add-ons billed monthly · Total:{" "}
            <strong>${data.monthly_addon_total_usd}/mo</strong>
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add service
        </Button>
      </div>

      {data.active_addons.length === 0 ? (
        <div className="text-center p-8 border-2 border-dashed rounded-lg text-muted-foreground">
          <p>
            No active add-ons. Click "Add service" to activate one for this
            clinic.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.active_addons.map((addon) => (
            <div
              key={addon.id}
              className="flex items-center justify-between p-4 rounded-lg border"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-md bg-muted shrink-0">
                  <DynamicIcon name={addon.addon_icon} className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium">{addon.addon_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Activated{" "}
                    {format(new Date(addon.activated_at), "MMM d, yyyy")}
                    {addon.quantity > 1 && ` · qty ${addon.quantity}`}
                    {addon.notes && ` · ${addon.notes}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-medium">
                  ${addon.monthly_price_usd * addon.quantity}/mo
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRemoveTarget(addon);
                    setRemoveNotes("");
                  }}
                  aria-label="Remove"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {data.history.length > 0 && (
        <Collapsible className="mt-6">
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ChevronDown className="h-4 w-4" />
            Deactivated history ({data.history.length})
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-2">
            {data.history.map((addon) => (
              <div
                key={addon.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-muted/30 opacity-70"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-md bg-muted shrink-0">
                    <DynamicIcon name={addon.addon_icon} className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">{addon.addon_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Active{" "}
                      {format(new Date(addon.activated_at), "MMM d, yyyy")} –{" "}
                      {format(new Date(addon.deactivated_at), "MMM d, yyyy")}
                      {addon.notes && ` · ${addon.notes}`}
                    </p>
                  </div>
                </div>
                <span className="text-sm text-muted-foreground shrink-0">
                  ${addon.monthly_price_usd}/mo
                </span>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add service for {clinicName}</DialogTitle>
            <DialogDescription>
              Activates immediately. You'll still need to update Stripe manually.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Add-on</Label>
              <Select
                value={selectedAddonId}
                onValueChange={setSelectedAddonId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an add-on" />
                </SelectTrigger>
                <SelectContent>
                  {availableForAdd.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      No remaining add-ons available.
                    </div>
                  ) : (
                    availableForAdd.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} — ${a.monthly_price_usd}/mo
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add_qty">Quantity</Label>
              <Input
                id="add_qty"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add_notes">Internal notes (optional)</Label>
              <Textarea
                id="add_notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddOpen(false)}
              disabled={addMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                addMutation.mutate({
                  addon_id: selectedAddonId,
                  quantity,
                  notes: notes.trim() || undefined,
                })
              }
              disabled={!selectedAddonId || addMutation.isPending}
            >
              {addMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Activate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {removeTarget?.addon_name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the addon for <strong>{clinicName}</strong>.
              The clinic will stop being billed for it on their next cycle.
              You'll still need to update Stripe manually.
              <br />
              <br />
              History is preserved — this addon will appear in the deactivated
              list below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-2 space-y-2">
            <Label htmlFor="remove_notes">Reason (optional)</Label>
            <Textarea
              id="remove_notes"
              placeholder="e.g. clinic requested via email, downsizing, etc."
              value={removeNotes}
              onChange={(e) => setRemoveNotes(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMutation.isPending}>
              Keep active
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (removeTarget) {
                  removeMutation.mutate({
                    id: removeTarget.id,
                    notes: removeNotes.trim() || undefined,
                  });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
