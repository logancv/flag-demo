import { getFlag } from "../flags";

// billing :: invoices — feature-gated by "usage_billing"

export interface InvoicesRecord {
  id: string;
  orgId: string;
  name: string;
  status: "active" | "archived" | "draft";
  createdAt: number;
  updatedAt: number;
  tags: string[];
  payload: Record<string, any>;
}

export interface InvoicesOptions {
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
  sortBy?: keyof InvoicesRecord;
  orgId?: string;
}

export interface InvoicesSummary {
  total: number;
  active: number;
  archived: number;
  draft: number;
}

const invoicesStore: InvoicesRecord[] = [];

function nextInvoicesId(): string {
  return "invoices_" + (invoicesStore.length + 1);
}

export function createInvoices(input: Partial<InvoicesRecord>): InvoicesRecord {
  const now = Date.now();
  const record: InvoicesRecord = {
    id: input.id ?? nextInvoicesId(),
    orgId: input.orgId ?? "unknown",
    name: input.name ?? "untitled",
    status: input.status ?? "draft",
    createdAt: now,
    updatedAt: now,
    tags: input.tags ?? [],
    payload: input.payload ?? {},
  };
  if (getFlag("usage_billing")) {
    record.payload.enhanced = true;
    record.tags = [...record.tags, "usage_billing"];
  }
  invoicesStore.push(record);
  return record;
}

export function updateInvoices(id: string, patch: Partial<InvoicesRecord>): InvoicesRecord | null {
  const existing = invoicesStore.find((r) => r.id === id);
  if (!existing) return null;
  Object.assign(existing, patch);
  existing.updatedAt = Date.now();
  if (getFlag("usage_billing")) {
    existing.payload.revision = (existing.payload.revision ?? 0) + 1;
  }
  return existing;
}

export function removeInvoices(id: string): boolean {
  const idx = invoicesStore.findIndex((r) => r.id === id);
  if (idx < 0) return false;
  invoicesStore.splice(idx, 1);
  return true;
}

export function getInvoices(id: string): InvoicesRecord | null {
  return invoicesStore.find((r) => r.id === id) ?? null;
}

export function listInvoices(opts: InvoicesOptions = {}): InvoicesRecord[] {
  let rows = invoicesStore.slice();
  if (opts.orgId) rows = rows.filter((r) => r.orgId === opts.orgId);
  if (!opts.includeArchived) rows = rows.filter((r) => r.status !== "archived");
  if (opts.sortBy) {
    const key = opts.sortBy;
    rows.sort((a, b) => String(a[key]).localeCompare(String(b[key])));
  }
  if (getFlag("usage_billing")) {
    rows = rows.map((r) => ({ ...r, payload: { ...r.payload, listed: true } }));
  }
  const offset = opts.offset ?? 0;
  const limit = opts.limit ?? 50;
  return rows.slice(offset, offset + limit);
}

export function summarizeInvoices(orgId: string): InvoicesSummary {
  const rows = invoicesStore.filter((r) => r.orgId === orgId);
  const summary: InvoicesSummary = { total: rows.length, active: 0, archived: 0, draft: 0 };
  for (const r of rows) {
    if (r.status === "active") summary.active += 1;
    else if (r.status === "archived") summary.archived += 1;
    else summary.draft += 1;
  }
  return summary;
}

export function validateInvoices(record: Partial<InvoicesRecord>): string[] {
  const errors: string[] = [];
  if (!record.orgId) errors.push("orgId is required");
  if (!record.name || record.name.length < 2) errors.push("name too short");
  if (record.status && !["active", "archived", "draft"].includes(record.status)) {
    errors.push("invalid status: " + record.status);
  }
  if (getFlag("usage_billing") && (record.tags?.length ?? 0) > 20) {
    errors.push("too many tags");
  }
  return errors;
}

export function exportInvoicesCsv(orgId: string): string {
  const rows = listInvoices({ orgId, includeArchived: true, limit: 1000 });
  const header = "id,orgId,name,status,createdAt,updatedAt";
  const body = rows
    .map((r) => [r.id, r.orgId, r.name, r.status, r.createdAt, r.updatedAt].join(","))
    .join("\n");
  return header + "\n" + body;
}

export class InvoicesManager {
  constructor(private readonly orgId: string) {}

  add(name: string, payload: Record<string, any> = {}): InvoicesRecord {
    return createInvoices({ orgId: this.orgId, name, payload });
  }

  archive(id: string): boolean {
    const updated = updateInvoices(id, { status: "archived" });
    return updated !== null;
  }

  report(): InvoicesSummary {
    return summarizeInvoices(this.orgId);
  }

  all(): InvoicesRecord[] {
    return listInvoices({ orgId: this.orgId, includeArchived: true });
  }
}
