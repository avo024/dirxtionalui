// Demo entry: install the fake backend BEFORE the app (and its api layer) loads.
import { handleDemoRequest, setScenario, resetStore, SCENARIOS } from "./server";

const PREFIX = "/demo-api";
const realFetch = window.fetch.bind(window);

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  let url: URL;
  try { url = new URL(raw, window.location.href); } catch { return realFetch(input, init); }
  const relative = raw.startsWith(PREFIX);
  if (!relative && !(url.origin === window.location.origin && url.pathname.startsWith(PREFIX))) {
    return realFetch(input, init);
  }

  // path after /demo-api, including the query string
  const full = relative ? raw : url.pathname + url.search;
  const path = full.slice(PREFIX.length) || "/";
  const method = (init?.method || (typeof input !== "string" && !(input instanceof URL) ? input.method : "GET")).toUpperCase();
  let body: unknown = init?.body ?? undefined;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { /* leave as text */ } }

  await new Promise((r) => setTimeout(r, 90)); // a little latency so loading states are real
  const res = await handleDemoRequest(method, path, body);
  return new Response(JSON.stringify(res.json ?? null), { status: res.status, headers: { "Content-Type": "application/json" } });
};

// App.tsx keeps its QueryClient private (only one edit to that file is allowed),
// so nudge react-query the way returning to the tab would: it refetches active
// queries on visibilitychange/focus.
const refetchAll = () => window.setTimeout(() => {
  window.dispatchEvent(new Event("visibilitychange"));
  window.dispatchEvent(new Event("focus"));
}, 30);

declare global {
  interface Window { dirxDemo: { reset: () => void; setScenario: (name: string) => void; scenarios: readonly string[] } }
}
window.dirxDemo = {
  reset: () => { resetStore(); refetchAll(); },
  setScenario: (name: string) => { setScenario(name); refetchAll(); },
  scenarios: SCENARIOS,
};

// Product tour popups are off by default; the Help menu still launches them.
try { localStorage.setItem("dx_tour_overview_seen", "1"); } catch { /* ignore */ }

// ?scenario=<name> in the hash, e.g. index.html#/clinic/dashboard?scenario=sent
const fromHash = /[?&]scenario=([a-z_]+)/.exec(window.location.hash)?.[1];
if (fromHash) setScenario(fromHash);

void import("./boot");
