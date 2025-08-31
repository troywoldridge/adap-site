"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function ContinueAfterUpload({ href }: { href: string }) {
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const handler = () => setOk(true);
    window.addEventListener("adap:artworkUploaded", handler as EventListener);
    return () => window.removeEventListener("adap:artworkUploaded", handler as EventListener);
  }, []);

  if (!ok) {
    return <p className="text-neutral-600 mt-3">Upload at least one file to continue.</p>;
  }

  return (
    <Link
      href={href}
      className="btn btn-primary"
      aria-disabled={!ok}
      onClick={(e) => {
        if (!ok) e.preventDefault();
      }}
    >
      Continue to Cart
    </Link>
  );
}
