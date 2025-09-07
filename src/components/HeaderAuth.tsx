// src/components/HeaderAuth.tsx
"use client";
import { SignedIn, SignedOut, SignInButton, SignOutButton, UserButton } from "@clerk/nextjs";

export default function HeaderAuth() {
  return (
    <div className="flex items-center gap-2">
      <SignedOut>
        <SignInButton mode="modal">
          <button className="rounded-lg border px-3 py-1.5 text-sm font-semibold text-gray-800 hover:bg-gray-50">
            Sign in
          </button>
        </SignInButton>
      </SignedOut>

      <SignedIn>
        <UserButton
          appearance={{
            elements: { avatarBox: "h-8 w-8 rounded-lg border" },
          }}
        />
        <SignOutButton>
          <button className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-50">
            Log out
          </button>
        </SignOutButton>
      </SignedIn>
    </div>
  );
}
