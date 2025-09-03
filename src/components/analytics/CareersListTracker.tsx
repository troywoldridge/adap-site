"use client";

import { useEffect } from "react";
import { trackCareerEvent } from "@/lib/analyticsClient";

export default function CareersListTracker() {
  useEffect(() => {
    trackCareerEvent("list_view");
  }, []);
  return null;
}
