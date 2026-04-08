import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spedizione",
  description: "WooCommerce to Shipping CSV",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body className="min-h-screen bg-gray-50 antialiased">{children}</body>
    </html>
  );
}
