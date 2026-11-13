import "server-only";
import { Pool, type QueryResultRow } from "pg";

/**
 * Shared Postgres connection pool. Not used by the dynacard viewer yet.
 * Connection string comes from PG_CONNECTION_STRING in .env.
 */
let pool: Pool | null = null;

export function getPgPool(): Pool {
  if (!pool) {
    const connectionString = process.env.PG_CONNECTION_STRING;
    if (!connectionString) throw new Error("Postgres is not configured. Set PG_CONNECTION_STRING.");
    pool = new Pool({ connectionString, max: 10, idleTimeoutMillis: 30_000 });
  }
  return pool;
}

/** Runs a parameterized query ($1, $2, …) and returns typed rows. */
export async function pgQuery<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const result = await getPgPool().query<T>(text, params);
  return result.rows;
}
