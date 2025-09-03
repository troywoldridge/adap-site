"use client";

import { trackCareerEvent } from "@/lib/analyticsClient";

type Props = {
  jobSlug: string;
  jobTitle?: string;
  location?: string;
  employmentType?: string;
  href: string; // mailto: or external link
  children?: React.ReactNode;
  className?: string;
};

export default function ApplyButton({
  jobSlug,
  jobTitle,
  location,
  employmentType,
  href,
  children = "Apply now",
  className,
}: Props) {
  const onClick = () => {
    trackCareerEvent("apply_click", { jobSlug, jobTitle, location, employmentType });
    // for mailto:, let navigation happen naturally
  };

  return (
    <a href={href} onClick={onClick} className={className}>
      {children}
    </a>
  );
}
