import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bot MD Pricing Calculator",
  description:
    "Estimate your monthly costs for WhatsApp messaging and AI agent credits with Bot MD",
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
