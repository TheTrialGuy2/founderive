import Link from "next/link";
import { Card, formatDate } from "@/components/ui";
import type { CurrentTest } from "@/core/venture-tests";
import { STRENGTH_LABELS } from "@/lib/loop-labels";

const link = "mt-3 inline-block text-sm font-medium text-teal-dark hover:text-navy";

/** Amendment §5.2 item 3: the current test and its due date. Informational; the next action card holds the primary action. */
export function CurrentTestCard({ test, plannedCount, today }: { test: CurrentTest | null; plannedCount: number; today: string }) {
  if (!test) {
    return (
      <Card title="Current test">
        <p className="text-sm text-muted">{plannedCount > 0 ? `No test running. ${plannedCount} planned.` : "No test running."}</p>
        <Link href={plannedCount > 0 ? "/tests" : "/tests/new"} className={link}>
          {plannedCount > 0 ? "See planned tests" : "Design a test"}
        </Link>
      </Card>
    );
  }
  const due = test.due ? (test.due < today ? `Overdue · was due ${formatDate(test.due)}` : `Due ${formatDate(test.due)}`) : "No due date";
  return (
    <Card title="Current test">
      <p className="font-medium text-ink">{test.title}</p>
      <p className="mt-1 text-sm text-muted">
        {due} · {test.linkedCount} linked · {test.evidenceCount} customer evidence · Strength: {STRENGTH_LABELS[test.evidenceStrength]}
      </p>
      <Link href={`/tests/${test.slug}`} className={link}>
        View the test
      </Link>
    </Card>
  );
}
