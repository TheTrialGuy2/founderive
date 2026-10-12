import type { Metadata } from "next";
import { Shell } from "@/components/Shell";
import { DemoProvider } from "@/state/DemoStore";
import "./globals.css";

export const metadata: Metadata = {
  title: "Founderive",
  description: "The founder's record, organized by the ecosystem's journey.",
  icons: { icon: "/founderive-mark.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <DemoProvider>
          <Shell>{children}</Shell>
        </DemoProvider>
      </body>
    </html>
  );
}
