"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "70vh", padding: 24 }}>
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/cart/review"   // if no returnBackUrl was set by middleware
        appearance={{ variables: { colorPrimary: "#c62828" } }}
      />
    </div>
  );
}
