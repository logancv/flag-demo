import { getFlag } from "../flags";

// integrations :: slack_notify — feature-gated by "slack_integration"

export interface SlackNotifyRecord {
  id: string;
  orgId: string;
  name: string;
  status: "active" | "archived" | "draft";
  createdAt: number;
  updatedAt: number;
  tags: string[];
  payload: Record<string, any>;
}

export interface SlackNotifyOptions {
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
  sortBy?: keyof SlackNotifyRecord;
  orgId?: string;
}

export interface SlackNotifySummary {
  total: number;
  active: number;
  archived: number;
  draft: number;
}

const slack_notifyStore: SlackNotifyRecord[] = [];

function nextSlackNotifyId(): string {
  return "slack_notify_" + (slack_notifyStore.length + 1);
}

export function createSlackNotify(input: Partial<SlackNotifyRecord>): SlackNotifyRecord {
  const now = Date.now();
  const record: SlackNotifyRecord = {
    id: input.id ?? nextSlackNotifyId(),
    orgId: input.orgId ?? "unknown",
    name: input.name ?? "untitled",
    status: input.status ?? "draft",
    createdAt: now,
    updatedAt: now,
    tags: input.tags ?? [],
    payload: input.payload ?? {},
  };
  if (getFlag("slack_integration")) {
    record.payload.enhanced = true;
    record.tags = [...record.tags, "slack_integration"];
  }
  slack_notifyStore.push(record);
  return record;
}

export function updateSlackNotify(id: string, patch: Partial<SlackNotifyRecord>): SlackNotifyRecord | null {
  const existing = slack_notifyStore.find((r) => r.id === id);
  if (!existing) return null;
  Object.assign(existing, patch);
  existing.updatedAt = Date.now();
  if (getFlag("slack_integration")) {
    existing.payload.revision = (existing.payload.revision ?? 0) + 1;
  }
  return existing;
}

export function removeSlackNotify(id: string): boolean {
  const idx = slack_notifyStore.findIndex((r) => r.id === id);
  if (idx < 0) return false;
  slack_notifyStore.splice(idx, 1);
  return true;
}

export function getSlackNotify(id: string): SlackNotifyRecord | null {
  return slack_notifyStore.find((r) => r.id === id) ?? null;
}

export function listSlackNotify(opts: SlackNotifyOptions = {}): SlackNotifyRecord[] {
  let rows = slack_notifyStore.slice();
  if (opts.orgId) rows = rows.filter((r) => r.orgId === opts.orgId);
  if (!opts.includeArchived) rows = rows.filter((r) => r.status !== "archived");
  if (opts.sortBy) {
    const key = opts.sortBy;
    rows.sort((a, b) => String(a[key]).localeCompare(String(b[key])));
  }
  if (getFlag("slack_integration")) {
    rows = rows.map((r) => ({ ...r, payload: { ...r.payload, listed: true } }));
  }
  const offset = opts.offset ?? 0;
  const limit = opts.limit ?? 50;
  return rows.slice(offset, offset + limit);
}

export function summarizeSlackNotify(orgId: string): SlackNotifySummary {
  const rows = slack_notifyStore.filter((r) => r.orgId === orgId);
  const summary: SlackNotifySummary = { total: rows.length, active: 0, archived: 0, draft: 0 };
  for (const r of rows) {
    if (r.status === "active") summary.active += 1;
    else if (r.status === "archived") summary.archived += 1;
    else summary.draft += 1;
  }
  return summary;
}

export function validateSlackNotify(record: Partial<SlackNotifyRecord>): string[] {
  const errors: string[] = [];
  if (!record.orgId) errors.push("orgId is required");
  if (!record.name || record.name.length < 2) errors.push("name too short");
  if (record.status && !["active", "archived", "draft"].includes(record.status)) {
    errors.push("invalid status: " + record.status);
  }
  if (getFlag("slack_integration") && (record.tags?.length ?? 0) > 20) {
    errors.push("too many tags");
  }
  return errors;
}

export function exportSlackNotifyCsv(orgId: string): string {
  const rows = listSlackNotify({ orgId, includeArchived: true, limit: 1000 });
  const header = "id,orgId,name,status,createdAt,updatedAt";
  const body = rows
    .map((r) => [r.id, r.orgId, r.name, r.status, r.createdAt, r.updatedAt].join(","))
    .join("\n");
  return header + "\n" + body;
}

export class SlackNotifyManager {
  constructor(private readonly orgId: string) {}

  add(name: string, payload: Record<string, any> = {}): SlackNotifyRecord {
    return createSlackNotify({ orgId: this.orgId, name, payload });
  }

  archive(id: string): boolean {
    const updated = updateSlackNotify(id, { status: "archived" });
    return updated !== null;
  }

  report(): SlackNotifySummary {
    return summarizeSlackNotify(this.orgId);
  }

  all(): SlackNotifyRecord[] {
    return listSlackNotify({ orgId: this.orgId, includeArchived: true });
  }
}
