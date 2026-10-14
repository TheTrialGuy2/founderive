import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import { ConversationForm } from "@/components/conversations/ConversationForm";
import { loadAreaOptions } from "@/commands/canvas";
import { findPlannedConversation } from "@/commands/path";
import { loadFounderToday } from "@/commands/today";
import { safeReturnTo } from "@/lib/return-to";

export default function NewConversationPage({ searchParams }: PageProps<"/conversations/new">) {
  return (
    <>
      <PageHeader eyebrow="Conversations" title="Log a conversation">
        Write down what they said and did while it&apos;s fresh. Their words count for more than your summary.
      </PageHeader>
      <Suspense fallback={null}>
        {searchParams.then((sp) => (
          <NewConversation step={typeof sp.step === "string" ? sp.step : ""} plan={typeof sp.plan === "string" ? sp.plan : ""} />
        ))}
      </Suspense>
    </>
  );
}

async function NewConversation({ step, plan }: { step: string; plan: string }) {
  await connection();
  const areaOptions = await loadAreaOptions();
  const known = areaOptions.some(([id]) => id === step);
  // The planned conversation this logs (from the step page), offered as a checkbox only when it's real and still open.
  const planned = plan ? await findPlannedConversation(plan) : null;
  return (
    <ConversationForm
      mode="create"
      initial={{ type: "customer", date: await loadFounderToday(), areas: known ? step : "" }}
      areaOptions={areaOptions}
      returnTo={known ? (safeReturnTo(`/path/${step}`) ?? undefined) : undefined}
      plan={planned ? { value: plan, text: planned.text } : undefined}
    />
  );
}
