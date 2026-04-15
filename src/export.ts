import { getFlag } from "./flags";

export function exportData(user: User, format: string) {
  if (getFlag("beta_export")) {
    return betaExport(user, format);
  }
  return legacyExport(user);
}

function betaExport(user: User, format: string) {
  // Supports CSV, JSON, and Parquet
  return exportEngine.run(user.data, format);
}

function legacyExport(user: User) {
  // CSV only
  return toCsv(user.data);
}
