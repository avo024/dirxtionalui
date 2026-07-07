import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateMyAdminProfile } from "@/lib/api";
import { ADMIN_PROFILE_QUERY_KEY } from "@/hooks/useAdminProfile";
import { useToast } from "@/hooks/use-toast";

interface FormState {
  first_name: string;
  last_name: string;
  phone: string;
}

interface FormErrors {
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export function CompleteAdminProfileModal() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>({
    first_name: "",
    last_name: "",
    phone: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const mutation = useMutation({
    mutationFn: updateMyAdminProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_PROFILE_QUERY_KEY });
      toast({ title: "Profile saved", description: "Welcome aboard!" });
    },
    onError: (err: Error) => {
      toast({
        title: "Couldn't save profile",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!form.first_name.trim()) next.first_name = "First name is required";
    if (!form.last_name.trim()) next.last_name = "Last name is required";
    if (!form.phone.trim()) next.phone = "Phone is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      phone: form.phone.trim(),
    });
  };

  const update = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="complete-admin-profile-title"
    >
      <div className="w-full max-w-md bg-card border border-border rounded-lg shadow-xl p-8">
        <div className="mb-6">
          <h2 id="complete-admin-profile-title" className="text-2xl font-bold text-foreground">
            Welcome to Dirxctional
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Tell us a bit about you so your teammates see who you are.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="first_name">First Name <span className="text-destructive">*</span></Label>
              <Input
                id="first_name"
                value={form.first_name}
                onChange={update("first_name")}
                autoFocus
                aria-invalid={!!errors.first_name}
              />
              {errors.first_name && (
                <p className="text-xs text-destructive">{errors.first_name}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last_name">Last Name <span className="text-destructive">*</span></Label>
              <Input
                id="last_name"
                value={form.last_name}
                onChange={update("last_name")}
                aria-invalid={!!errors.last_name}
              />
              {errors.last_name && (
                <p className="text-xs text-destructive">{errors.last_name}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone <span className="text-destructive">*</span></Label>
            <Input
              id="phone"
              type="tel"
              placeholder="e.g. 555-123-4567"
              value={form.phone}
              onChange={update("phone")}
              aria-invalid={!!errors.phone}
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full mt-2"
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save & Continue
          </Button>
        </form>
      </div>
    </div>
  );
}
