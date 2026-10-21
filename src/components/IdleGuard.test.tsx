import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const cognitoSignOut = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/cognito", () => ({ cognitoSignOut: (...a: unknown[]) => cognitoSignOut(...a) }));

import { IdleGuard } from "./IdleGuard";
import { readSignedOutReason } from "@/lib/idleTimeout";

const MIN = 60_000;

function Where() {
  const l = useLocation();
  return <div data-testid="where">{l.pathname + l.search}</div>;
}
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

function renderGuard() {
  act(() => {
    root.render(
      <MemoryRouter initialEntries={["/clinic/dashboard"]}>
        <IdleGuard />
        <Routes>
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
  });
}

const text = () => document.body.textContent ?? "";
const where = () => host.querySelector("[data-testid=where]")!.textContent;
const button = (name: string) =>
  Array.from(document.body.querySelectorAll("button")).find((b) => b.textContent === name)!;
const click = (el: Element) => el.dispatchEvent(new MouseEvent("click", { bubbles: true }));

describe("IdleGuard", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    cognitoSignOut.mockClear();
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-21T09:00:00Z"));
  });
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("warns at 19:00, 'I'm still here' resets, and nothing signs out", () => {
    renderGuard();
    expect(text()).not.toContain("Still there?");
    act(() => void vi.advanceTimersByTime(19 * MIN));
    expect(text()).toContain("Still there?");
    expect(text()).toContain("You’ll be signed out in 60 seconds to protect patient information.");
    act(() => void vi.advanceTimersByTime(20_000));
    expect(document.body.querySelector("[role=timer]")!.textContent).toBe("Signing out in 40 seconds");

    act(() => click(button("I’m still here")));
    expect(text()).not.toContain("Still there?");
    act(() => void vi.advanceTimersByTime(10 * MIN));
    expect(cognitoSignOut).not.toHaveBeenCalled();
  });

  it("signs out globally at 20:00 and goes to /login?reason=idle", async () => {
    renderGuard();
    await act(async () => void vi.advanceTimersByTime(20 * MIN));
    expect(cognitoSignOut).toHaveBeenCalledTimes(1);
    expect(cognitoSignOut).toHaveBeenCalledWith({ broadcast: true, reason: "idle" });
    expect(readSignedOutReason()).toBe("idle");
    expect(where()).toBe("/login?reason=idle");
  });

  it("'Sign out now' signs out immediately", async () => {
    renderGuard();
    act(() => void vi.advanceTimersByTime(19 * MIN));
    await act(async () => {
      click(button("Sign out now"));
    });
    expect(cognitoSignOut).toHaveBeenCalledTimes(1);
    expect(where()).toBe("/login");
  });

  it("is a no-op in the demo build", () => {
    vi.stubEnv("VITE_DEMO", "1");
    renderGuard();
    act(() => void vi.advanceTimersByTime(25 * MIN));
    expect(text()).not.toContain("Still there?");
    expect(cognitoSignOut).not.toHaveBeenCalled();
    expect(localStorage.getItem("dx:lastActivity")).toBeNull();
  });
});
