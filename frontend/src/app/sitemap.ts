import type { MetadataRoute } from "next";
import { getActiveGyms, gymUrl, SITE_URL } from "@/lib/api";

export const revalidate = 3600;

// The GymFlow site + every active gym's website (subdomain)
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const gyms = await getActiveGyms();
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/signup`, changeFrequency: "monthly", priority: 0.8 },
    ...gyms.map((g) => ({ url: gymUrl(g.slug), lastModified: new Date(g.updatedAt), changeFrequency: "weekly" as const, priority: 0.9 })),
  ];
}
