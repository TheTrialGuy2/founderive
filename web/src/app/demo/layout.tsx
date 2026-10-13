import { Shell } from "@/components/Shell";
import { DemoProvider } from "@/state/DemoStore";

// The original clickable wireframe (fictional data), kept for program-team demos.
export default function DemoLayout({ children }: LayoutProps<"/demo">) {
  return (
    <DemoProvider>
      <Shell>{children}</Shell>
    </DemoProvider>
  );
}
