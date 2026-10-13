import { Badge } from "@/components/ui";
import { ActionButton } from "@/components/today/ActionButton";
import { confirmImportedRecordAction } from "@/app/(workbook)/import/actions";

/** An imported draft: shown with where it came from until the founder confirms it as theirs. */
export function SeededNote({ path, source, badge = "Imported — confirm", note }: { path: string; source?: string | null; badge?: string; note?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-sand/60 p-3 text-sm">
      <Badge tone="warn">{badge}</Badge>
      <span className="text-ink">
        Drafted from {source ?? "an import"}. Check it, then confirm it as yours.{note ? ` ${note}` : ""}
      </span>
      <ActionButton action={confirmImportedRecordAction} fields={{ path }} label="Confirm this record" variant="quiet" />
    </div>
  );
}
