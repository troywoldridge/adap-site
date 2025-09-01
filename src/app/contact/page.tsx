import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | American Design And Printing",
  description:
    "Get in touch with American Design And Printing (ADAP). We’d love to hear from you!",
};

export default function ContactPage() {
  return (
    <main className="container mx-auto px-6 py-12 prose">
      <h1>Contact Us</h1>
      <p>We’d love to hear from you! Reach us through the options below:</p>

      <h2>Address</h2>
      <p>
        American Design And Printing
        <br />
        [171 Main St
        Vanceburg KY, 41179]
      </p>

      <h2>Phone</h2>
      <p>(555) 123-4567</p>

      <h2>Email</h2>
      <p>
        <a href="mailto:support@adap.com">support@adap.com</a>
      </p>

      <h2>Online Form</h2>
      <p>
        You can also reach out through our{" "}
        <a href="/contact/form">contact form</a>, and we’ll respond within 1
        business day.
      </p>
    </main>
  );
}
