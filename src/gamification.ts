import { getFlag } from "./flags";

interface Badge {
  id: string;
  name: string;
  icon: string;
  earnedAt?: number;
}

interface LeaderboardEntry {
  userId: string;
  displayName: string;
  points: number;
  rank: number;
}

export function getUserBadges(userId: string): Badge[] {
  if (!getFlag("gamification")) {
    return [];
  }
  return badgeService.getEarnedBadges(userId);
}

export function awardPoints(userId: string, action: string, amount: number) {
  if (!getFlag("gamification")) {
    return;
  }
  pointsLedger.credit(userId, action, amount);
  checkBadgeEligibility(userId);
}

export function getLeaderboard(orgId: string, limit = 10): LeaderboardEntry[] {
  if (!getFlag("gamification")) {
    return [];
  }
  return pointsLedger
    .getTopUsers(orgId, limit)
    .map((entry, idx) => ({ ...entry, rank: idx + 1 }));
}

function checkBadgeEligibility(userId: string) {
  const points = pointsLedger.getTotal(userId);
  if (points >= 1000) badgeService.award(userId, "power-user");
  if (points >= 5000) badgeService.award(userId, "champion");
  if (points >= 10000) badgeService.award(userId, "legend");
}

export function renderProfileBadges(userId: string) {
  if (!getFlag("gamification")) {
    return null;
  }
  const badges = getUserBadges(userId);
  return { component: "BadgeGrid", props: { badges } };
}
