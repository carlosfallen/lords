// ============================================================
// D1 Database Helper — Raw SQL queries
// ============================================================
// NOTE: We use raw D1 queries (not Drizzle ORM) because
// drizzle-orm/d1 requires a build step with drizzle-kit that
// generates a full SQLite schema. For simplicity and to match
// the existing API patterns, we use D1's native API.
// ============================================================
import type { Env } from '../types';
import { newId, now } from '../types';

export function getDb(env: Env): D1Database {
    return env.DB;
}

// ─── Query Helpers ──────────────────────────────────────────

/** Run a SELECT query and return all rows */
export async function query<T = Record<string, unknown>>(
    db: D1Database,
    sql: string,
    params: unknown[] = []
): Promise<T[]> {
    const result = await db.prepare(sql).bind(...params).all<T>();
    return result.results;
}

/** Run a SELECT query and return the first row */
export async function queryOne<T = Record<string, unknown>>(
    db: D1Database,
    sql: string,
    params: unknown[] = []
): Promise<T | null> {
    const result = await db.prepare(sql).bind(...params).first<T>();
    return result;
}

/** Run an INSERT/UPDATE/DELETE and return metadata */
export async function execute(
    db: D1Database,
    sql: string,
    params: unknown[] = []
): Promise<D1Result> {
    return db.prepare(sql).bind(...params).run();
}

/** Run an INSERT and return the inserted row by ID */
export async function insertReturning<T = Record<string, unknown>>(
    db: D1Database,
    table: string,
    data: Record<string, unknown>,
    id?: string
): Promise<T> {
    const rowId = id || newId();
    const dataWithId = { id: rowId, ...data };

    const keys = Object.keys(dataWithId);
    const placeholders = keys.map(() => '?').join(', ');
    const values = keys.map(k => dataWithId[k]);

    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    await db.prepare(sql).bind(...values).run();

    // Return the inserted row
    const row = await db.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(rowId).first<T>();
    return row!;
}

/** Run an UPDATE and return the updated row */
export async function updateReturning<T = Record<string, unknown>>(
    db: D1Database,
    table: string,
    id: string,
    data: Record<string, unknown>
): Promise<T | null> {
    const keys = Object.keys(data);
    if (keys.length === 0) return null;

    const setClauses = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => data[k]);

    const sql = `UPDATE ${table} SET ${setClauses} WHERE id = ?`;
    await db.prepare(sql).bind(...values, id).run();

    return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(id).first<T>();
}

/** Batch multiple statements in a transaction */
export async function batch(db: D1Database, statements: D1PreparedStatement[]): Promise<D1Result[]> {
    return db.batch(statements);
}

// Re-export helpers
export { newId, now };
