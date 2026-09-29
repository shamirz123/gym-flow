import { Router } from "express";
import { prisma } from "../../db.js";
import { requirePerm } from "../../lib/auth.js";
import { settingsSchema } from "../../lib/schemas.js";
import { upload, saveImage } from "../../lib/upload.js";
import { HttpError } from "../../lib/http.js";

const r = Router();

r.get("/", requirePerm("content:view"), async (req, res) => {
  const settings = await prisma.gymSettings.findUnique({ where: { gymId: req.gym!.id } });
  res.json({ ...settings, name: req.gym!.name, slug: req.gym!.slug });
});

r.put("/", requirePerm("content:write"), async (req, res) => {
  const { name, ...data } = settingsSchema.parse(req.body);
  const gymId = req.gym!.id;
  const [settings, gym] = await prisma.$transaction([
    prisma.gymSettings.upsert({ where: { gymId }, create: { gymId, ...data }, update: data }),
    prisma.gym.update({ where: { id: gymId }, data: name ? { name } : {} }),
  ]);
  res.json({ ...settings, name: gym.name, slug: gym.slug });
});

// Image upload: website content (owner) or member photos (front desk)
r.post("/upload", requirePerm("members:write"), upload.single("image"), async (req, res) => {
  if (!req.file) throw new HttpError(400, "Please select an image");
  res.json({ url: await saveImage(req.file, req) });
});

export default r;
