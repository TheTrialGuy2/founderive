import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Founderive",
  description: "A workbook for early-stage founders that runs on your own computer. Test what you believe about your business and get one next step each day.",
  icons: { icon: "/founderive-mark.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
