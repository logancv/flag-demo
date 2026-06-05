import { getFlag } from "./flags";

interface AnalyticsEvent {
  name: string;
  properties: Record<string, any>;
  userId: string;
  timestamp: number;
}

export function trackEvent(event: AnalyticsEvent) {
  basicTracker.record(event);

  if (getFlag("advanced_analytics")) {
    cohortTracker.classify(event);
    funnelTracker.step(event);
  }
}

export function getAnalyticsDashboard(orgId: string) {
  const base = {
    pageViews: basicTracker.getPageViews(orgId),
    uniqueUsers: basicTracker.getUniqueUsers(orgId),
    topPages: basicTracker.getTopPages(orgId, 10),
  };

  if (getFlag("advanced_analytics")) {
    return {
      ...base,
      cohorts: cohortTracker.getCohorts(orgId),
      funnels: funnelTracker.getFunnels(orgId),
      retention: cohortTracker.getRetentionCurve(orgId),
    };
  }

  return base;
}
