// src/app/layout.tsx
import type { ReactNode } from 'react';
import Navbar from '@/components/Navbar';
import Header from '@/components/Header';
import '@/globals.css'; // full stylesheet loaded after critical CSS

export const metadata = {
  title: 'Custom Print Experts',
  description:
    'Top-class custom printing solutions: business cards, invitations, promotional items, and more. Fast turnaround, dynamic pricing, and professional quality.',
};

const criticalCss = `
:root {
  --color-primary: #1e3a8a;
  --color-bg: #ffffff;
  --color-text: #171717;
  --radius: 6px;
  --focus-ring-color: #2563eb;
  --space-lg: 24px;
}
html { box-sizing: border-box; font-family: system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }
*,*::before,*::after{box-sizing:inherit;margin:0;padding:0;}
body { background: var(--color-bg); color: var(--color-text); line-height:1.5; }
.site-header { background:#e0f2fe; color: var(--color-primary); padding:16px 0; }
.container { max-width:1200px; margin:0 auto; padding:0 24px; }
.hero { background:#1f2937; color:#f0f9ff; padding:48px; text-align:center; border-radius:8px; }
.button { background: var(--color-primary); color:#fff; padding:12px 24px; border-radius:6px; text-decoration:none; display:inline-block; font-weight:600; }
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Critical CSS inlined for first paint */}
        <style dangerouslySetInnerHTML={{ __html: criticalCss }} />
      </head>
      <body>
        <Navbar />
        <Header />
        <main>{children}</main>
        <footer>
          <div className="container">
            <p>© {new Date().getFullYear()} Custom Print Experts. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
