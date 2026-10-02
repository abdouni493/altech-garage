// ===== SQLite persistence (uses Node's built-in node:sqlite — no native build) =====

import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { COLLECTIONS, SINGLETONS, SQL_TYPE, createTablesSQL } from "./schema.js";

// A brand-new, empty database. No demo records — only the structure the UI needs.
export function emptyDoc() {
  const doc = {};
  for (const name of Object.keys(COLLECTIONS)) doc[name] = [];
  doc.counters = { purchase: 1, sale: 1 };
  doc.settings = {
    logo: "",
    name: "",
    description: "",
    email: "",
    phone: "",
    address: "",
    nif: "",
    nis: "",
    article: "",
    rc: "",
  };
  doc.createdAt = new Date().toISOString();
  return doc;
}

const toDbValue = (kind, v) => {
  if (kind === "json") return v === undefined ? null : JSON.stringify(v);
  if (v === undefined || v === null) return null;
  if (kind === "int") return Math.trunc(Number(v)) || 0;
  if (kind === "real") return Number(v) || 0;
  return String(v);
};

const fromDbValue = (kind, v) => {
  if (v === null || v === undefined) return undefined;
  if (kind === "json") {
    try { return JSON.parse(v); } catch { return undefined; }
  }
  return v;
};

/**
 * Bring an existing file up to the current schema.
 *
 * `CREATE TABLE IF NOT EXISTS` creates missing *tables* but never adds a column
 * to a table that already exists — so a database written by an older version
 * would reject every INSERT once a collection gains a field. Adding the columns
 * here keeps upgrades in place, with no export/import step for the user.
 */
function migrateColumns(sql) {
  for (const [name, spec] of Object.entries(COLLECTIONS)) {
    const existing = new Set(
      sql.prepare(`PRAGMA table_info("${name}")`).all().map((r) => r.name)
    );
    if (!existing.size) continue; // table was just created with every column
    for (const [col, kind] of Object.entries(spec.cols)) {
      if (!existing.has(col)) sql.exec(`ALTER TABLE "${name}" ADD COLUMN "${col}" ${SQL_TYPE[kind]}`);
    }
    for (const col of ["extra", "pos"]) {
      if (!existing.has(col)) {
        sql.exec(`ALTER TABLE "${name}" ADD COLUMN "${col}" ${col === "pos" ? "INTEGER" : "TEXT"}`);
      }
    }
  }
}

export function openDatabase(file) {
  mkdirSync(dirname(file), { recursive: true });
  const sql = new DatabaseSync(file);
  sql.exec("PRAGMA journal_mode = WAL");
  sql.exec("PRAGMA foreign_keys = ON");
  for (const stmt of createTablesSQL()) sql.exec(stmt);
  migrateColumns(sql);

  const isEmpty = () => {
    const row = sql.prepare(`SELECT COUNT(*) AS n FROM "meta"`).get();
    return !row || row.n === 0;
  };

  /** Read the whole database back into the document shape the UI expects. */
  const read = () => {
    const doc = {};
    for (const [name, spec] of Object.entries(COLLECTIONS)) {
      const kinds = spec.cols;
      const rows = sql.prepare(`SELECT * FROM "${name}" ORDER BY "pos" ASC`).all();
      doc[name] = rows.map((row) => {
        const rec = {};
        for (const [col, kind] of Object.entries(kinds)) {
          const val = fromDbValue(kind, row[col]);
          if (val !== undefined) rec[col] = val;
        }
        if (row.extra) {
          try { Object.assign(rec, JSON.parse(row.extra)); } catch { /* ignore */ }
        }
        return rec;
      });
    }
    for (const key of SINGLETONS) {
      const row = sql.prepare(`SELECT "value" FROM "meta" WHERE "key" = ?`).get(key);
      if (row) {
        try { doc[key] = JSON.parse(row.value); } catch { /* ignore */ }
      }
    }
    const blank = emptyDoc();
    for (const key of SINGLETONS) if (doc[key] === undefined) doc[key] = blank[key];
    return doc;
  };

  const insertStatements = {};
  for (const [name, spec] of Object.entries(COLLECTIONS)) {
    const cols = [...Object.keys(spec.cols), "extra", "pos"];
    insertStatements[name] = sql.prepare(
      `INSERT INTO "${name}" (${cols.map((c) => `"${c}"`).join(", ")})
       VALUES (${cols.map(() => "?").join(", ")})`
    );
  }
  const metaUpsert = sql.prepare(
    `INSERT INTO "meta" ("key", "value") VALUES (?, ?)
     ON CONFLICT("key") DO UPDATE SET "value" = excluded."value"`
  );

  /**
   * Replace the stored database with `doc`, atomically.
   * The client always holds the authoritative full document, so a transactional
   * replace is both the simplest and the safest way to persist an edit.
   */
  const write = (doc) => {
    sql.exec("BEGIN IMMEDIATE");
    try {
      for (const [name, spec] of Object.entries(COLLECTIONS)) {
        sql.exec(`DELETE FROM "${name}"`);
        const records = Array.isArray(doc[name]) ? doc[name] : [];
        const kinds = spec.cols;
        records.forEach((rec, pos) => {
          if (!rec || typeof rec !== "object") return;
          const values = Object.entries(kinds).map(([col, kind]) => toDbValue(kind, rec[col]));
          const extra = {};
          for (const [key, val] of Object.entries(rec)) {
            if (!(key in kinds)) extra[key] = val;
          }
          values.push(Object.keys(extra).length ? JSON.stringify(extra) : null);
          values.push(pos);
          insertStatements[name].run(...values);
        });
      }
      for (const key of SINGLETONS) {
        metaUpsert.run(key, JSON.stringify(doc[key] ?? null));
      }
      sql.exec("COMMIT");
    } catch (err) {
      sql.exec("ROLLBACK");
      throw err;
    }
  };

  // First run: lay down an empty document so `read()` always has a shape to return.
  if (isEmpty()) write(emptyDoc());

  return { read, write, reset: () => { const d = emptyDoc(); write(d); return d; }, close: () => sql.close(), file };
}
