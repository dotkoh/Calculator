export interface PlanDef {
  id: string;
  label: string;
  credits: number;
  maxChannels: number;
}

export interface ChannelInputs {
  patientEnquiries: number;
  coordResponsesPerPatient: number;
  faqResponsesPerPatient: number;
  schedulingRequests: number;
  appointmentsPerMonth: number;
  surveyBlasts: number;
  marketingBlasts: number;
}

export type ChannelId = "whatsapp" | "messenger" | "viber";

export interface CalculatorConfig {
  calculatorType: "hospital" | "clinic";
  title: string;
  subtitle: string;
  plans: PlanDef[];
  defaultPlanId: string;
  defaultInputs: Record<ChannelId, ChannelInputs>;
}

export const HOSPITAL_CONFIG: CalculatorConfig = {
  calculatorType: "hospital",
  title: "Messaging & AI Credit Cost Calculator",
  subtitle: "Estimate your monthly messaging & AI agent costs across channels",
  defaultPlanId: "starter",
  plans: [
    { id: "starter", label: "Starter", credits: 1_000, maxChannels: 2 },
    { id: "pro", label: "Pro", credits: 3_000, maxChannels: 5 },
    { id: "enterprise", label: "Enterprise", credits: 10_000, maxChannels: 999 },
  ],
  defaultInputs: {
    whatsapp: { patientEnquiries: 3000, coordResponsesPerPatient: 2, faqResponsesPerPatient: 2, schedulingRequests: 500, appointmentsPerMonth: 800, surveyBlasts: 500, marketingBlasts: 0 },
    messenger: { patientEnquiries: 1000, coordResponsesPerPatient: 2, faqResponsesPerPatient: 2, schedulingRequests: 200, appointmentsPerMonth: 300, surveyBlasts: 0, marketingBlasts: 0 },
    viber: { patientEnquiries: 500, coordResponsesPerPatient: 2, faqResponsesPerPatient: 2, schedulingRequests: 100, appointmentsPerMonth: 200, surveyBlasts: 200, marketingBlasts: 0 },
  },
};

export const CLINIC_CONFIG: CalculatorConfig = {
  calculatorType: "clinic",
  title: "Clinic Messaging & AI Credit Cost Calculator",
  subtitle: "Estimate your monthly messaging & AI agent costs across channels",
  defaultPlanId: "essential",
  plans: [
    { id: "essential", label: "Essential", credits: 500, maxChannels: 2 },
    { id: "pro", label: "Pro", credits: 1_000, maxChannels: 5 },
    { id: "enterprise", label: "Enterprise", credits: 3_000, maxChannels: 999 },
  ],
  defaultInputs: {
    whatsapp: { patientEnquiries: 500, coordResponsesPerPatient: 2, faqResponsesPerPatient: 2, schedulingRequests: 100, appointmentsPerMonth: 200, surveyBlasts: 100, marketingBlasts: 0 },
    messenger: { patientEnquiries: 200, coordResponsesPerPatient: 2, faqResponsesPerPatient: 2, schedulingRequests: 50, appointmentsPerMonth: 80, surveyBlasts: 0, marketingBlasts: 0 },
    viber: { patientEnquiries: 100, coordResponsesPerPatient: 2, faqResponsesPerPatient: 2, schedulingRequests: 30, appointmentsPerMonth: 50, surveyBlasts: 50, marketingBlasts: 0 },
  },
};
