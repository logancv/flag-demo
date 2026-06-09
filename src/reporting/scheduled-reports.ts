import { getFlag } from "../flags";

// reporting :: scheduled_reports — feature-gated by "report_scheduling"

export interface ScheduledReportsRecord {
  id: string;
  orgId: string;
  name: string;
  status: "active" | "archived" | "draft";
  createdAt: number;
  updatedAt: number;
  tags: string[];
  payload: Record<string, any>;
}

export interface ScheduledReportsOptions {
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
  sortBy?: keyof ScheduledReportsRecord;
  orgId?: string;
}

export interface ScheduledReportsSummary {
  total: number;
  active: number;
  archived: number;
  draft: number;
}

const scheduled_reportsStore: ScheduledReportsRecord[] = [];

function nextScheduledReportsId(): string {
  return "scheduled_reports_" + (scheduled_reportsStore.length + 1);
}

export function createScheduledReports(input: Partial<ScheduledReportsRecord>): ScheduledReportsRecord {
  const now = Date.now();
  const record: ScheduledReportsRecord = {
    id: input.id ?? nextScheduledReportsId(),
    orgId: input.orgId ?? "unknown",
    name: input.name ?? "untitled",
    status: input.status ?? "draft",
    createdAt: now,
    updatedAt: now,
    tags: input.tags ?? [],
    payload: input.payload ?? {},
  };
  if (getFlag("report_scheduling")) {
    record.payload.enhanced = true;
    record.tags = [...record.tags, "report_scheduling"];
  }
  scheduled_reportsStore.push(record);
  return record;
}

export function updateScheduledReports(id: string, patch: Partial<ScheduledReportsRecord>): ScheduledReportsRecord | null {
  const existing = scheduled_reportsStore.find((r) => r.id === id);
  if (!existing) return null;
  Object.assign(existing, patch);
  existing.updatedAt = Date.now();
  if (getFlag("report_scheduling")) {
    existing.payload.revision = (existing.payload.revision ?? 0) + 1;
  }
  return existing;
}

export function removeScheduledReports(id: string): boolean {
  const idx = scheduled_reportsStore.findIndex((r) => r.id === id);
  if (idx < 0) return false;
  scheduled_reportsStore.splice(idx, 1);
  return true;
}

export function getScheduledReports(id: string): ScheduledReportsRecord | null {
  return scheduled_reportsStore.find((r) => r.id === id) ?? null;
}

export function listScheduledReports(opts: ScheduledReportsOptions = {}): ScheduledReportsRecord[] {
  let rows = scheduled_reportsStore.slice();
  if (opts.orgId) rows = rows.filter((r) => r.orgId === opts.orgId);
  if (!opts.includeArchived) rows = rows.filter((r) => r.status !== "archived");
  if (opts.sortBy) {
    const key = opts.sortBy;
    rows.sort((a, b) => String(a[key]).localeCompare(String(b[key])));
  }
  if (getFlag("report_scheduling")) {
    rows = rows.map((r) => ({ ...r, payload: { ...r.payload, listed: true } }));
  }
  const offset = opts.offset ?? 0;
  const limit = opts.limit ?? 50;
  return rows.slice(offset, offset + limit);
}

export function summarizeScheduledReports(orgId: string): ScheduledReportsSummary {
  const rows = scheduled_reportsStore.filter((r) => r.orgId === orgId);
  const summary: ScheduledReportsSummary = { total: rows.length, active: 0, archived: 0, draft: 0 };
  for (const r of rows) {
    if (r.status === "active") summary.active += 1;
    else if (r.status === "archived") summary.archived += 1;
    else summary.draft += 1;
  }
  return summary;
}

export function validateScheduledReports(record: Partial<ScheduledReportsRecord>): string[] {
  const errors: string[] = [];
  if (!record.orgId) errors.push("orgId is required");
  if (!record.name || record.name.length < 2) errors.push("name too short");
  if (record.status && !["active", "archived", "draft"].includes(record.status)) {
    errors.push("invalid status: " + record.status);
  }
  if (getFlag("report_scheduling") && (record.tags?.length ?? 0) > 20) {
    errors.push("too many tags");
  }
  return errors;
}

export function exportScheduledReportsCsv(orgId: string): string {
  const rows = listScheduledReports({ orgId, includeArchived: true, limit: 1000 });
  const header = "id,orgId,name,status,createdAt,updatedAt";
  const body = rows
    .map((r) => [r.id, r.orgId, r.name, r.status, r.createdAt, r.updatedAt].join(","))
    .join("\n");
  return header + "\n" + body;
}

export class ScheduledReportsManager {
  constructor(private readonly orgId: string) {}

  add(name: string, payload: Record<string, any> = {}): ScheduledReportsRecord {
    return createScheduledReports({ orgId: this.orgId, name, payload });
  }

  archive(id: string): boolean {
    const updated = updateScheduledReports(id, { status: "archived" });
    return updated !== null;
  }

  report(): ScheduledReportsSummary {
    return summarizeScheduledReports(this.orgId);
  }

  all(): ScheduledReportsRecord[] {
    return listScheduledReports({ orgId: this.orgId, includeArchived: true });
  }
}
