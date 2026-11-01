import mysql, { type Pool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";
import { randomUUID } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";

export type SqlValue = string | number | boolean | bigint | Date | Buffer | null;
export type SqlParams = readonly unknown[];
export type WriteResult = { changes: number; insertId: number };
const configuredConnections = new WeakSet<object>();
const transactionContext = new AsyncLocalStorage<PoolConnection>();
const globalDb = globalThis as typeof globalThis & { meritTrackPool?: Pool };

export function getPool() {
  if (!globalDb.meritTrackPool) {
    const required = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"] as const;
    for (const key of required) if (!process.env[key]) throw new Error(`Missing MySQL configuration: ${key}`);
    const port = Number(process.env.DB_PORT || 3306);
    const limit = Number(process.env.DB_CONNECTION_LIMIT || 10);
    if (!Number.isInteger(port) || port < 1 || port > 65535 || !Number.isInteger(limit) || limit < 1) throw new Error("Invalid MySQL port or connection limit.");
    globalDb.meritTrackPool = mysql.createPool({
      host: process.env.DB_HOST, port, database: process.env.DB_NAME, user: process.env.DB_USER,
      password: process.env.DB_PASSWORD, waitForConnections: true, connectionLimit: limit,
      ssl: process.env.DB_SSL === "true" ? {rejectUnauthorized:true, ca:process.env.DB_SSL_CA || undefined} : undefined,
      queueLimit: 1000, charset: "utf8mb4", timezone: "Z", dateStrings: true,
      decimalNumbers: true, supportBigNumbers: true, bigNumberStrings: false,
      multipleStatements: false, enableKeepAlive: true,
      typeCast(field, next) {
        if (field.type === "DATETIME" || field.type === "TIMESTAMP") {
          const value = field.string();
          return value === null ? null : value.replace(" ", "T") + "Z";
        }
        return next();
      },
    });
  }
  return globalDb.meritTrackPool;
}

function parameters(values: SqlParams) {
  return values.map(value => {
    if (value === undefined) return null;
    if (typeof value === "number" && !Number.isFinite(value)) throw new Error("Non-finite SQL number.");
    if (value instanceof Date && Number.isNaN(value.getTime())) throw new Error("Invalid SQL date.");
    if (typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(value)) {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) throw new Error("Invalid SQL timestamp.");
      return date;
    }
    if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean" || typeof value === "bigint" || value instanceof Date || Buffer.isBuffer(value)) return value;
    throw new Error("Unsupported SQL parameter type.");
  });
}

async function configureConnection(connection: PoolConnection) {
  if (configuredConnections.has(connection.connection)) return;
  await connection.query("SET SESSION time_zone = '+00:00', SESSION group_concat_max_len = 1048576, SESSION sql_mode = CONCAT_WS(',',@@SESSION.sql_mode,'STRICT_TRANS_TABLES','ONLY_FULL_GROUP_BY','NO_ZERO_DATE','NO_ZERO_IN_DATE','ERROR_FOR_DIVISION_BY_ZERO')");
  configuredConnections.add(connection.connection);
}

async function withPooledConnection<T>(operation: (connection: PoolConnection) => Promise<T>) {
  const active = transactionContext.getStore();
  if (active) return operation(active);
  const connection = await getPool().getConnection();
  try {
    await configureConnection(connection);
    return await operation(connection);
  } finally { connection.release(); }
}

export class Database {
  async resolveRouteRecordId(value: string): Promise<number> {
    if (/^[1-9]\d*$/.test(value)) return Number(value);
    if (!/^[a-f0-9]{32}$/.test(value)) return 0;

    const pageRoute = await this.first<{ internal_path: string }>(
      "SELECT internal_path FROM public_page_routes WHERE token=?",
      [value],
    );
    const pathId = pageRoute?.internal_path.match(/\/(\d+)(?:\/(?:edit|candidates|configure))?$/)?.[1];
    if (pathId && /^[1-9]\d*$/.test(pathId)) return Number(pathId);

    const activity = await this.first<{ activity_id: number }>(
      "SELECT activity_id FROM activity_public_ids WHERE token=?",
      [value],
    );
    return Number(activity?.activity_id ?? 0);
  }

  async rows<T = Record<string, unknown>>(sql: string, params: SqlParams = []): Promise<T[]> {
    return (await withPooledConnection(async connection => {
      const [rows] = await connection.query<RowDataPacket[]>(sql, parameters(params));
      return rows as T[];
    }));
  }
  async first<T = Record<string, unknown>>(sql: string, params: SqlParams = []): Promise<T | undefined> {
    return (await this.rows<T>(sql, params))[0];
  }
  async execute(sql: string, params: SqlParams = []): Promise<WriteResult> {
    return (await withPooledConnection(async connection => {
      const [result] = await connection.query<ResultSetHeader>(sql, parameters(params));
      return { changes: result.affectedRows, insertId: result.insertId };
    }));
  }
  async withTransaction<T>(operation: () => Promise<T>): Promise<T> {
    const parent = transactionContext.getStore();
    if (parent) {
      const name = 'sp_' + randomUUID().replaceAll('-', '');
      await parent.query('SAVEPOINT ' + name);
      try { const result = await operation(); await parent.query('RELEASE SAVEPOINT ' + name); return result; }
      catch (error) { await parent.query('ROLLBACK TO SAVEPOINT ' + name); await parent.query('RELEASE SAVEPOINT ' + name); throw error; }
    }
    const connection = await getPool().getConnection();
    try {
      await configureConnection(connection);
      await connection.beginTransaction();
      await connection.query("SELECT id FROM application_write_lock WHERE id=1 FOR UPDATE");
      const result = await transactionContext.run(connection, operation);
      await connection.commit();
      return result;
    } catch (error) {
      try { await connection.rollback(); } catch { /* Connection may already be closed. Preserve the original failure. */ }
      throw error;
    } finally { connection.release(); }
  }
}
const database = new Database();
export function getDatabase() { return database; }
export async function closeDatabase() {
  const pool = globalDb.meritTrackPool;
  delete globalDb.meritTrackPool;
  if (pool) await pool.end();
}
