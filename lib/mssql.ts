import "server-only";
import type sqlTypes from "mssql";

/**
 * SQL Server connections, using the pure-JavaScript driver that ships with `mssql` (tedious):
 * nothing has to be installed on the computer or server (no ODBC driver). Settings from .env.
 *
 * XSPOC (VOC-SQL05):
 *   SQL_SERVER=VOC-SQL05          (or HOST\INSTANCE, or HOST,PORT)
 *   SQL_DATABASE=XSPOC
 *   SQL_USER=...                  SQL login, or a Windows account when SQL_DOMAIN is set
 *   SQL_PASSWORD=...
 *   SQL_DOMAIN=...                (optional: sign in as DOMAIN\SQL_USER, a Windows account)
 * MLDB uses the same helper with ML_SQL_* (lib/mldb/connection.ts).
 *
 * Connections are encrypted (the server's certificate is trusted, as internal servers are
 * usually self-signed; set SQL_TRUST_SERVER_CERTIFICATE=false to require a valid one) and ask
 * for read-only intent; the app only runs SELECT queries.
 */

type Sql = typeof sqlTypes;
type Pool = sqlTypes.ConnectionPool;

let poolPromise: Promise<Pool> | null = null;

/** Opens a read-only connection pool. */
export async function openSqlPool(opts: {
  server: string;
  database: string;
  user: string;
  password: string;
  /** Set for a Windows (domain) account; otherwise `user` is a SQL login. */
  domain?: string;
}): Promise<Pool> {
  // "HOST\INSTANCE" or "HOST,PORT", as in SQL Server Management Studio.
  const [hostPart, portPart] = opts.server.split(",");
  const [host, instanceName] = hostPart.trim().split("\\");
  const port = portPart ? Number(portPart.trim()) : undefined;
  const mod = (await import("mssql")) as unknown as { default?: Sql } & Sql;
  const sql = mod.default ?? mod;
  const config: sqlTypes.config = {
    server: host,
    ...(port ? { port } : {}),
    database: opts.database,
    connectionTimeout: 15_000,
    requestTimeout: 60_000,
    options: {
      encrypt: true,
      trustServerCertificate:
        process.env.SQL_TRUST_SERVER_CERTIFICATE !== "false",
      readOnlyIntent: true,
      ...(instanceName ? { instanceName } : {}),
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30_000 },
    ...(opts.domain
      ? {
          authentication: {
            type: "ntlm",
            options: {
              domain: opts.domain,
              userName: opts.user,
              password: opts.password,
            },
          },
        }
      : { user: opts.user, password: opts.password }),
  };
  return new sql.ConnectionPool(config).connect();
}

export function isMssqlConfigured(): boolean {
  const e = process.env;
  return Boolean(
    e.SQL_SERVER && e.SQL_DATABASE && e.SQL_USER && e.SQL_PASSWORD,
  );
}

function connect(): Promise<Pool> {
  const e = process.env;
  if (!isMssqlConfigured()) {
    return Promise.reject(
      new Error(
        "XSPOC is not configured. Set SQL_SERVER, SQL_DATABASE, SQL_USER and SQL_PASSWORD (and SQL_DOMAIN for a Windows account).",
      ),
    );
  }
  return openSqlPool({
    server: e.SQL_SERVER!,
    database: e.SQL_DATABASE!,
    user: e.SQL_USER!,
    password: e.SQL_PASSWORD!,
    domain: e.SQL_DOMAIN || undefined,
  });
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
