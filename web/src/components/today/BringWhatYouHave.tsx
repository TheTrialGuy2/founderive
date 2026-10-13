import Link from "next/link";
import { Card } from "@/components/ui";
import { dismissBringWhatYouHaveAction } from "@/app/(workbook)/import/actions";
import { ActionButton } from "./ActionButton";

const link = "font-medium text-teal-dark hover:text-navy";

/** Secondary: offered until the founder imports something or says "Not now". Never above the next action. */
export function BringWhatYouHave() {
  return (
    <Card title="Bring what you have">
      <p className="text-sm text-muted">Worked on this already, in an AI chat or in documents? Bring it in as drafts you confirm.</p>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
        <Link href="/import" className={link}>
          Paste from a chat
        </Link>
        <Link href="/import/folder" className={link}>
          Import a folder
        </Link>
        <ActionButton action={dismissBringWhatYouHaveAction} fields={{}} label="Not now" ariaLabel="Not now: hide Bring what you have" variant="quiet" />
      </div>
    </Card>
  );
}
