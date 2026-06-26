/**
 * useTour — runs a named onboarding tour (see tours.ts) via driver.js.
 *
 * Replayable tours may be launched from any page, so runTour():
 *   1. navigates to the tour's declared route if we're not already there,
 *   2. waits (polls) for the first anchored element to mount,
 *   3. then starts driver.js.
 *
 * Steps without an `element` render as centered popovers. If an anchored element
 * never appears (e.g. the page changed), the tour still starts — driver.js shows
 * those steps centered rather than failing.
 */
import { useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { TOURS } from "./tours";

function waitForElement(selector: string, timeout = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.querySelector(selector)) return resolve(true);
    const start = Date.now();
    const interval = window.setInterval(() => {
      if (document.querySelector(selector)) {
        window.clearInterval(interval);
        resolve(true);
      } else if (Date.now() - start > timeout) {
        window.clearInterval(interval);
        resolve(false);
      }
    }, 100);
  });
}

export function useTour() {
  const navigate = useNavigate();
  const location = useLocation();

  const runTour = useCallback(
    (key: string) => {
      const tour = TOURS[key];
      if (!tour) return;

      const steps: DriveStep[] = tour.steps.map((s) => ({
        element: s.element,
        popover: {
          title: s.title,
          description: s.description,
          side: s.side,
          align: s.align,
        },
      }));

      const start = () => {
        const d = driver({
          showProgress: true,
          animate: true,
          allowClose: true,
          overlayOpacity: 0.6,
          stagePadding: 6,
          nextBtnText: "Next",
          prevBtnText: "Back",
          doneBtnText: "Done",
          steps,
        });
        d.drive();
      };

      const firstSelector = tour.steps.find((s) => s.element)?.element;

      const begin = () => {
        if (firstSelector) {
          waitForElement(firstSelector).then(start);
        } else {
          // No anchored first step — give the route a tick to settle.
          window.setTimeout(start, 250);
        }
      };

      if (tour.route && location.pathname !== tour.route) {
        navigate(tour.route);
        begin();
      } else {
        begin();
      }
    },
    [navigate, location.pathname],
  );

  return { runTour };
}
