import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/icons";
import { Badge } from "@/components/ui";
import { buttonQuiet } from "@/components/workbook/form";
import type { PathStep } from "@/core/path";

export function StepPageFrame({ steps, currentId, children }: { steps: PathStep[]; currentId: string; children: ReactNode }) {
  return (
    <div className="step-page">
      <div className="step-page-grid">
        <StepNavigation steps={steps} currentId={currentId} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

function StepNavigation({ steps, currentId }: { steps: PathStep[]; currentId: string }) {
  return (
    <nav className="step-menu" aria-label="Path steps">
      <p className="step-menu-heading">Steps</p>
      <ol className="step-menu-list">
        {steps.map((step, index) => {
          const current = step.id === currentId;
          return (
            <li key={step.id} className="step-menu-item">
              <Link href={step.href} aria-current={current ? "step" : undefined} className={`step-menu-link ${current ? "step-menu-link-current" : ""}`}>
                <span className="step-menu-number" aria-hidden>
                  {index + 1}
                </span>
                <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
                  <span className="step-menu-title">{step.title}</span>
                  {step.needsConfirmation && <Badge tone="warn">Needs confirmation</Badge>}
                </span>
                {!step.needsConfirmation && step.done && <span className="step-menu-status">Done</span>}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function NextStepLink({ nextStep }: { nextStep: PathStep | null }) {
  return (
    <Link href={nextStep?.href ?? "/today"} className={`${buttonQuiet} gap-1.5 border border-line bg-paper hover:border-teal/60`}>
      {nextStep ? `Next step: ${nextStep.title}` : "Back to Home"}
      <Icon name="next" size={16} />
    </Link>
  );
}
