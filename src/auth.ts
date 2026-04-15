import { getFlag } from "./flags";

export function authenticate(credentials: Credentials) {
  if (getFlag("legacy_auth_flow")) {
    return legacyAuth(credentials);
  }
  return modernAuth(credentials);
}

function legacyAuth(credentials: Credentials) {
  // Old session-based auth - deprecated Q1 2026
  return sessionStore.create(credentials);
}

function modernAuth(credentials: Credentials) {
  return jwt.sign(credentials, SECRET);
}
