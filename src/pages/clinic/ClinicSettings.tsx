import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

export default function ClinicSettings() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your clinic profile and preferences</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 card-shadow space-y-4">
        <h3 className="font-semibold text-foreground">Clinic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Clinic Name</Label>
            <Input defaultValue={user?.clinic_name} />
          </div>
          <div className="space-y-2">
            <Label>Contact Email</Label>
            <Input defaultValue="admin@dallasdermatology.com" />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input defaultValue="(214) 555-0200" />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input defaultValue="5500 Greenville Ave, Dallas, TX 75206" />
          </div>
        </div>
        <div className="pt-2">
          <Button>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}
