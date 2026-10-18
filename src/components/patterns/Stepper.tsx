import { Fragment } from "react";
import { Check } from "lucide-react";

interface StepperProps {
  steps: string[];
  current: number;
  onStep?: (i: number) => void;
  "data-tour"?: string;
}

/** The wizard's only progress chrome. Done steps are navy with a check and clickable; current is ringed. */
export function Stepper({ steps, current, onStep, ...rest }: StepperProps) {
  return (
    <ol className="stp" aria-label="Referral steps" {...rest}>
      {steps.map((s, i) => {
        const done = i < current;
        return (
          <Fragment key={s}>
            {i > 0 && <span className="bar" aria-hidden="true" />}
            <li
              data-s={done ? "done" : i === current ? "current" : "todo"}
              aria-current={i === current ? "step" : undefined}
              onClick={() => done && onStep?.(i)}
              style={{ cursor: done ? "pointer" : "default" }}
            >
              <span className="n">{done ? <Check width={14} height={14} strokeWidth={2} aria-hidden="true" /> : i + 1}</span>
              {s}
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
