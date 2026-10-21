import { useState } from "react";
import { IdleWarningDialog } from "@/components/IdleGuard";

/** Dev-only (`/__idle-preview`): renders the idle warning dialog with a fixed countdown. Not routed in production builds. */
export default function IdlePreview() {
  const [open, setOpen] = useState(true);
  const secondsLeft = Number(new URLSearchParams(window.location.search).get("s") ?? "42");
  return (
    <div className="min-h-screen bg-background p-8">
      <p className="text-sm text-muted-foreground">Idle warning preview (dev only).</p>
      <IdleWarningDialog
        open={open}
        secondsLeft={secondsLeft}
        onStay={() => setOpen(false)}
        onSignOut={() => setOpen(false)}
      />
    </div>
  );
}
