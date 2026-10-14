import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import { ConversationForm } from "@/components/conversations/ConversationForm";
import { loadAreaOptions } from "@/commands/canvas";
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
          <NewConversation step={typeof sp.step === "string" ? sp.step : ""} />
        ))}
      </Suspense>
    </>
  );
}

async function NewConversation({ step }: { step: string }) {
  await connection();
  const areaOptions = await loadAreaOptions();
  const known = areaOptions.some(([id]) => id === step);
  return (
    <ConversationForm
      mode="create"
      initial={{ type: "customer", date: await loadFounderToday(), areas: known ? step : "" }}
      areaOptions={areaOptions}
      returnTo={known ? (safeReturnTo(`/path/${step}`) ?? undefined) : undefined}
    />
  );
}
