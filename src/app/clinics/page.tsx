"use client";

import PricingCalculator from "@/components/PricingCalculator";
import { CLINIC_CONFIG } from "@/data/calculatorConfigs";

export default function ClinicsPage() {
  return (
    <main className="min-h-screen py-4">
      <PricingCalculator config={CLINIC_CONFIG} />
    </main>
  );
}
