import { getFlag } from "../flags";

// billing :: subscriptions — feature-gated by "tiered_plans"

export interface SubscriptionsRecord {
  id: string;
  orgId: string;
  name: string;
  status: "active" | "archived" | "draft";
  createdAt: number;
  updatedAt: number;
  tags: string[];
  payload: Record<string, any>;
}

export interface SubscriptionsOptions {
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
  sortBy?: keyof SubscriptionsRecord;
  orgId?: string;
}

export interface SubscriptionsSummary {
  total: number;
  active: number;
  archived: number;
  draft: number;
}

const subscriptionsStore: SubscriptionsRecord[] = [];

function nextSubscriptionsId(): string {
  return "subscriptions_" + (subscriptionsStore.length + 1);
}

export function createSubscriptions(input: Partial<SubscriptionsRecord>): SubscriptionsRecord {
  const now = Date.now();
  const record: SubscriptionsRecord = {
    id: input.id ?? nextSubscriptionsId(),
    orgId: input.orgId ?? "unknown",
    name: input.name ?? "untitled",
    status: input.status ?? "draft",
    createdAt: now,
    updatedAt: now,
    tags: input.tags ?? [],
    payload: input.payload ?? {},
  };
  if (getFlag("tiered_plans")) {
    record.payload.enhanced = true;
    record.tags = [...record.tags, "tiered_plans"];
  }
  subscriptionsStore.push(record);
  return record;
}

export function updateSubscriptions(id: string, patch: Partial<SubscriptionsRecord>): SubscriptionsRecord | null {
  const existing = subscriptionsStore.find((r) => r.id === id);
  if (!existing) return null;
  Object.assign(existing, patch);
  existing.updatedAt = Date.now();
  if (getFlag("tiered_plans")) {
    existing.payload.revision = (existing.payload.revision ?? 0) + 1;
  }
  return existing;
}

export function removeSubscriptions(id: string): boolean {
  const idx = subscriptionsStore.findIndex((r) => r.id === id);
  if (idx < 0) return false;
  subscriptionsStore.splice(idx, 1);
  return true;
}

export function getSubscriptions(id: string): SubscriptionsRecord | null {
  return subscriptionsStore.find((r) => r.id === id) ?? null;
}

export function listSubscriptions(opts: SubscriptionsOptions = {}): SubscriptionsRecord[] {
  let rows = subscriptionsStore.slice();
  if (opts.orgId) rows = rows.filter((r) => r.orgId === opts.orgId);
  if (!opts.includeArchived) rows = rows.filter((r) => r.status !== "archived");
  if (opts.sortBy) {
    const key = opts.sortBy;
    rows.sort((a, b) => String(a[key]).localeCompare(String(b[key])));
  }
  if (getFlag("tiered_plans")) {
    rows = rows.map((r) => ({ ...r, payload: { ...r.payload, listed: true } }));
  }
  const offset = opts.offset ?? 0;
  const limit = opts.limit ?? 50;
  return rows.slice(offset, offset + limit);
}

export function summarizeSubscriptions(orgId: string): SubscriptionsSummary {
  const rows = subscriptionsStore.filter((r) => r.orgId === orgId);
  const summary: SubscriptionsSummary = { total: rows.length, active: 0, archived: 0, draft: 0 };
  for (const r of rows) {
    if (r.status === "active") summary.active += 1;
    else if (r.status === "archived") summary.archived += 1;
    else summary.draft += 1;
  }
  return summary;
}

export function validateSubscriptions(record: Partial<SubscriptionsRecord>): string[] {
  const errors: string[] = [];
  if (!record.orgId) errors.push("orgId is required");
  if (!record.name || record.name.length < 2) errors.push("name too short");
  if (record.status && !["active", "archived", "draft"].includes(record.status)) {
    errors.push("invalid status: " + record.status);
  }
  if (getFlag("tiered_plans") && (record.tags?.length ?? 0) > 20) {
    errors.push("too many tags");
  }
  return errors;
}

export function exportSubscriptionsCsv(orgId: string): string {
  const rows = listSubscriptions({ orgId, includeArchived: true, limit: 1000 });
  const header = "id,orgId,name,status,createdAt,updatedAt";
  const body = rows
    .map((r) => [r.id, r.orgId, r.name, r.status, r.createdAt, r.updatedAt].join(","))
    .join("\n");
  return header + "\n" + body;
}

export class SubscriptionsManager {
  constructor(private readonly orgId: string) {}

  add(name: string, payload: Record<string, any> = {}): SubscriptionsRecord {
    return createSubscriptions({ orgId: this.orgId, name, payload });
  }

  archive(id: string): boolean {
    const updated = updateSubscriptions(id, { status: "archived" });
    return updated !== null;
  }

  report(): SubscriptionsSummary {
    return summarizeSubscriptions(this.orgId);
  }

  all(): SubscriptionsRecord[] {
    return listSubscriptions({ orgId: this.orgId, includeArchived: true });
  }
}
