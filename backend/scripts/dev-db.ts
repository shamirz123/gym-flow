/**
 * Local PostgreSQL without Docker (development only).
 * Same as the Docker Postgres: port 5433, user/password/db = gymflow
 *   npm run db:local
 * Data is stored in backend/.pgdata. Press Ctrl+C to stop.
 */
import EmbeddedPostgres from "embedded-postgres";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const dir = path.resolve(import.meta.dirname, "../.pgdata");
const db = new EmbeddedPostgres({
  databaseDir: dir,
  user: "gymflow",
  password: "gymflow",
  port: 5433,
  persistent: true,
  // Always UTF-8: on Windows initdb otherwise defaults to WIN1252, which can't store Urdu text or emoji
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
});

if (!fs.existsSync(path.join(dir, "PG_VERSION"))) {
  console.log("🆕 First run: creating the database folder...");
  await db.initialise();
}
await db.start();

// Create the app + test databases as UTF-8 (template0, so an older non-UTF-8 template1 doesn't matter)
const admin = new pg.Client({ connectionString: "postgresql://gymflow:gymflow@localhost:5433/postgres" });
await admin.connect();
for (const name of ["gymflow", "gymflow_test"]) {
  const found = await admin.query("SELECT pg_encoding_to_char(encoding) AS enc FROM pg_database WHERE datname = $1", [name]);
  if (!found.rowCount) {
    await admin.query(`CREATE DATABASE ${name} TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C'`);
  } else if (found.rows[0].enc !== "UTF8") {
    console.warn(`⚠️  Database "${name}" uses ${found.rows[0].enc}, not UTF-8 — Urdu text and emoji can't be stored. Recreate it as UTF-8.`);
  }
}
await admin.end();
console.log("✅ PostgreSQL is running: postgresql://gymflow:gymflow@localhost:5433/gymflow  (Ctrl+C to stop)");

const stop = async () => {
  await db.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
