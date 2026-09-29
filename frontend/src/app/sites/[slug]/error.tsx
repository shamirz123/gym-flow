"use client";
import { useEffect } from "react";

// If part of the website crashes, show this instead of a blank page
export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className="site site-error">
      <div>
        <h1>We'll be back shortly</h1>
        <p style={{ marginBottom: 28 }}>We're updating a few things. Please try again in a moment.</p>
        <button className="btn btn-primary" onClick={reset}>Try again</button>
      </div>
    </div>
  );
}
