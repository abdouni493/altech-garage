// ===== Relational schema for the garage database =====
//
// The UI works on one in-memory document (`db`) and mutates it freely, so the
// server stores that document in real tables rather than a single JSON blob:
// every collection below becomes a table you can query, index and inspect with
// any SQLite tool.
//
// Column kinds:
//   "text" | "int" | "real"  -> scalar column
//   "json"                   -> nested object/array, stored as JSON text
//
// Any key present on a record but absent from `cols` is preserved in the
// `extra` JSON column, so adding a field to the UI never silently drops data.

export const COLLECTIONS = {
  users: {
    cols: { id: "text", name: "text", username: "text", email: "text", password: "text", role: "text" },
  },
  clients: {
    cols: { id: "text", name: "text", phone: "text", createdAt: "text" },
    indexes: ["name"],
  },
  services: {
    cols: { id: "text", name: "text", description: "text", price: "real" },
  },
  categories: {
    cols: { id: "text", name: "text" },
  },
  products: {
    cols: {
      id: "text", name: "text", description: "text", brand: "text", categoryId: "text",
      barcode: "text", purchasePrice: "real", salePrice: "real",
      qtyPrincipal: "int", qtyCurrent: "int", minQty: "int",
      trackExpiration: "int", expiration: "text", createdAt: "text",
    },
    indexes: ["categoryId", "barcode"],
  },
  suppliers: {
    cols: { id: "text", name: "text", phone: "text", address: "text" },
  },
  purchases: {
    cols: {
      id: "text", ref: "text", supplierId: "text", date: "text",
      items: "json", total: "real", payments: "json", createdAt: "text",
    },
    indexes: ["supplierId", "date"],
  },
  sales: {
    cols: {
      id: "text", ref: "text", clientId: "text", date: "text",
      items: "json", subtotal: "real", discount: "json", total: "real",
      payments: "json", note: "text", createdAt: "text",
    },
    indexes: ["clientId", "date"],
  },
  repairs: {
    cols: {
      id: "text", type: "text", status: "text", dateIn: "text", dateOut: "text",
      clientId: "text", car: "json", problem: "text",
      services: "json", products: "json",
      subtotal: "real", tva: "json", total: "real",
      payments: "json", workers: "json", createdAt: "text",
    },
    indexes: ["clientId", "status", "dateIn"],
  },
  roles: {
    cols: { id: "text", name: "text" },
  },
  workers: {
    cols: {
      id: "text", fullName: "text", birthday: "text", idCard: "text", phone: "text",
      roleId: "text", startDate: "text",
      pay: "json", account: "json", permissions: "json",
      advances: "json", absences: "json", payments: "json", settledRepairIds: "json",
    },
    indexes: ["roleId"],
  },
  expenseCategories: {
    cols: { id: "text", name: "text" },
  },
  expenses: {
    cols: { id: "text", name: "text", description: "text", categoryId: "text", amount: "real", date: "text" },
    indexes: ["categoryId", "date"],
  },
  caisseCategories: {
    cols: { id: "text", name: "text" },
  },
  caisse: {
    cols: { id: "text", type: "text", amount: "real", date: "text", description: "text", categoryId: "text" },
    indexes: ["date"],
  },
  barcodes: {
    cols: { id: "text", name: "text", code: "text", price: "real", productId: "text", createdAt: "text" },
    indexes: ["code"],
  },
};

// Single-row values kept in the `meta` key/value table instead of their own table.
export const SINGLETONS = ["settings", "counters", "createdAt"];

export const SQL_TYPE = { text: "TEXT", int: "INTEGER", real: "REAL", json: "TEXT" };

export function createTablesSQL() {
  const stmts = [];
  for (const [name, spec] of Object.entries(COLLECTIONS)) {
    const cols = Object.entries(spec.cols).map(([col, kind]) =>
      col === "id" ? `"id" TEXT PRIMARY KEY` : `"${col}" ${SQL_TYPE[kind]}`
    );
    cols.push(`"extra" TEXT`);
    // `pos` preserves the order the UI stored records in (e.g. barcodes are unshifted)
    cols.push(`"pos" INTEGER`);
    stmts.push(`CREATE TABLE IF NOT EXISTS "${name}" (${cols.join(", ")})`);
    for (const col of spec.indexes || []) {
      stmts.push(`CREATE INDEX IF NOT EXISTS "idx_${name}_${col}" ON "${name}" ("${col}")`);
    }
  }
  stmts.push(`CREATE TABLE IF NOT EXISTS "meta" ("key" TEXT PRIMARY KEY, "value" TEXT)`);
  return stmts;
}
