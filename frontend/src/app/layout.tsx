import type { Metadata } from "next";
import { Shell } from "@/components/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Kinfolk | Personal CRM", template: "%s | Kinfolk" },
  description:
    "Un espacio cuidadoso para cultivar tus conexiones, recordar conversaciones y darles seguimiento.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
