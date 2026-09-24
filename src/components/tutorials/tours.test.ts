import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TOURS } from "./tours";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = path.resolve(__dirname, "..", "..");

/** Every `element: '[data-tour="..."]'` selector referenced by a tour step. */
function tourAnchors(): string[] {
  const anchors = new Set<string>();
  for (const tour of Object.values(TOURS)) {
    for (const step of tour.steps) {
      if (!step.element) continue;
      const match = step.element.match(/data-tour="([^"]+)"/);
      if (match) anchors.add(match[1]);
    }
  }
  return [...anchors];
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

/**
 * useTour navigates to a tour's route and waits for its first anchored
 * element before starting driver.js (see useTour.ts). If a step's
 * `data-tour` anchor is renamed or removed from the page it targets without
 * updating tours.ts, the tour silently degrades to a centered popover (or
 * times out waiting). This test catches that class of drift by asserting
 * every anchor a tour references still appears — literally, since some
 * anchors are set dynamically (e.g. `data-tour={item.tour}` in
 * ClinicSidebar) — somewhere in the app's .tsx source.
 */
describe("tours.ts anchors", () => {
  const anchors = tourAnchors();
  const tsxFiles = walk(SRC_ROOT);
  const tsxSource = tsxFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");

  it("has at least one anchored step across the tour set", () => {
    expect(anchors.length).toBeGreaterThan(0);
  });

  it.each(anchors)("data-tour anchor %s exists somewhere in src/**/*.tsx", (anchor) => {
    expect(tsxSource.includes(anchor)).toBe(true);
  });
});
