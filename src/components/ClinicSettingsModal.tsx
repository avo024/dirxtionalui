import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { getMyClinic, updateMyClinic, pharmacyApi, type MyClinic } from "@/lib/api";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "@/hooks/use-toast";

const READ_ONLY_MESSAGE = "Only your office manager can change these settings.";

const NONE = "__none__";

export function ClinicSettingsModal({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved?: (c: MyClinic) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", phone: "", fax: "", address: "", default_pharmacy_id: "" });
  const [forbidden, setForbidden] = useState<string | null>(null);

  const { data: clinic, isLoading: loadingClinic } = useQuery({
    queryKey: ["my-clinic"],
    queryFn: getMyClinic,
    enabled: open,
  });
  const { data: profile } = useProfile();
  // Optimistic default (true) until the profile loads, so the form doesn't
  // flash to read-only for the common case; a real 403 is still caught below.
  const canEdit = profile?.can_edit_clinic_settings !== false;
  const { data: pharmData } = useQuery({
    queryKey: ["pharmacies"],
    queryFn: () => pharmacyApi.getPharmacies(),
    enabled: open,
  });
  const pharmacies = pharmData?.items ?? [];

  useEffect(() => {
    if (clinic) {
      setForm({
        name: clinic.name ?? "",
        phone: clinic.phone ?? "",
        fax: clinic.fax ?? "",
        address: clinic.address ?? "",
        default_pharmacy_id: clinic.default_pharmacy_id ?? "",
      });
    }
  }, [clinic]);

  useEffect(() => {
    if (open) setForbidden(null);
  }, [open]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: () =>
      updateMyClinic({
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        fax: form.fax.trim() || null,
        address: form.address.trim() || null,
        default_pharmacy_id: form.default_pharmacy_id || null,
      }),
    onSuccess: (updated) => {
      toast({ title: "Clinic settings saved" });
      qc.invalidateQueries({ queryKey: ["my-clinic"] });
      onSaved?.(updated);
      onOpenChange(false);
    },
    onError: (e: any) => {
      const message = e?.message || "Try again";
      // A 403 means permissions changed since load (e.g. role changed under
      // them) — fall back to the same read-only messaging as the gate above.
      if (String(e?.message || "").toLowerCase().includes("office manager")) {
        setForbidden(message);
      }
      toast({ title: "Couldn't save", description: message, variant: "destructive" });
    },
  });

  const readOnly = !canEdit || !!forbidden;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />Clinic Settings</DialogTitle>
        </DialogHeader>

        {loadingClinic ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-4">
            {readOnly && (
              <p className="text-xs text-muted-foreground">{forbidden || READ_ONLY_MESSAGE}</p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="cs-name">Clinic Name</Label>
              <Input id="cs-name" value={form.name} onChange={(e) => set("name", e.target.value)} disabled={readOnly} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label htmlFor="cs-phone">Phone</Label><Input id="cs-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} disabled={readOnly} /></div>
              <div className="space-y-1.5"><Label htmlFor="cs-fax">Fax</Label><Input id="cs-fax" value={form.fax} onChange={(e) => set("fax", e.target.value)} disabled={readOnly} /></div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cs-address">Address</Label>
              <Input id="cs-address" value={form.address} onChange={(e) => set("address", e.target.value)} disabled={readOnly} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cs-pharm">Default Pharmacy</Label>
              <Combobox
                id="cs-pharm"
                placeholder="Select a pharmacy"
                value={form.default_pharmacy_id || NONE}
                onValueChange={(v) => set("default_pharmacy_id", v === NONE ? "" : v)}
                options={[{ value: NONE, label: "No default" }, ...pharmacies.map((p) => ({ value: p.id, label: p.name }))]}
                disabled={readOnly}
              />
              <p className="text-xs text-muted-foreground">New referrals default to this pharmacy — you can still change it per referral.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
              <div><p className="text-xs text-muted-foreground">Specialty</p><p className="text-sm capitalize text-foreground">{clinic?.specialty || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">NPI</p><p className="text-sm font-mono text-foreground">{clinic?.npi || "—"}</p></div>
            </div>
            <p className="text-xs text-muted-foreground">Specialty and NPI are managed by your Dirxctional admin — contact us to change them.</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mut.isPending}>
            {readOnly ? "Close" : "Cancel"}
          </Button>
          {!readOnly && (
            <Button onClick={() => mut.mutate()} disabled={mut.isPending || loadingClinic || !form.name.trim()}>
              {mut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}Save Settings
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
