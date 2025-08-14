"use client";
import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "70vh", padding: 24 }}>
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        afterSignUpUrl="/account/onboarding"
        afterSignInUrl="/account/onboarding"
        appearance={{ variables: { colorPrimary: "#c62828" } }}
      />
    </div>
  );
}
