// src/app/(auth)/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-md rounded-xl bg-slate-900/70 p-6 shadow-xl border border-slate-800">
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          afterSignInUrl="/"
          appearance={{
            layout: {
              socialButtonsPlacement: "bottom",
              socialButtonsVariant: "iconButton",
            },
            elements: {
              card: {
                backgroundColor: "transparent",
                boxShadow: "none",
              },
            },
            variables: {
              colorPrimary: "#0047ab",
              colorBackground: "transparent",
            },
          }}
        />
      </div>
    </main>
  );
}
