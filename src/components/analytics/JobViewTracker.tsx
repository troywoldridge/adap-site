"use client";

import { useEffect } from "react";
import { trackCareerEvent } from "@/lib/analyticsClient";

export default function JobViewTracker(props: {
  jobSlug: string;
  jobTitle?: string;
  location?: string;
  employmentType?: string;
}) {
  useEffect(() => {
    trackCareerEvent("job_view", props);
  }, [props.jobSlug]); // fire once per job
  return null;
}
