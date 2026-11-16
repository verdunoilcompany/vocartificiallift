import "server-only";
import type sqlTypes from "mssql";

/**
 * Shared SQL Server connection pool. Settings come from .env.
 *
 * Windows authentication (current setup, XSPOC on VOC-SQL05):
 *   SQL_SERVER=VOC-SQL05
 *   SQL_DATABASE=XSPOC
 *   SQL_DRIVER=ODBC Driver 18 for SQL Server
 *   SQL_AUTH=windows
 * Uses the msnodesqlv8 driver (ODBC). The connection runs as the Windows account running Node:
 * your login locally, the IIS app pool identity on the server, which needs read access to the DB.
 *
 * SQL login (fallback): MSSQL_HOST, MSSQL_USER, MSSQL_PASSWORD, MSSQL_DATABASE (+ MSSQL_PORT,
 * MSSQL_ENCRYPT, MSSQL_TRUST_SERVER_CERTIFICATE), via the default tedious driver.
 *
 * Connections ask for ApplicationIntent=ReadOnly; the app only runs SELECT queries.
 */

type Sql = typeof sqlTypes;
type Pool = sqlTypes.ConnectionPool;

let poolPromise: Promise<Pool> | null = null;

export function isWindowsAuth(): boolean {
  return (process.env.SQL_AUTH ?? "").toLowerCase() === "windows";
}

export function isMssqlConfigured(): boolean {
  const e = process.env;
  return isWindowsAuth()
    ? Boolean(e.SQL_SERVER && e.SQL_DATABASE)
    : Boolean(
        e.MSSQL_HOST && e.MSSQL_USER && e.MSSQL_PASSWORD && e.MSSQL_DATABASE,
      );
}

async function connect(): Promise<Pool> {
  const e = process.env;
  if (isWindowsAuth()) {
    if (!e.SQL_SERVER || !e.SQL_DATABASE) {
      throw new Error(
        "SQL Server is not configured. Set SQL_SERVER and SQL_DATABASE.",
      );
    }
    const driver = e.SQL_DRIVER || "ODBC Driver 18 for SQL Server";
    // Driver 18 encrypts by default; internal servers usually have a self-signed certificate.
    const trust = e.SQL_TRUST_SERVER_CERTIFICATE === "false" ? "no" : "yes";
    const connectionString =
      `Driver={${driver}};Server=${e.SQL_SERVER};Database=${e.SQL_DATABASE};` +
      `Trusted_Connection=yes;TrustServerCertificate=${trust};ApplicationIntent=ReadOnly;`;
    const mod = (await import("mssql/msnodesqlv8")) as unknown as {
      default?: Sql;
    } & Sql;
    const sql = mod.default ?? mod;
    return new sql.ConnectionPool({
      connectionString,
      pool: { max: 10, min: 0, idleTimeoutMillis: 30_000 },
    } as unknown as sqlTypes.config).connect();
  }

  const { MSSQL_HOST, MSSQL_USER, MSSQL_PASSWORD, MSSQL_DATABASE } = e;
  if (!MSSQL_HOST || !MSSQL_USER || !MSSQL_PASSWORD || !MSSQL_DATABASE) {
    throw new Error(
      "SQL Server is not configured. Set SQL_SERVER, SQL_DATABASE and SQL_AUTH=windows, or MSSQL_HOST, MSSQL_USER, MSSQL_PASSWORD, MSSQL_DATABASE.",
    );
  }
  const mod = (await import("mssql")) as unknown as { default?: Sql } & Sql;
  const sql = mod.default ?? mod;
  return new sql.ConnectionPool({
    server: MSSQL_HOST,
    port: Number(e.MSSQL_PORT || 1433),
    user: MSSQL_USER,
    password: MSSQL_PASSWORD,
    database: MSSQL_DATABASE,
    options: {
      encrypt: e.MSSQL_ENCRYPT !== "false",
      trustServerCertificate: e.MSSQL_TRUST_SERVER_CERTIFICATE === "true",
      readOnlyIntent: true,
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30_000 },
  }).connect();
}

export function getMssqlPool(): Promise<Pool> {
  if (!poolPromise) {
    poolPromise = connect().catch((err) => {
      poolPromise = null;
      throw err;
    });
  }
  return poolPromise;
}

/** Runs a parameterized query and returns typed rows. */
export async function mssqlQuery<T>(
  text: string,
  params: Record<string, unknown> = {},
): Promise<T[]> {
  const pool = await getMssqlPool();
  const req = pool.request();
  for (const [name, value] of Object.entries(params)) req.input(name, value);
  const result = await req.query<T>(text);
  return result.recordset;
}

/**
 * SQL Server DATETIME has no timezone; the driver hands it back as if it were UTC.
 * Read the UTC parts to get the wall-clock time exactly as stored ("YYYY-MM-DD HH:mm:ss").
 */
export function sqlDateTimeToText(d: Date | null | undefined): string | null {
  if (!d || Number.isNaN(d.getTime())) return null;
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ` +
    `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`
  );
}
