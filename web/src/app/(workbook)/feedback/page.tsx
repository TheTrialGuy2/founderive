import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import { FeedbackForm } from "@/components/feedback/FeedbackForm";

export default function FeedbackPage({ searchParams }: PageProps<"/feedback">) {
  return (
    <>
      <PageHeader title="Send feedback">Found a bug or have an idea? Tell us what happened.</PageHeader>
      <Suspense fallback={null}>
        {searchParams.then((sp) => (
          <FeedbackForm page={typeof sp.from === "string" && sp.from.startsWith("/") ? sp.from : ""} />
        ))}
      </Suspense>
    </>
  );
}
