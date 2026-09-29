import Link from "next/link";
import "./site.css";

export const metadata = { title: "Page not found (404)" };

export default function NotFound() {
  return (
    <div className="site site-error">
      <div>
        <h1 style={{ fontSize: 120, lineHeight: 1 }} className="accent">404</h1>
        <h1>This page does not exist</h1>
        <p style={{ marginBottom: 28 }}>The link may be wrong, or the page has been removed.</p>
        <Link href="/" className="btn btn-primary">Go to the home page</Link>
      </div>
    </div>
  );
}
