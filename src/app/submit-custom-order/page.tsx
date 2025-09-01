// src/app/submit-custom-order/page.tsx
import { redirect } from "next/navigation";

export default function SubmitCustomOrderPage() {
  // Keep URL stable if you like
  redirect("/quotes#order");
}
