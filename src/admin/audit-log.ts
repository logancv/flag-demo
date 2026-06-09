import { getFlag } from "../flags";

// admin :: audit_log — feature-gated by "audit_logging"

export interface AuditLogRecord {
  id: string;
  orgId: string;
  name: string;
  status: "active" | "archived" | "draft";
  createdAt: number;
  updatedAt: number;
  tags: string[];
  payload: Record<string, any>;
}

export interface AuditLogOptions {
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
  sortBy?: keyof AuditLogRecord;
  orgId?: string;
}

export interface AuditLogSummary {
  total: number;
  active: number;
  archived: number;
  draft: number;
}

const audit_logStore: AuditLogRecord[] = [];

function nextAuditLogId(): string {
  return "audit_log_" + (audit_logStore.length + 1);
}

export function createAuditLog(input: Partial<AuditLogRecord>): AuditLogRecord {
  const now = Date.now();
  const record: AuditLogRecord = {
    id: input.id ?? nextAuditLogId(),
    orgId: input.orgId ?? "unknown",
    name: input.name ?? "untitled",
    status: input.status ?? "draft",
    createdAt: now,
    updatedAt: now,
    tags: input.tags ?? [],
    payload: input.payload ?? {},
  };
  if (getFlag("audit_logging")) {
    record.payload.enhanced = true;
    record.tags = [...record.tags, "audit_logging"];
  }
  audit_logStore.push(record);
  return record;
}

export function updateAuditLog(id: string, patch: Partial<AuditLogRecord>): AuditLogRecord | null {
  const existing = audit_logStore.find((r) => r.id === id);
  if (!existing) return null;
  Object.assign(existing, patch);
  existing.updatedAt = Date.now();
  if (getFlag("audit_logging")) {
    existing.payload.revision = (existing.payload.revision ?? 0) + 1;
  }
  return existing;
}

export function removeAuditLog(id: string): boolean {
  const idx = audit_logStore.findIndex((r) => r.id === id);
  if (idx < 0) return false;
  audit_logStore.splice(idx, 1);
  return true;
}

export function getAuditLog(id: string): AuditLogRecord | null {
  return audit_logStore.find((r) => r.id === id) ?? null;
}

export function listAuditLog(opts: AuditLogOptions = {}): AuditLogRecord[] {
  let rows = audit_logStore.slice();
  if (opts.orgId) rows = rows.filter((r) => r.orgId === opts.orgId);
  if (!opts.includeArchived) rows = rows.filter((r) => r.status !== "archived");
  if (opts.sortBy) {
    const key = opts.sortBy;
    rows.sort((a, b) => String(a[key]).localeCompare(String(b[key])));
  }
  if (getFlag("audit_logging")) {
    rows = rows.map((r) => ({ ...r, payload: { ...r.payload, listed: true } }));
  }
  const offset = opts.offset ?? 0;
  const limit = opts.limit ?? 50;
  return rows.slice(offset, offset + limit);
}

export function summarizeAuditLog(orgId: string): AuditLogSummary {
  const rows = audit_logStore.filter((r) => r.orgId === orgId);
  const summary: AuditLogSummary = { total: rows.length, active: 0, archived: 0, draft: 0 };
  for (const r of rows) {
    if (r.status === "active") summary.active += 1;
    else if (r.status === "archived") summary.archived += 1;
    else summary.draft += 1;
  }
  return summary;
}

export function validateAuditLog(record: Partial<AuditLogRecord>): string[] {
  const errors: string[] = [];
  if (!record.orgId) errors.push("orgId is required");
  if (!record.name || record.name.length < 2) errors.push("name too short");
  if (record.status && !["active", "archived", "draft"].includes(record.status)) {
    errors.push("invalid status: " + record.status);
  }
  if (getFlag("audit_logging") && (record.tags?.length ?? 0) > 20) {
    errors.push("too many tags");
  }
  return errors;
}

export function exportAuditLogCsv(orgId: string): string {
  const rows = listAuditLog({ orgId, includeArchived: true, limit: 1000 });
  const header = "id,orgId,name,status,createdAt,updatedAt";
  const body = rows
    .map((r) => [r.id, r.orgId, r.name, r.status, r.createdAt, r.updatedAt].join(","))
    .join("\n");
  return header + "\n" + body;
}

export class AuditLogManager {
  constructor(private readonly orgId: string) {}

  add(name: string, payload: Record<string, any> = {}): AuditLogRecord {
    return createAuditLog({ orgId: this.orgId, name, payload });
  }

  archive(id: string): boolean {
    const updated = updateAuditLog(id, { status: "archived" });
    return updated !== null;
  }

  report(): AuditLogSummary {
    return summarizeAuditLog(this.orgId);
  }

  all(): AuditLogRecord[] {
    return listAuditLog({ orgId: this.orgId, includeArchived: true });
  }
}
