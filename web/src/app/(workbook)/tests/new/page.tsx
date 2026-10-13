import { PageHeader } from "@/components/ui";
import { TestForm } from "@/components/tests/TestForm";

export default function NewTestPage() {
  return (
    <>
      <PageHeader eyebrow="Tests" title="Design a test">
        Write the belief, a small way to check it, and what would count as supported or contradicted, before you start.
      </PageHeader>
      <TestForm initial={{ startNow: "on" }} />
    </>
  );
}
