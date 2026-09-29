import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import type { Request } from "express";
import { v2 as cloudinary } from "cloudinary";
import { env } from "../env.js";
import { HttpError } from "./http.js";

const useCloudinary = !!env.CLOUDINARY_CLOUD_NAME;
if (useCloudinary) {
  cloudinary.config({ cloud_name: env.CLOUDINARY_CLOUD_NAME, api_key: env.CLOUDINARY_API_KEY, api_secret: env.CLOUDINARY_API_SECRET });
}

// Vercel only allows writing to /tmp (use Cloudinary there — /tmp files do not last)
export const UPLOAD_DIR = process.env.VERCEL ? "/tmp/uploads" : path.resolve(import.meta.dirname, "../../uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const TYPES: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    TYPES[file.mimetype] ? cb(null, true) : cb(new HttpError(400, "Only JPG, PNG, WEBP or GIF images are allowed")),
});

// Upload to Cloudinary when configured (one folder per gym), otherwise to backend/uploads
export async function saveImage(file: Express.Multer.File, req: Request): Promise<string> {
  const gymId = req.gym!.id;
  if (useCloudinary) {
    const result = await new Promise<{ secure_url: string }>((resolve, reject) =>
      cloudinary.uploader
        .upload_stream({ folder: `gymflow/${gymId}`, resource_type: "image" }, (err, r) => (err || !r ? reject(err) : resolve(r)))
        .end(file.buffer)
    );
    return result.secure_url;
  }
  const name = `${gymId}-${crypto.randomBytes(10).toString("hex")}${TYPES[file.mimetype]}`;
  await fs.promises.writeFile(path.join(UPLOAD_DIR, name), file.buffer);
  return `${req.protocol}://${req.get("host")}/uploads/${name}`;
}
