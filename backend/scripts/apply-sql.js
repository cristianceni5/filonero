require("dotenv/config");

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

async function main() {
  const migrationArg = process.argv[2];
  if (!migrationArg) {
    throw new Error("Usage: node scripts/apply-sql.js <sql-file-path>");
  }

  const absolutePath = path.resolve(process.cwd(), migrationArg);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`SQL file not found: ${absolutePath}`);
  }

  const sql = fs.readFileSync(absolutePath, "utf8");
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const useSsl = process.env.DATABASE_SSL === "true" || process.env.NODE_ENV === "production";
  const client = new Client({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined
  });

  await client.connect();
  try {
    await client.query(sql);
    console.log(`SQL applied successfully: ${absolutePath}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Failed to apply SQL migration");
  console.error(error);
  process.exit(1);
});
