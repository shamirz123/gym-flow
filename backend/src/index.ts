import { env } from "./env.js"; // first: .env + Pakistan time zone
import { createApp } from "./app.js";
import { prisma } from "./db.js";
import { billingMode } from "./lib/billing.js";

try {
  await prisma.$queryRaw`SELECT 1`;
  console.log("✅ PostgreSQL connected");
} catch (err) {
  console.error("\n❌ Could not connect to PostgreSQL:", (err as Error).message);
  console.error("   Start the database:  docker compose up -d db   (or without Docker:  npm run db:local)\n");
  process.exit(1);
}

createApp().listen(env.PORT, () => {
  console.log(`🚀 GymFlow API: http://localhost:${env.PORT}  (billing: ${billingMode})`);
});
