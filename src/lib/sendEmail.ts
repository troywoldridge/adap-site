import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailParams {
  to: string | string[];
  subject: string;
  react?: React.ReactElement; // for React Email
  html?: string; // for raw HTML
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

export async function sendEmail({
  to,
  subject,
  react,
  html,
  from,
  replyTo,
  cc,
  bcc,
}: SendEmailParams) {
  if (!to) {
    throw new Error("Missing recipient email address!");
  }
  if (!subject) {
    throw new Error("Missing email subject!");
  }

  let emailHtml = html;
  if (react) {
    // React Email rendering for beautiful, typed emails!
    const { render } = await import("@react-email/render");
    emailHtml = render(react);
  }
  if (!emailHtml) {
    throw new Error("No HTML content provided.");
  }

  return await resend.emails.send({
    from: from || "ADAP <noreply@yourdomain.com>",
    to,
    subject,
    html: emailHtml,
    reply_to: replyTo,
    cc,
    bcc,
  });
}
