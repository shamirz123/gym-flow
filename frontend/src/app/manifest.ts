import type { MetadataRoute } from "next";

// "Add to Home Screen" on mobile — the staff dashboard opens like an app
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GymFlow — Gym Management",
    short_name: "GymFlow",
    description: "Gym members, fees, QR attendance and website — in one place",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0a0a0c",
    theme_color: "#ff4d1c",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
