import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Founderive",
  description: "A founder's workbook and record, kept in plain files on your own computer.",
  icons: { icon: "/founderive-mark.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
