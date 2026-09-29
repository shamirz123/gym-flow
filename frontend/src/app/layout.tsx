import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Bebas_Neue, Poppins } from "next/font/google";
import { SITE_URL } from "@/lib/api";
import "./globals.css";

const head = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-head", display: "swap" });
const body = Poppins({ weight: ["300", "400", "500", "600", "700"], subsets: ["latin"], variable: "--font-body", display: "swap" });

// Colour of the mobile browser's top bar
export const viewport: Viewport = { themeColor: "#0a0a0c", colorScheme: "dark" };

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  appleWebApp: { capable: true, statusBarStyle: "black-translucent" },
  title: { default: "GymFlow — Gym Management Software for Pakistan", template: "%s" },
  description: "Gym website, members, fee tracking, QR attendance and staff roles — all in one place. 14-day free trial.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${head.variable} ${body.variable}`} data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
