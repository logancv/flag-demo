import { getFlag } from "../flags";

// integrations :: webhooks — feature-gated by "outbound_webhooks"

export interface WebhooksRecord {
  id: string;
  orgId: string;
  name: string;
  status: "active" | "archived" | "draft";
  createdAt: number;
  updatedAt: number;
  tags: string[];
  payload: Record<string, any>;
}

export interface WebhooksOptions {
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
  sortBy?: keyof WebhooksRecord;
  orgId?: string;
}

export interface WebhooksSummary {
  total: number;
  active: number;
  archived: number;
  draft: number;
}

const webhooksStore: WebhooksRecord[] = [];

function nextWebhooksId(): string {
  return "webhooks_" + (webhooksStore.length + 1);
}

export function createWebhooks(input: Partial<WebhooksRecord>): WebhooksRecord {
  const now = Date.now();
  const record: WebhooksRecord = {
    id: input.id ?? nextWebhooksId(),
    orgId: input.orgId ?? "unknown",
    name: input.name ?? "untitled",
    status: input.status ?? "draft",
    createdAt: now,
    updatedAt: now,
    tags: input.tags ?? [],
    payload: input.payload ?? {},
  };
  if (getFlag("outbound_webhooks")) {
    record.payload.enhanced = true;
    record.tags = [...record.tags, "outbound_webhooks"];
  }
  webhooksStore.push(record);
  return record;
}

export function updateWebhooks(id: string, patch: Partial<WebhooksRecord>): WebhooksRecord | null {
  const existing = webhooksStore.find((r) => r.id === id);
  if (!existing) return null;
  Object.assign(existing, patch);
  existing.updatedAt = Date.now();
  if (getFlag("outbound_webhooks")) {
    existing.payload.revision = (existing.payload.revision ?? 0) + 1;
  }
  return existing;
}

export function removeWebhooks(id: string): boolean {
  const idx = webhooksStore.findIndex((r) => r.id === id);
  if (idx < 0) return false;
  webhooksStore.splice(idx, 1);
  return true;
}

export function getWebhooks(id: string): WebhooksRecord | null {
  return webhooksStore.find((r) => r.id === id) ?? null;
}

export function listWebhooks(opts: WebhooksOptions = {}): WebhooksRecord[] {
  let rows = webhooksStore.slice();
  if (opts.orgId) rows = rows.filter((r) => r.orgId === opts.orgId);
  if (!opts.includeArchived) rows = rows.filter((r) => r.status !== "archived");
  if (opts.sortBy) {
    const key = opts.sortBy;
    rows.sort((a, b) => String(a[key]).localeCompare(String(b[key])));
  }
  if (getFlag("outbound_webhooks")) {
    rows = rows.map((r) => ({ ...r, payload: { ...r.payload, listed: true } }));
  }
  const offset = opts.offset ?? 0;
  const limit = opts.limit ?? 50;
  return rows.slice(offset, offset + limit);
}

export function summarizeWebhooks(orgId: string): WebhooksSummary {
  const rows = webhooksStore.filter((r) => r.orgId === orgId);
  const summary: WebhooksSummary = { total: rows.length, active: 0, archived: 0, draft: 0 };
  for (const r of rows) {
    if (r.status === "active") summary.active += 1;
    else if (r.status === "archived") summary.archived += 1;
    else summary.draft += 1;
  }
  return summary;
}

export function validateWebhooks(record: Partial<WebhooksRecord>): string[] {
  const errors: string[] = [];
  if (!record.orgId) errors.push("orgId is required");
  if (!record.name || record.name.length < 2) errors.push("name too short");
  if (record.status && !["active", "archived", "draft"].includes(record.status)) {
    errors.push("invalid status: " + record.status);
  }
  if (getFlag("outbound_webhooks") && (record.tags?.length ?? 0) > 20) {
    errors.push("too many tags");
  }
  return errors;
}

export function exportWebhooksCsv(orgId: string): string {
  const rows = listWebhooks({ orgId, includeArchived: true, limit: 1000 });
  const header = "id,orgId,name,status,createdAt,updatedAt";
  const body = rows
    .map((r) => [r.id, r.orgId, r.name, r.status, r.createdAt, r.updatedAt].join(","))
    .join("\n");
  return header + "\n" + body;
}

export class WebhooksManager {
  constructor(private readonly orgId: string) {}

  add(name: string, payload: Record<string, any> = {}): WebhooksRecord {
    return createWebhooks({ orgId: this.orgId, name, payload });
  }

  archive(id: string): boolean {
    const updated = updateWebhooks(id, { status: "archived" });
    return updated !== null;
  }

  report(): WebhooksSummary {
    return summarizeWebhooks(this.orgId);
  }

  all(): WebhooksRecord[] {
    return listWebhooks({ orgId: this.orgId, includeArchived: true });
  }
}
