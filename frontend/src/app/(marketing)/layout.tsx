import type { ReactNode } from "react";
import "../site.css";
import "./marketing.css";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <div className="site mk">{children}</div>;
}
