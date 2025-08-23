// src/components/AuthButtons.tsx
"use client";
import { SignedIn, SignedOut, UserButton, SignInButton, SignUpButton } from "@clerk/nextjs";

export default function AuthButtons() {
  return (
    <div className="auth-buttons">
      <SignedOut>
        <SignInButton mode="modal" />
        <SignUpButton mode="modal" />
      </SignedOut>
      <SignedIn>
        <a href="/account" className="link">My Account</a>
        <UserButton />
      </SignedIn>
    </div>
  );
}
