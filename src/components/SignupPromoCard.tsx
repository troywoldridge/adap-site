// src/components/SignupPromoCard.tsx
"use client";

import { useAuth, SignInButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export default function SignupPromoCard() {
  const { isSignedIn } = useAuth();
  const [hidden, setHidden] = useState(false);

  const onboarding = "/account/onboarding";

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("promo_dismissed") === "1") {
      setHidden(true);
    }
  }, []);

  // Safe to return after all hooks have run
  if (isSignedIn || hidden) {
    return null;
  }

  return (
    <aside
      role="complementary"
      aria-label="Sign up and save"
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 50,
        width: 340,
        maxWidth: "calc(100% - 32px)",
        background: "#fff",
        border: "1px solid #e8e8e8",
        borderRadius: 12,
        boxShadow: "0 10px 30px rgba(0,0,0,.12)",
        padding: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h3 style={{ margin: "0 0 6px" }}>Join ADAP and save</h3>
          <p className="muted" style={{ margin: 0 }}>
            Create a free account to save quotes and upload artwork.
          </p>
        </div>
        <button
          aria-label="Dismiss"
          className="btn btn-plain"
          onClick={() => {
            localStorage.setItem("promo_dismissed", "1");
            setHidden(true);
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <SignInButton
          mode="modal"
          withSignUp
          forceRedirectUrl={onboarding}
          fallbackRedirectUrl={onboarding}
          signUpForceRedirectUrl={onboarding}
          signUpFallbackRedirectUrl={onboarding}
        >
          <button className="btn btn-primary" type="button">
            Sign in or create an account
          </button>
        </SignInButton>
      </div>
    </aside>
  );
}
