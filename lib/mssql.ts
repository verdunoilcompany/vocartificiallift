import "server-only";
import sql from "mssql";

/**
 * Shared MSSQL connection pool. Not used by the dynacard viewer yet — ready for when
 * predictions move from flat files into SQL Server. All settings come from .env.
 */
let poolPromise: Promise<sql.ConnectionPool> | null = null;

function config(): sql.config {
  const { MSSQL_HOST, MSSQL_USER, MSSQL_PASSWORD, MSSQL_DATABASE } = process.env;
  if (!MSSQL_HOST || !MSSQL_USER || !MSSQL_PASSWORD || !MSSQL_DATABASE) {
    throw new Error("MSSQL is not configured. Set MSSQL_HOST, MSSQL_USER, MSSQL_PASSWORD, MSSQL_DATABASE.");
  }
  return {
    server: MSSQL_HOST,
    port: Number(process.env.MSSQL_PORT || 1433),
    user: MSSQL_USER,
    password: MSSQL_PASSWORD,
    database: MSSQL_DATABASE,
    options: {
      encrypt: process.env.MSSQL_ENCRYPT !== "false",
      trustServerCertificate: process.env.MSSQL_TRUST_SERVER_CERTIFICATE === "true",
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30_000 },
  };
}

export function getMssqlPool(): Promise<sql.ConnectionPool> {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config()).connect().catch((err) => {
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
