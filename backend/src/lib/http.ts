import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError, type ZodType, type z } from "zod";
import { Prisma } from "../generated/prisma/client.js";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public extra?: Record<string, unknown>
  ) {
    super(message);
  }
}

export const notFound = (what = "Record") => new HttpError(404, `${what} not found`);

// Validate and clean a request body with a Zod schema
export function parse<T extends ZodType>(schema: T, data: unknown): z.infer<T> {
  return schema.parse(data);
}

export const notFoundRoute: RequestHandler = (_req, res) => {
  res.status(404).json({ message: "Route not found" });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ message: err.message, ...err.extra });
    return;
  }
  if (err instanceof ZodError) {
    const issue = err.issues[0];
    const field = issue?.path.join(".");
    res.status(400).json({ message: field ? `${field}: ${issue.message}` : issue?.message || "Invalid data", issues: err.issues });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") { res.status(404).json({ message: "Record not found" }); return; }
    if (err.code === "P2002") { res.status(409).json({ message: "This record already exists" }); return; }
    if (err.code === "P2003") { res.status(400).json({ message: "Related record does not exist" }); return; }
  }
  if (err?.type === "entity.parse.failed") { res.status(400).json({ message: "Invalid JSON" }); return; }
  if (err?.code === "LIMIT_FILE_SIZE") { res.status(400).json({ message: "Image must be smaller than 5MB" }); return; }
  console.error(err);
  res.status(500).json({ message: "Server error" });
};
