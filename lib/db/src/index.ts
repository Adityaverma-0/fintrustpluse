import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.warn("WARNING: DATABASE_URL is not set. Database queries will fail. Set DATABASE_URL to connect to a database.");
}

const localUser = process.env.USER || process.env.USERNAME || "postgres";
const fallbackUrl = `postgresql://${localUser}@localhost:5432/postgres`;
export const pool = new Pool({ connectionString: dbUrl || fallbackUrl });
export const db = drizzle(pool, { schema });

export * from "./schema";
