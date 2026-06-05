import { getFlag } from "./flags";

interface Column {
  key: string;
  label: string;
  editable?: boolean;
}

interface TableConfig {
  columns: Column[];
  selectable: boolean;
  bulkActions: string[];
}

export function getTableConfig(columns: Column[]): TableConfig {
  const config: TableConfig = {
    columns,
    selectable: false,
    bulkActions: [],
  };

  if (getFlag("inline_editing")) {
    config.columns = columns.map((col) => ({ ...col, editable: true }));
  }

  if (getFlag("bulk_actions")) {
    config.selectable = true;
    config.bulkActions = ["delete", "archive", "export", "assign"];
  }

  return config;
}

export function handleCellEdit(rowId: string, columnKey: string, newValue: any) {
  if (!getFlag("inline_editing")) {
    throw new Error("Inline editing is not enabled");
  }
  return db.table.updateCell(rowId, columnKey, newValue);
}

export function handleBulkAction(action: string, selectedIds: string[]) {
  if (!getFlag("bulk_actions")) {
    throw new Error("Bulk actions are not enabled");
  }
  switch (action) {
    case "delete":
      return db.table.deleteMany(selectedIds);
    case "archive":
      return db.table.archiveMany(selectedIds);
    case "export":
      return exportService.exportRows(selectedIds);
    case "assign":
      return assignmentService.bulkAssign(selectedIds);
  }
}
