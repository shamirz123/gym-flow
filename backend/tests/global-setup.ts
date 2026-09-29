import { execSync } from "node:child_process";

// Apply all migrations to the test database (once, before the tests)
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://gymflow:gymflow@localhost:5433/gymflow_test";
  execSync("npx prisma migrate deploy", { stdio: "pipe", env: { ...process.env, DATABASE_URL: url } });
}
