import "server-only";

import { Suspense } from "react";
import SignupPromoCard from "@/components/SignupPromoCard";

export default function SignupPromoSlot() {
  return (
    <Suspense fallback={null}>
      <SignupPromoCard />
    </Suspense>
  );
}
