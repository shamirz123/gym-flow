import dotenv from "dotenv";
import path from "node:path";
import { z } from "zod";

// Load backend/.env no matter which folder the server is started from (tests provide their own env)
dotenv.config({ path: path.resolve(import.meta.dirname, "../.env"), quiet: true });

// Gyms are in Pakistan: dates and months always use PKT (even if the server runs in UTC)
process.env.TZ ||= "Asia/Karachi";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5050),
  DATABASE_URL: z.string().min(1, "Set DATABASE_URL in .env"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  CLIENT_URL: z.string().default("http://localhost:3000"),
  ROOT_DOMAIN: z.string().default("localhost:3000"),
  ADMIN_EMAIL: z.string().email().default("admin@gym.com"),
  ADMIN_PASSWORD: z.string().min(8).default("admin12345"),
  STRIPE_SECRET_KEY: z.string().optional().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(""),
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(""),
  CLOUDINARY_API_KEY: z.string().optional().default(""),
  CLOUDINARY_API_SECRET: z.string().optional().default(""),
  // Plan limits (tests lower these)
  STARTER_MAX_MEMBERS: z.coerce.number().default(150),
  STARTER_MAX_STAFF: z.coerce.number().default(3),
  TRIAL_DAYS: z.coerce.number().default(14),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Invalid .env:\n" + parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n"));
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
