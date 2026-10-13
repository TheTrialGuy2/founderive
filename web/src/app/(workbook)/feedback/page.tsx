import { Suspense } from "react";
import { PageHeader } from "@/components/ui";
import { FeedbackForm } from "@/components/feedback/FeedbackForm";
import { routePattern } from "@/lib/feedback";

export default function FeedbackPage({ searchParams }: PageProps<"/feedback">) {
  return (
    <>
      <PageHeader title="Send feedback">Found a bug or have an idea? Tell us what happened.</PageHeader>
      <Suspense fallback={null}>
        {searchParams.then((sp) => (
          <FeedbackForm page={typeof sp.from === "string" && sp.from.startsWith("/") ? routePattern(sp.from) : ""} />
        ))}
      </Suspense>
    </>
  );
}
