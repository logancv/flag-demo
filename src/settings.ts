import { getFlag } from "./flags";

interface UserSettings {
  theme: "light" | "dark" | "system";
  language: string;
  notificationDigest: boolean;
  digestFrequency: "daily" | "weekly" | "realtime";
}

export function getSettingsSchema() {
  const schema: Record<string, any> = {
    language: { type: "select", options: ["en", "es", "fr", "de", "ja"] },
  };

  if (getFlag("dark_mode")) {
    schema.theme = { type: "select", options: ["light", "dark", "system"], default: "system" };
  }

  if (getFlag("improved_notifications")) {
    schema.notificationDigest = { type: "toggle", default: true };
    schema.digestFrequency = { type: "select", options: ["daily", "weekly", "realtime"], default: "daily" };
  }

  if (getFlag("redesigned_settings_panel")) {
    schema._layout = "tabbed";
    schema._tabs = ["General", "Appearance", "Notifications", "Privacy"];
  }

  return schema;
}

export function saveSettings(userId: string, settings: Partial<UserSettings>) {
  if (settings.theme && !getFlag("dark_mode")) {
    delete settings.theme;
  }
  if (settings.notificationDigest !== undefined && !getFlag("improved_notifications")) {
    delete settings.notificationDigest;
    delete settings.digestFrequency;
  }
  return db.userSettings.upsert(userId, settings);
}
