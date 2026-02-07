import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminSettings() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage admin preferences and platform configuration</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 card-shadow space-y-4">
        <h3 className="font-semibold text-foreground">Admin Profile</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input defaultValue="Admin User" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input defaultValue="admin@referralflow.com" />
          </div>
        </div>
        <div className="pt-2">
          <Button>Save Changes</Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 card-shadow space-y-4">
        <h3 className="font-semibold text-foreground">Platform Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Default Pharmacy</Label>
            <Input defaultValue="Optum - Dallas Hub" />
          </div>
          <div className="space-y-2">
            <Label>Auto-assign Threshold</Label>
            <Input defaultValue="0.85" type="number" step="0.05" />
          </div>
        </div>
        <div className="pt-2">
          <Button>Save Configuration</Button>
        </div>
      </div>
    </div>
  );
}
