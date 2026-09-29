import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env, isTest } from "./env.js";
import { errorHandler, notFoundRoute } from "./lib/http.js";
import { UPLOAD_DIR } from "./lib/upload.js";
import { handleWebhook } from "./lib/billing.js";
import publicRoutes from "./routes/public.js";
import authRoutes from "./routes/auth.js";
import gymRoutes from "./routes/gym/index.js";
import platformRoutes from "./routes/platform.js";

// App factory, so tests (supertest) can run it without opening a port
export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

  // CORS: the main domain + every gym subdomain (ironpulse.localhost:3000)
  const root = env.ROOT_DOMAIN.replace(/:\d+$/, "");
  const allowed = new Set(env.CLIENT_URL.split(",").map((s) => s.trim()));
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || allowed.has(origin)) return cb(null, true);
        try {
          const host = new URL(origin).hostname;
          cb(null, host === root || host.endsWith(`.${root}`));
        } catch {
          cb(null, false);
        }
      },
    })
  );

  // The Stripe webhook needs the raw body (signature check) — so it goes before the JSON parser
  app.post("/api/billing/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const type = await handleWebhook(req.body as Buffer, req.header("stripe-signature"));
    res.json({ received: true, type });
  });

  app.use(express.json({ limit: "1mb" }));
  app.use("/uploads", express.static(UPLOAD_DIR, { maxAge: "30d" }));

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/public", publicRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/gym", gymRoutes);
  app.use("/api/platform", platformRoutes);

  app.use(notFoundRoute);
  app.use(errorHandler);
  if (!isTest) app.disable("x-powered-by");
  return app;
}
