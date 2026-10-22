/**
 * HIPAA automatic logoff: idle-timeout state machine.
 *
 * Pure DOM/localStorage logic (no React, no Amplify) so it is unit-testable
 * with fake timers. The React wrapper is components/IdleGuard.tsx.
 *
 * Design notes
 *  - Timestamps, not accumulated intervals: every tick recomputes
 *    `now - lastActivity`, so throttled/suspended background tabs and sleeping
 *    laptops are handled correctly when they wake up.
 *  - `lastActivity` lives in localStorage (`dx:lastActivity`) so activity in any
 *    tab keeps every other tab alive. Only a timestamp is stored, never PHI.
 *  - Once the warning dialog is showing, ambient activity (mouse moves etc.) is
 *    ignored on purpose: the user must press "I'm still here".
 */

// --- Constants (the one place to change the policy) -------------------------
export const IDLE_MINUTES = 20;
export const WARN_SECONDS = 60;

export const ACTIVITY_THROTTLE_MS = 5_000;
export const TICK_MS = 1_000;

export const LAST_ACTIVITY_KEY = "dx:lastActivity";
/** localStorage key written to tell every other tab to sign out. */
export const SIGN_OUT_KEY = "dx:signOut";
/** sessionStorage key: survives the Cognito logout round-trip in the same tab. */
export const SIGNED_OUT_REASON_KEY = "dx:signedOutReason";

export type SignOutReason = "idle" | "manual";

export interface IdleTimings {
  idleMs: number;
  warnMs: number;
}

export const DEFAULT_TIMINGS: IdleTimings = {
  idleMs: IDLE_MINUTES * 60_000,
  warnMs: WARN_SECONDS * 1_000,
};

/**
 * Dev-only: `?idleTest=1` shortens the timers to seconds so the flow can be
 * exercised by hand. `import.meta.env.DEV` is false in production builds, so
 * this branch is stripped from the shipped bundle.
 */
export function getIdleTimings(search?: string): IdleTimings {
  if (import.meta.env.DEV) {
    const q = search ?? (typeof window !== "undefined" ? window.location.search : "");
    if (new URLSearchParams(q).get("idleTest") === "1") {
      return { idleMs: 25_000, warnMs: 10_000 };
    }
  }
  return DEFAULT_TIMINGS;
}

// --- Safe storage helpers ---------------------------------------------------
function local(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}
function session(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

/** Tell every other tab to sign out (they react to the `storage` event). */
export function broadcastSignOut(reason: SignOutReason = "manual"): void {
  try {
    local()?.setItem(SIGN_OUT_KEY, `${Date.now()}:${Math.random().toString(36).slice(2)}:${reason}`);
  } catch {
    /* storage unavailable: other tabs fall back to their own idle timer */
  }
}

export function rememberSignedOutReason(reason: SignOutReason): void {
  try {
    session()?.setItem(SIGNED_OUT_REASON_KEY, reason);
  } catch {
    /* ignore */
  }
}
export function readSignedOutReason(): string | null {
  try {
    return session()?.getItem(SIGNED_OUT_REASON_KEY) ?? null;
  } catch {
    return null;
  }
}
export function clearSignedOutReason(): void {
  try {
    session()?.removeItem(SIGNED_OUT_REASON_KEY);
  } catch {
    /* ignore */
  }
}

// --- State machine ----------------------------------------------------------
export type IdlePhase = "active" | "warning" | "expired";

export interface IdleState {
  phase: IdlePhase;
  /** Whole seconds until sign-out (only meaningful in the warning phase). */
  secondsLeft: number;
}

export function computeIdleState(now: number, lastActivity: number, t: IdleTimings): IdleState {
  const elapsed = Math.max(0, now - lastActivity);
  if (elapsed >= t.idleMs) return { phase: "expired", secondsLeft: 0 };
  if (elapsed >= t.idleMs - t.warnMs) {
    return { phase: "warning", secondsLeft: Math.ceil((t.idleMs - elapsed) / 1000) };
  }
  return { phase: "active", secondsLeft: Math.ceil(t.warnMs / 1000) };
}

export interface IdleControllerOptions {
  timings?: IdleTimings;
  onState: (state: IdleState) => void;
  /** Fired once when the idle limit is reached in this tab (or via another tab's timestamp). */
  onExpire: () => void;
  /** Fired when another tab signed out. */
  onRemoteSignOut: (reason: SignOutReason) => void;
}

export interface IdleController {
  start(): void;
  stop(): void;
  /** Record user activity (throttled; ignored during warning/expired). */
  noteActivity(): void;
  /** "I'm still here": explicit reset, also valid during the warning. */
  confirm(): void;
}

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  "pointerdown",
  "pointermove",
  "keydown",
  "touchstart",
  "wheel",
];

