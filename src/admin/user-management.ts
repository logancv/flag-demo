import { getFlag } from "../flags";

// admin :: user_management — feature-gated by "rbac_v2"

export interface UserManagementRecord {
  id: string;
  orgId: string;
  name: string;
  status: "active" | "archived" | "draft";
  createdAt: number;
  updatedAt: number;
  tags: string[];
  payload: Record<string, any>;
}

export interface UserManagementOptions {
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
  sortBy?: keyof UserManagementRecord;
  orgId?: string;
}

export interface UserManagementSummary {
  total: number;
  active: number;
  archived: number;
  draft: number;
}

const user_managementStore: UserManagementRecord[] = [];

function nextUserManagementId(): string {
  return "user_management_" + (user_managementStore.length + 1);
}

export function createUserManagement(input: Partial<UserManagementRecord>): UserManagementRecord {
  const now = Date.now();
  const record: UserManagementRecord = {
    id: input.id ?? nextUserManagementId(),
    orgId: input.orgId ?? "unknown",
    name: input.name ?? "untitled",
    status: input.status ?? "draft",
    createdAt: now,
    updatedAt: now,
    tags: input.tags ?? [],
    payload: input.payload ?? {},
  };
  if (getFlag("rbac_v2")) {
    record.payload.enhanced = true;
    record.tags = [...record.tags, "rbac_v2"];
  }
  user_managementStore.push(record);
  return record;
}

export function updateUserManagement(id: string, patch: Partial<UserManagementRecord>): UserManagementRecord | null {
  const existing = user_managementStore.find((r) => r.id === id);
  if (!existing) return null;
  Object.assign(existing, patch);
  existing.updatedAt = Date.now();
  if (getFlag("rbac_v2")) {
    existing.payload.revision = (existing.payload.revision ?? 0) + 1;
  }
  return existing;
}

export function removeUserManagement(id: string): boolean {
  const idx = user_managementStore.findIndex((r) => r.id === id);
  if (idx < 0) return false;
  user_managementStore.splice(idx, 1);
  return true;
}

export function getUserManagement(id: string): UserManagementRecord | null {
  return user_managementStore.find((r) => r.id === id) ?? null;
}

export function listUserManagement(opts: UserManagementOptions = {}): UserManagementRecord[] {
  let rows = user_managementStore.slice();
  if (opts.orgId) rows = rows.filter((r) => r.orgId === opts.orgId);
  if (!opts.includeArchived) rows = rows.filter((r) => r.status !== "archived");
  if (opts.sortBy) {
    const key = opts.sortBy;
    rows.sort((a, b) => String(a[key]).localeCompare(String(b[key])));
  }
  if (getFlag("rbac_v2")) {
    rows = rows.map((r) => ({ ...r, payload: { ...r.payload, listed: true } }));
  }
  const offset = opts.offset ?? 0;
  const limit = opts.limit ?? 50;
  return rows.slice(offset, offset + limit);
}

export function summarizeUserManagement(orgId: string): UserManagementSummary {
  const rows = user_managementStore.filter((r) => r.orgId === orgId);
  const summary: UserManagementSummary = { total: rows.length, active: 0, archived: 0, draft: 0 };
  for (const r of rows) {
    if (r.status === "active") summary.active += 1;
    else if (r.status === "archived") summary.archived += 1;
    else summary.draft += 1;
  }
  return summary;
}

export function validateUserManagement(record: Partial<UserManagementRecord>): string[] {
  const errors: string[] = [];
  if (!record.orgId) errors.push("orgId is required");
  if (!record.name || record.name.length < 2) errors.push("name too short");
  if (record.status && !["active", "archived", "draft"].includes(record.status)) {
    errors.push("invalid status: " + record.status);
  }
  if (getFlag("rbac_v2") && (record.tags?.length ?? 0) > 20) {
    errors.push("too many tags");
  }
  return errors;
}

export function exportUserManagementCsv(orgId: string): string {
  const rows = listUserManagement({ orgId, includeArchived: true, limit: 1000 });
  const header = "id,orgId,name,status,createdAt,updatedAt";
  const body = rows
    .map((r) => [r.id, r.orgId, r.name, r.status, r.createdAt, r.updatedAt].join(","))
    .join("\n");
  return header + "\n" + body;
}

export class UserManagementManager {
  constructor(private readonly orgId: string) {}

  add(name: string, payload: Record<string, any> = {}): UserManagementRecord {
    return createUserManagement({ orgId: this.orgId, name, payload });
  }

  archive(id: string): boolean {
    const updated = updateUserManagement(id, { status: "archived" });
    return updated !== null;
  }

  report(): UserManagementSummary {
    return summarizeUserManagement(this.orgId);
  }

  all(): UserManagementRecord[] {
    return listUserManagement({ orgId: this.orgId, includeArchived: true });
  }
}
