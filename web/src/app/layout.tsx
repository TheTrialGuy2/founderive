import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Founderive",
  description: "The founder-owned operating record that turns the work of building a company into clear next steps and credible proof of progress.",
  icons: { icon: "/founderive-mark.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
