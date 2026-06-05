import { getFlag } from "./flags";

interface Plan {
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
}

const PLANS: Plan[] = [
  { name: "Starter", monthlyPrice: 9, annualPrice: 7, features: ["5 projects", "1GB storage"] },
  { name: "Pro", monthlyPrice: 29, annualPrice: 24, features: ["Unlimited projects", "50GB storage", "Priority support"] },
  { name: "Enterprise", monthlyPrice: 99, annualPrice: 79, features: ["Everything in Pro", "SSO", "Audit logs", "SLA"] },
];

export function renderPricingPage(showAnnual: boolean) {
  if (getFlag("new_pricing_page")) {
    return renderRedesignedPricing(PLANS, showAnnual);
  }
  return renderLegacyPricing(PLANS);
}

function renderRedesignedPricing(plans: Plan[], showAnnual: boolean) {
  const displayPlans = plans.map((p) => ({
    ...p,
    displayPrice: showAnnual ? p.annualPrice : p.monthlyPrice,
    billingLabel: showAnnual ? "/mo billed annually" : "/mo",
  }));
  return { template: "pricing-v2", plans: displayPlans };
}

function renderLegacyPricing(plans: Plan[]) {
  return { template: "pricing-legacy", plans };
}
