// src/app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="relative isolate">
      {/* background flourish */}
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.15] [background:radial-gradient(900px_400px_at_20%_-10%,#2d6cdf,transparent),radial-gradient(900px_400px_at_120%_110%,#0ea5e9,transparent)]" />
      <div className="mx-auto grid min-h-[72vh] max-w-7xl place-items-center px-6 py-14">
        <div className="mx-auto flex w-full max-w-[980px] flex-col items-center gap-8 text-center">
          {/* brand heading */}
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Welcome back to <span className="text-[#4ea1ff]">ADAP</span>
            </h1>
            <p className="mt-2 text-white/70">
              Sign in to track orders, earn loyalty, and checkout faster.
            </p>
          </div>

          {/* Clerk modal */}
          <div className="w-full grid place-items-center">
            <SignIn routing="path" path="/sign-in" />
          </div>

          {/* trust markers (optional) */}
          <ul className="mt-2 grid grid-cols-1 gap-2 text-sm text-white/60 sm:grid-cols-3">
            <li>Secure OAuth (Google)</li>
            <li>Encrypted sessions</li>
            <li>Compliance & privacy by design</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
