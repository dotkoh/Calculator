import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bot MD Clinic Messaging & AI Credit Cost Calculator",
  description:
    "Estimate your monthly messaging and AI agent credit costs for clinics across WhatsApp, Messenger and Viber with Bot MD",
};

export default function ClinicsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
