import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customer Reviews | American Design And Printing",
  description:
    "See what customers are saying about American Design And Printing. Share your experience with us!",
};

export default function ReviewsPage() {
  return (
    <main className="container mx-auto px-6 py-12 prose">
      <h1>Customer Reviews</h1>
      <p>
        We’re just getting started — soon you’ll be able to read and share real
        experiences from our customers right here.
      </p>
      <p>In the meantime, you can:</p>
      <ul>
        <li>
          Leave a review on{" "}
          <a href="#" target="_blank" rel="noopener noreferrer">
            Google Reviews
          </a>
        </li>
        <li>
          Connect with us on{" "}
          <a href="#" target="_blank" rel="noopener noreferrer">
            Facebook
          </a>{" "}
          and{" "}
          <a href="#" target="_blank" rel="noopener noreferrer">
            Instagram
          </a>
        </li>
        <li>
          Send feedback directly through our{" "}
          <a href="/contact">Contact Page</a>.
        </li>
      </ul>
      <p>Your voice helps us grow — thank you for being part of our journey!</p>
    </main>
  );
}
