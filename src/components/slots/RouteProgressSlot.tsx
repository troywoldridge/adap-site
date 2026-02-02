import "server-only";

import { Suspense } from "react";
import RouteProgress from "@/components/RouteProgress";

export default function RouteProgressSlot() {
  return (
    <Suspense fallback={null}>
      <RouteProgress />
    </Suspense>
  );
}
