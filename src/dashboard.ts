import { getFlag } from "./flags";

export function renderDashboard(user: User) {
  if (getFlag("enable_new_dashboard")) {
    return renderNewDashboard(user);
  } else {
    return renderLegacyDashboard(user);
  }
}

function renderNewDashboard(user: User) {
  const theme = getFlag("dark_mode") ? "dark" : "light";
  return `<Dashboard theme="${theme}" user="${user.name}" />`;
}

function renderLegacyDashboard(user: User) {
  return `<LegacyDashboard user="${user.name}" />`;
}
