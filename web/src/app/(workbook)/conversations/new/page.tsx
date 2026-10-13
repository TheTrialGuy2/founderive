import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import { ConversationForm } from "@/components/conversations/ConversationForm";
import { loadFounderToday } from "@/commands/today";

export default function NewConversationPage() {
  return (
    <>
      <PageHeader eyebrow="Conversations" title="Log a conversation">
        Write down what they said and did while it&apos;s fresh. Their words count for more than your summary.
      </PageHeader>
      <Suspense fallback={null}>
        <NewConversation />
      </Suspense>
    </>
  );
}

async function NewConversation() {
  await connection();
  return <ConversationForm mode="create" initial={{ type: "customer", date: await loadFounderToday() }} />;
}
