import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import path from "path";
import { getSite } from "@/lib/api";

// Preview image shown when a gym's link is shared on WhatsApp / Facebook
export const alt = "Gym";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

async function heroSrc(image?: string) {
  if (image?.startsWith("http")) return image;
  try {
    const file = await readFile(path.join(process.cwd(), "public", image || "/images/hero.jpg"));
    return `data:image/jpeg;base64,${file.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await getSite(slug).then((d) => d.settings).catch(() => null);
  const name = s?.name || "GYM";
  const bg = await heroSrc(s?.hero?.image);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#0a0a0c", color: "#fff", fontFamily: "sans-serif" }}>
        {bg && <img src={bg} width={1200} height={630} alt="" style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, objectFit: "cover" }} />}
        <div style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, display: "flex", backgroundImage: "linear-gradient(100deg, rgba(10,10,12,0.97) 40%, rgba(10,10,12,0.7) 70%, rgba(255,77,28,0.4))" }} />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 80px", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 26, color: "#ff9a1c", fontWeight: 700, letterSpacing: 4 }}>📍 {(s?.city || "").toUpperCase()}</div>
          <div style={{ display: "flex", fontSize: 110, fontWeight: 900, letterSpacing: 2, lineHeight: 1 }}>{name}</div>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 700, color: "#ff4d1c" }}>{s?.tagline || "Fitness Club"}</div>
          <div style={{ display: "flex", fontSize: 30, color: "#d4d4d8", marginTop: 10 }}>Certified Trainers · Ladies Timing · Diet Plans</div>
          <div style={{ display: "flex", marginTop: 24 }}>
            <div style={{ display: "flex", background: "linear-gradient(135deg, #ff4d1c, #ff9a1c)", padding: "14px 34px", borderRadius: 50, fontSize: 30, fontWeight: 700 }}>
              First Day FREE — Book Now
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
