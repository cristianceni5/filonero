import { Pool, types, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { env } from "../config/env";

const useSsl = env.DATABASE_SSL || env.NODE_ENV === "production";
const TIMESTAMPTZ_OID = 1184;
const TIMESTAMP_OID = 1114;

types.setTypeParser(TIMESTAMPTZ_OID, (value) => new Date(value));
types.setTypeParser(TIMESTAMP_OID, (value) => new Date(`${value}Z`));

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined
});

pool.on("error", (error: Error) => {
  console.error("Unexpected PostgreSQL pool error", error);
});

export type DbClient = {
  query: <T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ) => Promise<QueryResult<T>>;
};

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = []
): Promise<QueryResult<T>> {
  return pool.query<T>(text, values);
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
