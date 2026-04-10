import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WooShip",
  description: "WooCommerce to Shipping CSV",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body className="min-h-screen flex flex-col bg-gray-50 antialiased">
        <div className="flex-1">{children}</div>
        <footer className="py-8 pb-28 text-center text-sm text-gray-500">
          Developed by{" "}
          <a
            href="https://www.linkedin.com/in/davide-biasuzzi-aa6310234/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            Davide Biasuzzi
          </a>
        </footer>
      </body>
    </html>
  );
}
