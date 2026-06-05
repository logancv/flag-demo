import { getFlag } from "./flags";

type AuthProvider = "google" | "github" | "email";

interface LoginOptions {
  provider: AuthProvider;
  redirectUrl: string;
}

export function getAvailableProviders(): AuthProvider[] {
  const providers: AuthProvider[] = ["email"];
  if (getFlag("social_login")) {
    providers.push("google", "github");
  }
  return providers;
}

export function initiateLogin(options: LoginOptions) {
  if (options.provider !== "email" && !getFlag("social_login")) {
    throw new Error(`Provider ${options.provider} is not enabled`);
  }

  if (getFlag("legacy_auth_flow")) {
    return legacyLoginRedirect(options);
  }

  switch (options.provider) {
    case "google":
      return oauthRedirect("https://accounts.google.com/o/oauth2/v2/auth", options.redirectUrl);
    case "github":
      return oauthRedirect("https://github.com/login/oauth/authorize", options.redirectUrl);
    case "email":
      return emailPasswordLogin(options.redirectUrl);
  }
}

function legacyLoginRedirect(options: LoginOptions) {
  return { redirect: `/legacy-login?provider=${options.provider}&next=${options.redirectUrl}` };
}

function oauthRedirect(authUrl: string, redirectUrl: string) {
  return { redirect: `${authUrl}?redirect_uri=${encodeURIComponent(redirectUrl)}` };
}

function emailPasswordLogin(redirectUrl: string) {
  return { template: "email-login", next: redirectUrl };
}
