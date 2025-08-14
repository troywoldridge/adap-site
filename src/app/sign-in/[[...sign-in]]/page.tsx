"use client";
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "70vh", padding: 24 }}>
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        afterSignInUrl="/account/onboarding"
        afterSignUpUrl="/account/onboarding"
        fallbackRedirectUrl="/account/onboarding"
        appearance={{ variables: { colorPrimary: "#c62828" } }}
      />
    </div>
  );
}
