import { defineConfig } from "vitest/config";

// Tests run on a separate database — dev data is never wiped
const TEST_DB = process.env.TEST_DATABASE_URL ?? "postgresql://gymflow:gymflow@localhost:5433/gymflow_test";

export default defineConfig({
  test: {
    env: {
      NODE_ENV: "test",
      DATABASE_URL: TEST_DB,
      JWT_SECRET: "test-secret-key-at-least-16-chars",
      STRIPE_SECRET_KEY: "", // tests always use demo billing mode
      STRIPE_WEBHOOK_SECRET: "",
      STARTER_MAX_MEMBERS: "3", // small limits keep the limit tests fast
      STARTER_MAX_STAFF: "2",
      CLOUDINARY_CLOUD_NAME: "",
    },
    globalSetup: "./tests/global-setup.ts",
    fileParallelism: false, // all files share one test database
    testTimeout: 20000,
    hookTimeout: 60000,
  },
});
