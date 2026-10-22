import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACTIVITY_THROTTLE_MS,
  IDLE_MINUTES,
  LAST_ACTIVITY_KEY,
  SIGN_OUT_KEY,
  WARN_SECONDS,
  broadcastSignOut,
  computeIdleState,
  createIdleController,
  DEFAULT_TIMINGS,
  type IdleState,
} from "./idleTimeout";

const MIN = 60_000;

function setup() {
  const states: IdleState[] = [];
  const onExpire = vi.fn();
  const onRemoteSignOut = vi.fn();
  const c = createIdleController({
    onState: (s) => states.push(s),
    onExpire,
    onRemoteSignOut,
  });
  c.start();
  const last = () => states[states.length - 1];
  return { c, states, last, onExpire, onRemoteSignOut };
}

describe("idle timeout", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-21T09:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("policy constants are 20 minutes with a 60 second warning", () => {
    expect(IDLE_MINUTES).toBe(20);
    expect(WARN_SECONDS).toBe(60);
    expect(DEFAULT_TIMINGS).toEqual({ idleMs: 20 * MIN, warnMs: 60_000 });
  });

  it("computeIdleState: active, warning at 19:00, expired at 20:00", () => {
    const t = DEFAULT_TIMINGS;
    expect(computeIdleState(18 * MIN + 59_000, 0, t).phase).toBe("active");
    expect(computeIdleState(19 * MIN, 0, t)).toEqual({ phase: "warning", secondsLeft: 60 });
    expect(computeIdleState(19 * MIN + 45_000, 0, t)).toEqual({ phase: "warning", secondsLeft: 15 });
    expect(computeIdleState(20 * MIN, 0, t).phase).toBe("expired");
  });

  it("shows the warning at 19:00 and signs out at 20:00 of inactivity", () => {
    const { c, last, onExpire } = setup();
    vi.advanceTimersByTime(19 * MIN - 1_000);
    expect(last().phase).toBe("active");
    vi.advanceTimersByTime(1_000);
    expect(last()).toEqual({ phase: "warning", secondsLeft: 60 });
    expect(onExpire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(59_000);
    expect(last()).toEqual({ phase: "warning", secondsLeft: 1 });
    vi.advanceTimersByTime(1_000);
    expect(last().phase).toBe("expired");
    expect(onExpire).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(5 * MIN);
    expect(onExpire).toHaveBeenCalledTimes(1); // fires once, timers are torn down
    c.stop();
  });

  it("activity resets the clock (throttled to once per 5 s)", () => {
    const { c, last, onExpire } = setup();
    vi.advanceTimersByTime(10 * MIN);
    window.dispatchEvent(new Event("pointerdown"));
    expect(Number(localStorage.getItem(LAST_ACTIVITY_KEY))).toBe(Date.now());

    // within the throttle window: ignored (timestamp not rewritten)
    const stamped = localStorage.getItem(LAST_ACTIVITY_KEY);
    vi.advanceTimersByTime(ACTIVITY_THROTTLE_MS - 1_000);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    expect(localStorage.getItem(LAST_ACTIVITY_KEY)).toBe(stamped);

    // after the window it is accepted again
    vi.advanceTimersByTime(1_000);
    window.dispatchEvent(new Event("scroll"));
    expect(localStorage.getItem(LAST_ACTIVITY_KEY)).not.toBe(stamped);

    // 19 minutes after the last activity (not after start) the warning appears
    vi.advanceTimersByTime(19 * MIN - 1_000);
    expect(last().phase).toBe("active");
    vi.advanceTimersByTime(1_000);
    expect(last().phase).toBe("warning");
    expect(onExpire).not.toHaveBeenCalled();
    c.stop();
  });

  it("ambient activity does not dismiss the warning; confirm() does", () => {
    const { c, last, onExpire } = setup();
    vi.advanceTimersByTime(19 * MIN + 10_000);
    expect(last().phase).toBe("warning");
    window.dispatchEvent(new Event("pointerdown"));
    window.dispatchEvent(new Event("touchstart"));
    vi.advanceTimersByTime(2_000);
    expect(last().phase).toBe("warning");

    c.confirm();
    expect(last().phase).toBe("active");
    vi.advanceTimersByTime(18 * MIN);
    expect(last().phase).toBe("active");
    expect(onExpire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(MIN + 60_000);
    expect(onExpire).toHaveBeenCalledTimes(1);
    c.stop();
  });

  it("honours a newer timestamp written by another tab", () => {
    const { c, last, onExpire } = setup();
    vi.advanceTimersByTime(19 * MIN + 30_000);
    expect(last().phase).toBe("warning");

    // another tab sees the user; its write arrives as a storage event
    const ts = String(Date.now());
    localStorage.setItem(LAST_ACTIVITY_KEY, ts);
    window.dispatchEvent(new StorageEvent("storage", { key: LAST_ACTIVITY_KEY, newValue: ts }));
    expect(last().phase).toBe("active");

    vi.advanceTimersByTime(18 * MIN);
    expect(onExpire).not.toHaveBeenCalled();
    c.stop();
  });

  it("uses timestamps: a tab that slept past the limit expires on wake-up", () => {
    const { c, onExpire } = setup();
    // simulate suspended timers: jump the clock without running intervals
    vi.setSystemTime(Date.now() + 25 * MIN);
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(onExpire).toHaveBeenCalledTimes(1);
    c.stop();
  });

  it("signs out when another tab broadcasts a sign-out", () => {
    const { onRemoteSignOut, c } = setup();
    broadcastSignOut("idle");
    const v = localStorage.getItem(SIGN_OUT_KEY)!;
    expect(v.endsWith(":idle")).toBe(true);
    window.dispatchEvent(new StorageEvent("storage", { key: SIGN_OUT_KEY, newValue: v }));
    expect(onRemoteSignOut).toHaveBeenCalledWith("idle");
    c.stop();
  });

  it("stop() removes listeners and timers", () => {
    const { c, onExpire, states } = setup();
    c.stop();
    const n = states.length;
    vi.advanceTimersByTime(30 * MIN);
    window.dispatchEvent(new Event("pointerdown"));
    expect(onExpire).not.toHaveBeenCalled();
    expect(states.length).toBe(n);
  });
});
