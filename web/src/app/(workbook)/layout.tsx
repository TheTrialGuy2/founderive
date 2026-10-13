import type { ReactNode } from "react";
import { WorkbookShell } from "@/components/workbook/WorkbookShell";

export default function WorkbookLayout({ children }: { children: ReactNode }) {
  return <WorkbookShell>{children}</WorkbookShell>;
}