export function createIdleController(opts: IdleControllerOptions): IdleController {
  const timings = opts.timings ?? DEFAULT_TIMINGS;
  let lastLocal = 0;
  let state: IdleState = computeIdleState(0, 0, timings);
  let timer: ReturnType<typeof setInterval> | null = null;
  let running = false;

  const readStored = (): number => {
    try {
      const raw = local()?.getItem(LAST_ACTIVITY_KEY);
      const n = raw ? Number(raw) : 0;
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  };
  const write = (ts: number) => {
    lastLocal = ts;
    try {
      local()?.setItem(LAST_ACTIVITY_KEY, String(ts));
    } catch {
      /* in-memory timestamp still works for this tab */
    }
  };
  /** Freshest activity seen by this tab or any other; never in the future. */
  const lastActivity = (now: number) => Math.min(now, Math.max(lastLocal, readStored()));

  const emit = (next: IdleState) => {
    if (next.phase === state.phase && next.secondsLeft === state.secondsLeft) return;
    state = next;
    opts.onState(next);
  };

  const tick = () => {
    if (!running) return;
    const now = Date.now();
    const next = computeIdleState(now, lastActivity(now), timings);
    emit(next);
    if (next.phase === "expired") {
      stop();
      opts.onExpire();
    }
  };

  const noteActivity = () => {
    if (!running || state.phase !== "active") return;
    const now = Date.now();
    if (now - lastLocal < ACTIVITY_THROTTLE_MS) return;
    write(now);
  };

  const confirm = () => {
    if (!running) return;
    write(Date.now());
    emit(computeIdleState(Date.now(), lastLocal, timings));
  };

  const onActivityEvent = () => noteActivity();
  const onVisibility = () => {
    if (document.visibilityState !== "visible") return;
    // Check for expiry FIRST: a tab that slept past the limit must not be
    // "revived" by the very event that woke it.
    tick();
    noteActivity();
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === LAST_ACTIVITY_KEY) {
      tick();
    } else if (e.key === SIGN_OUT_KEY && e.newValue) {
      const reason: SignOutReason = e.newValue.endsWith(":idle") ? "idle" : "manual";
      stop();
      opts.onRemoteSignOut(reason);
    }
  };

  function start() {
    if (running) return;
    running = true;
    write(Date.now()); // mounting inside the authenticated shell counts as activity
    state = computeIdleState(Date.now(), lastLocal, timings);
    opts.onState(state);
    for (const ev of ACTIVITY_EVENTS) window.addEventListener(ev, onActivityEvent, { passive: true, capture: true });
    window.addEventListener("scroll", onActivityEvent, { passive: true, capture: true });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("storage", onStorage);
    timer = setInterval(tick, TICK_MS);
  }

  function stop() {
    if (!running && timer === null) return;
    running = false;
    if (timer !== null) clearInterval(timer);
    timer = null;
    for (const ev of ACTIVITY_EVENTS) window.removeEventListener(ev, onActivityEvent, { capture: true });
    window.removeEventListener("scroll", onActivityEvent, { capture: true });
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("storage", onStorage);
  }

  return { start, stop, noteActivity, confirm };
}
