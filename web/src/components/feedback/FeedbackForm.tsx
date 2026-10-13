"use client";

import { useActionState } from "react";
import { sendFeedbackAction } from "@/app/(workbook)/feedback/actions";
import { describedBy, Field, FormAlert } from "@/components/workbook/Field";
import { buttonPrimary, buttonQuiet, inputClass } from "@/components/workbook/form";
import { IDLE } from "@/lib/action-state";
import { FEEDBACK_EMAIL } from "@/lib/feedback";

const PAGE_HINT = "Filled in from the page you came from. Change it if it's wrong.";

export function FeedbackForm({ page }: { page: string }) {
  const [state, formAction, pending] = useActionState(sendFeedbackAction, IDLE);
  const links = state.result;

  if (state.status === "saved" && links) {
    // Nothing opens on its own: the founder reads exactly what will be sent, then chooses where to send it.
    return (
      <div role="status" className="max-w-2xl space-y-4 rounded-xl border border-line bg-paper p-5">
        <p className="font-semibold text-navy">Thanks. A copy is saved in your data folder, at {links.path}.</p>
        <SendChoices links={links} />
      </div>
    );
  }

  const v = state.values ?? {};
  const err = state.errors ?? {};
  return (
    <form action={formAction} className="max-w-2xl space-y-5" noValidate>
      <FormAlert message={state.status === "error" ? state.message : undefined} />
      {state.status === "error" && links && <SendChoices links={links} />}
      <Field id="whatHappened" label="What happened" error={err.whatHappened}>
        <textarea
          id="whatHappened"
          name="whatHappened"
          rows={4}
          defaultValue={v.whatHappened}
          className={inputClass}
          aria-invalid={!!err.whatHappened}
          aria-describedby={describedBy("whatHappened", err.whatHappened)}
        />
      </Field>
      <Field id="page" label="Page" hint={PAGE_HINT}>
        <input id="page" name="page" defaultValue={v.page ?? page} className={inputClass} aria-describedby={describedBy("page", undefined, PAGE_HINT)} />
      </Field>
      <Field id="expected" label="What you expected (optional)">
        <textarea id="expected" name="expected" rows={2} defaultValue={v.expected} className={inputClass} />
      </Field>
      <p className="text-xs text-muted">Only what you type here, the page and the app version are sent. Nothing from founder-data is included unless you paste it.</p>
      <button type="submit" disabled={pending} className={buttonPrimary}>
        {pending ? "Saving…" : "Send feedback"}
      </button>
    </form>
  );
}

function SendChoices({ links }: { links: Record<string, string> }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-ink">This is exactly what will be sent:</p>
      <pre className="rounded-md border border-line bg-canvas p-3 text-sm whitespace-pre-wrap text-ink">{links.text}</pre>
      <div className="flex flex-wrap items-center gap-3">
        <a href={links.mailto} className={buttonPrimary}>
          Email it to {FEEDBACK_EMAIL}
        </a>
        <a href={links.issue} target="_blank" rel="noopener noreferrer" className={buttonQuiet}>
          Open a public GitHub issue
        </a>
      </div>
      <p className="text-xs text-muted">GitHub issues are public: anyone can read them.</p>
    </div>
  );
}
