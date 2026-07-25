import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Factur Control",
  description: "Contrôle de facturation fournisseurs",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
