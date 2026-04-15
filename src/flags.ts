import flags from "../config/feature-flags.json";

export function getFlag(name: string): boolean {
  const flag = flags.flags[name];
  if (!flag) return false;
  return flag.enabled && flag.rollout_percentage > 0;
}

export function getFlagConfig(name: string) {
  return flags.flags[name] ?? null;
}
