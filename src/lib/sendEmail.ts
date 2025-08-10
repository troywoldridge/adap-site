// src/lib/sendEmail.ts
import { Resend } from "resend";
import type { ReactElement } from "react";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailParams {
  to: string | string[];
  subject: string;
  react?: ReactElement;   // React Email component
  html?: string;          // raw HTML alternative
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

export async function sendEmail({
  to, subject, react, html, from, replyTo, cc, bcc,
}: SendEmailParams) {
  if (!to) {
    throw new Error("Missing recipient email address!");
  }
  if (!subject) {
    throw new Error("Missing email subject!");
  }

  let emailHtml = html;

  if (react) {
    // Some versions export async-only; use renderAsync to be safe
    const mod = await import("@react-email/render");
    const renderAsync = (mod as any).renderAsync ?? mod.render;
    emailHtml = await renderAsync(react);
  }

  if (!emailHtml) {
    throw new Error("No HTML content provided.");
  }

  return resend.emails.send({
    from: from ?? "ADAP <noreply@yourdomain.com>",
    to,
    subject,
    html: emailHtml,
    replyTo,    // ✅ camelCase
    cc,
    bcc,
  });
}
