import "server-only";
import type sqlTypes from "mssql";

import { openOdbcPool } from "@/lib/mssql";

/**
 * MLDB (dynocard predictions) on the dev SQL server, via a SQL login. Settings from .env:
 *   ML_SQL_SERVER, ML_SQL_DATABASE, ML_SQL_USER, ML_SQL_PASSWORD
 *   ML_SQL_DRIVER (optional, default ODBC Driver 18 for SQL Server)
 * Read-only (ApplicationIntent=ReadOnly); the app only runs SELECT queries.
 */
let poolPromise: Promise<sqlTypes.ConnectionPool> | null = null;

export function isMldbConfigured(): boolean {
  const e = process.env;
  return Boolean(
    e.ML_SQL_SERVER && e.ML_SQL_DATABASE && e.ML_SQL_USER && e.ML_SQL_PASSWORD,
  );
}

function getPool() {
  if (!poolPromise) {
    const e = process.env;
    if (!isMldbConfigured()) {
      return Promise.reject(
        new Error(
          "MLDB is not configured. Set ML_SQL_SERVER, ML_SQL_DATABASE, ML_SQL_USER and ML_SQL_PASSWORD.",
        ),
      );
    }
    poolPromise = openOdbcPool({
      server: e.ML_SQL_SERVER!,
      database: e.ML_SQL_DATABASE!,
      driver: e.ML_SQL_DRIVER,
      user: e.ML_SQL_USER,
      password: e.ML_SQL_PASSWORD,
    }).catch((err) => {
      poolPromise = null;
      throw err;
    });
  }
  return poolPromise;
}

/** Runs a parameterized query against MLDB and returns typed rows. */
export async function mldbQuery<T>(
  text: string,
  params: Record<string, unknown> = {},
): Promise<T[]> {
  const pool = await getPool();
  const req = pool.request();
  for (const [name, value] of Object.entries(params)) req.input(name, value);
  const result = await req.query<T>(text);
  return result.recordset;
}
