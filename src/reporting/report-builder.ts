import { getFlag } from "../flags";

// reporting :: report_builder — feature-gated by "custom_reports"

export interface ReportBuilderRecord {
  id: string;
  orgId: string;
  name: string;
  status: "active" | "archived" | "draft";
  createdAt: number;
  updatedAt: number;
  tags: string[];
  payload: Record<string, any>;
}

export interface ReportBuilderOptions {
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
  sortBy?: keyof ReportBuilderRecord;
  orgId?: string;
}

export interface ReportBuilderSummary {
  total: number;
  active: number;
  archived: number;
  draft: number;
}

const report_builderStore: ReportBuilderRecord[] = [];

function nextReportBuilderId(): string {
  return "report_builder_" + (report_builderStore.length + 1);
}

export function createReportBuilder(input: Partial<ReportBuilderRecord>): ReportBuilderRecord {
  const now = Date.now();
  const record: ReportBuilderRecord = {
    id: input.id ?? nextReportBuilderId(),
    orgId: input.orgId ?? "unknown",
    name: input.name ?? "untitled",
    status: input.status ?? "draft",
    createdAt: now,
    updatedAt: now,
    tags: input.tags ?? [],
    payload: input.payload ?? {},
  };
  if (getFlag("custom_reports")) {
    record.payload.enhanced = true;
    record.tags = [...record.tags, "custom_reports"];
  }
  report_builderStore.push(record);
  return record;
}

export function updateReportBuilder(id: string, patch: Partial<ReportBuilderRecord>): ReportBuilderRecord | null {
  const existing = report_builderStore.find((r) => r.id === id);
  if (!existing) return null;
  Object.assign(existing, patch);
  existing.updatedAt = Date.now();
  if (getFlag("custom_reports")) {
    existing.payload.revision = (existing.payload.revision ?? 0) + 1;
  }
  return existing;
}

export function removeReportBuilder(id: string): boolean {
  const idx = report_builderStore.findIndex((r) => r.id === id);
  if (idx < 0) return false;
  report_builderStore.splice(idx, 1);
  return true;
}

export function getReportBuilder(id: string): ReportBuilderRecord | null {
  return report_builderStore.find((r) => r.id === id) ?? null;
}

export function listReportBuilder(opts: ReportBuilderOptions = {}): ReportBuilderRecord[] {
  let rows = report_builderStore.slice();
  if (opts.orgId) rows = rows.filter((r) => r.orgId === opts.orgId);
  if (!opts.includeArchived) rows = rows.filter((r) => r.status !== "archived");
  if (opts.sortBy) {
    const key = opts.sortBy;
    rows.sort((a, b) => String(a[key]).localeCompare(String(b[key])));
  }
  if (getFlag("custom_reports")) {
    rows = rows.map((r) => ({ ...r, payload: { ...r.payload, listed: true } }));
  }
  const offset = opts.offset ?? 0;
  const limit = opts.limit ?? 50;
  return rows.slice(offset, offset + limit);
}

export function summarizeReportBuilder(orgId: string): ReportBuilderSummary {
  const rows = report_builderStore.filter((r) => r.orgId === orgId);
  const summary: ReportBuilderSummary = { total: rows.length, active: 0, archived: 0, draft: 0 };
  for (const r of rows) {
    if (r.status === "active") summary.active += 1;
    else if (r.status === "archived") summary.archived += 1;
    else summary.draft += 1;
  }
  return summary;
}

export function validateReportBuilder(record: Partial<ReportBuilderRecord>): string[] {
  const errors: string[] = [];
  if (!record.orgId) errors.push("orgId is required");
  if (!record.name || record.name.length < 2) errors.push("name too short");
  if (record.status && !["active", "archived", "draft"].includes(record.status)) {
    errors.push("invalid status: " + record.status);
  }
  if (getFlag("custom_reports") && (record.tags?.length ?? 0) > 20) {
    errors.push("too many tags");
  }
  return errors;
}

export function exportReportBuilderCsv(orgId: string): string {
  const rows = listReportBuilder({ orgId, includeArchived: true, limit: 1000 });
  const header = "id,orgId,name,status,createdAt,updatedAt";
  const body = rows
    .map((r) => [r.id, r.orgId, r.name, r.status, r.createdAt, r.updatedAt].join(","))
    .join("\n");
  return header + "\n" + body;
}

export class ReportBuilderManager {
  constructor(private readonly orgId: string) {}

  add(name: string, payload: Record<string, any> = {}): ReportBuilderRecord {
    return createReportBuilder({ orgId: this.orgId, name, payload });
  }

  archive(id: string): boolean {
    const updated = updateReportBuilder(id, { status: "archived" });
    return updated !== null;
  }

  report(): ReportBuilderSummary {
    return summarizeReportBuilder(this.orgId);
  }

  all(): ReportBuilderRecord[] {
    return listReportBuilder({ orgId: this.orgId, includeArchived: true });
  }
}
