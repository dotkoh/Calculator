import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bot MD Messaging & AI Credit Cost Calculator",
  description:
    "Estimate your monthly messaging and AI agent credit costs across WhatsApp, Messenger and Viber with Bot MD",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
