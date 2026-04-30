import { useState } from "react";
import { Loader2 } from "lucide-react";
import { updateUserAttributes, fetchAuthSession } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const ONBOARDED_KEY = "dxctn_onboarded";

interface WelcomeNicknameModalProps {
  defaultFirst?: string;
  defaultLast?: string;
  onDismiss: () => void;
}

export function WelcomeNicknameModal({
  defaultFirst = "",
  defaultLast = "",
  onDismiss,
}: WelcomeNicknameModalProps) {
  const { toast } = useToast();
  const [first, setFirst] = useState(defaultFirst);
  const [last, setLast] = useState(defaultLast);
  const [saving, setSaving] = useState(false);

  const markOnboarded = () => {
    try {
      localStorage.setItem(ONBOARDED_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const handleSkip = () => {
    markOnboarded();
    onDismiss();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const nickname = `${first.trim()} ${last.trim()}`.trim();
    if (!nickname) {
      toast({
        title: "Add a name",
        description: "Enter a first or last name, or click Skip.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      await updateUserAttributes({
        userAttributes: { nickname },
      });
      // Force a token refresh so the new nickname claim flows through.
      try {
        await fetchAuthSession({ forceRefresh: true });
        Hub.dispatch("auth", { event: "tokenRefresh" });
      } catch {
        /* ignore */
      }
      markOnboarded();
      toast({ title: "Display name saved", description: "Welcome aboard!" });
      onDismiss();
    } catch (err) {
      toast({
        title: "Couldn't save display name",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-nickname-title"
    >
      <div className="w-full max-w-md bg-card border border-border rounded-lg shadow-xl p-8">
        <div className="mb-6">
          <h2
            id="welcome-nickname-title"
            className="text-2xl font-bold text-foreground"
          >
            Welcome to DiRxctional — what should your teammates call you?
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Your legal name is on file with us. Set a display name your teammates
            will see in the platform.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="display_first">Display first name</Label>
              <Input
                id="display_first"
                value={first}
                onChange={(e) => setFirst(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="display_last">Display last name</Label>
              <Input
                id="display_last"
                value={last}
                onChange={(e) => setLast(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" className="w-full mt-2" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>

          <button
            type="button"
            onClick={handleSkip}
            disabled={saving}
            className="block w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
          >
            Skip — keep my legal name as my display name
          </button>
        </form>
      </div>
    </div>
  );
}
