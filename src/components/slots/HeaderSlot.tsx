import "server-only";

import { Suspense } from "react";
import Header from "@/components/Header";

export default function HeaderSlot() {
  return (
    <Suspense fallback={null}>
      <Header />
    </Suspense>
  );
}
