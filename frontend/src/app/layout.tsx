import type { Metadata } from "next";
import { Shell } from "@/components/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Kinfolk | Personal CRM", template: "%s | Kinfolk" },
  description:
    "A thoughtful space to nurture your connections, remember conversations, and follow through.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
