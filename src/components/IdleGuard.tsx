import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cognitoSignOut } from "@/lib/cognito";
import {
  clearSignedOutReason,
  createIdleController,
  getIdleTimings,
  rememberSignedOutReason,
  WARN_SECONDS,
  type IdleController,
  type IdleState,
} from "@/lib/idleTimeout";

interface IdleWarningDialogProps {
  open: boolean;
  secondsLeft: number;
  onStay: () => void;
  onSignOut: () => void;
}

/** Presentational warning dialog (also rendered by the dev-only preview page). */
export function IdleWarningDialog({ open, secondsLeft, onStay, onSignOut }: IdleWarningDialogProps) {
  const stayRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onStay()}>
      <DialogContent
        // Hide the built-in corner "x": the two buttons below are the choices.
        className="max-w-md [&>button:last-child]:hidden motion-reduce:!animate-none motion-reduce:!transition-none"
        onInteractOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => {
          // Land on the safe choice so a stray Enter keeps the session.
          e.preventDefault();
          stayRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Still there?</DialogTitle>
          <DialogDescription>
            You&rsquo;ll be signed out in {WARN_SECONDS} seconds to protect patient information.
          </DialogDescription>
        </DialogHeader>
        <p
          role="timer"
          aria-live="off"
          className="m-0 font-mono text-sm tabular-nums text-muted-foreground"
        >
          Signing out in <span className="font-semibold text-foreground">{secondsLeft}</span>{" "}
          {secondsLeft === 1 ? "second" : "seconds"}
        </p>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onSignOut}>
            Sign out now
          </Button>
          <Button ref={stayRef} onClick={onStay}>
            I&rsquo;m still here
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IdleGuardInner() {
  const navigate = useNavigate();
  // useNavigate()'s identity changes on every route change; keep it in a ref so
  // the controller is created exactly once per mount and never restarted.
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const controllerRef = useRef<IdleController | null>(null);
  const [state, setState] = useState<IdleState>({ phase: "active", secondsLeft: WARN_SECONDS });

  useEffect(() => {
    // A new authenticated session started: forget any earlier sign-out reason.
    clearSignedOutReason();

    const leave = async (reason: "idle" | "manual", broadcast: boolean) => {
      if (reason === "idle") rememberSignedOutReason("idle");
      try {
        await cognitoSignOut({ broadcast, reason });
      } catch {
        // Sign-out must never strand the user on a PHI screen; fall through.
      }
      navigateRef.current(reason === "idle" ? "/login?reason=idle" : "/login", { replace: true });
    };

    const controller = createIdleController({
      timings: getIdleTimings(),
      onState: setState,
      onExpire: () => void leave("idle", true),
      onRemoteSignOut: (reason) => void leave(reason, false),
    });
    controllerRef.current = controller;
    controller.start();
    return () => {
      controller.stop();
      controllerRef.current = null;
    };
  }, []);

  return (
    <IdleWarningDialog
      open={state.phase === "warning"}
      secondsLeft={state.secondsLeft}
      onStay={() => controllerRef.current?.confirm()}
      onSignOut={() => {
        controllerRef.current?.stop();
        void (async () => {
          try {
            await cognitoSignOut({ reason: "manual" });
          } catch {
            /* ignore */
          }
          navigateRef.current("/login", { replace: true });
        })();
      }}
    />
  );
}

/**
 * HIPAA automatic logoff. Mount once inside the authenticated shell
 * (ClinicLayout / AdminLayout), never on public pages. No-op in the demo build.
 */
export function IdleGuard() {
  if (import.meta.env.VITE_DEMO) return null;
  return <IdleGuardInner />;
}
