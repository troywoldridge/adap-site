// src/components/reviews/TurnstileWidget.tsx
"use client";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: { sitekey: string; callback: (token: string) => void }) => void;
      reset: (el?: any) => void;
    };
  }
}

export default function TurnstileWidget({
  siteKey,
  onVerify,
  className,
}: {
  siteKey: string;
  onVerify: (token: string) => void;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const render = () => {
      if (boxRef.current && window.turnstile) {
        window.turnstile.render(boxRef.current, {
          sitekey: siteKey,
          callback: (token) => onVerify(token),
        });
      }
    };

    if (window.turnstile) render();
    else {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      s.async = true; s.defer = true;
      s.onload = render;
      document.head.appendChild(s);
    }
  }, [siteKey, onVerify]);

  return <div ref={boxRef} className={className} />;
}
