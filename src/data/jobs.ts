// src/data/jobs.ts
// Central jobs registry used by Careers list, per-job pages, and /sitemap-jobs.xml
// NOTE: Fulfillment/pricing integrates with Sinalite (see /mnt/data/sinalite_documentation.txt).
// Images delivered via Cloudflare Images: https://imagedelivery.net/<ACCOUNT_HASH>/<IMAGE_ID>/<VARIANT_NAME>

export type JobType = "Full-time" | "Part-time" | "Contract";

export type Job = {
  slug: string;              // stable URL slug (e.g., "front-end-engineer-nextjs")
  title: string;
  location: string;          // e.g. "Remote (US/CA)" or "Dallas, TX"
  type: JobType;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  niceToHaves?: string[];
  applyEmail?: string;
  datePosted?: string;       // ISO YYYY-MM-DD
};

// ─────────────────────────────────────────────────────────────────────────────
// 0) Cloudflare Images config & helpers
// ─────────────────────────────────────────────────────────────────────────────

// Replace with your actual account hash:
const CF_ACCOUNT_HASH = "<ACCOUNT_HASH>";

// Optional: per-role hero/OG image IDs (uploaded via Cloudflare Images dashboard or API)
const ROLE_OG_IMAGE_ID: Record<string, string> = {
  // slug: Cloudflare Image ID
  "front-end-engineer-nextjs": "<IMAGE_ID_FE>",
  "print-operations-coordinator": "<IMAGE_ID_OPS>",
};

// Your public variant for social share (1280x640 or 1200x630 is great)
const OG_VARIANT = "public"; // e.g., "og", "public", etc.

// Generic org logo (used in JSON-LD hiringOrganization.logo)
export function orgLogoUrl() {
  return `https://imagedelivery.net/${CF_ACCOUNT_HASH}/<ORG_LOGO_IMAGE_ID>/public`;
}

// Build OG image URL for a job (falls back to a generic image if missing)
export function jobOgImageUrl(slug: string) {
  const imgId = ROLE_OG_IMAGE_ID[slug] || "<GENERIC_OG_IMAGE_ID>";
  return `https://imagedelivery.net/${CF_ACCOUNT_HASH}/${imgId}/${OG_VARIANT}`;
}

// Canonical site root
export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://americandesignandprinting.com").replace(/\/+$/, "");
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) Jobs data
// ─────────────────────────────────────────────────────────────────────────────

export const JOBS: Job[] = [
  {
    slug: "front-end-engineer-nextjs",
    title: "Front-End Engineer (Next.js)",
    location: "Remote (US/CA)",
    type: "Full-time",
    summary:
      "Own delightful, performant product pages with dynamic pricing, image galleries, and checkout UX.",
    responsibilities: [
      "Ship accessible, responsive UI with Next.js + React.",
      "Integrate Cloudflare Images for lightning-fast galleries.",
      "Collaborate on product option flows and real-time pricing.",
    ],
    requirements: [
      "Strong React/Next.js experience.",
      "Modern JavaScript proficiency.",
      "API integration experience (REST/JSON).",
    ],
    niceToHaves: [
      "Tailwind CSS expertise.",
      "Experience with Drizzle ORM + Postgres.",
      "Familiarity with trade print workflows.",
    ],
    applyEmail: "careers@adap.com",
    datePosted: new Date().toISOString().split("T")[0],
  },
  {
    slug: "print-operations-coordinator",
    title: "Print Operations Coordinator",
    location: "Remote / Hybrid",
    type: "Full-time",
    summary:
      "Coordinate order flows, proofs, and timelines with our trade print partners.",
    responsibilities: [
      "Review artworks & specs for print readiness.",
      "Track orders, shipping ETAs, and customer updates.",
      "Help refine SOPs for consistent quality and speed.",
    ],
    requirements: [
      "Detail-oriented and deadline-driven.",
      "Comfortable with spreadsheets and ticketing tools.",
      "Clear written and verbal communication.",
    ],
    niceToHaves: ["Hands-on print shop or trade print experience."],
    applyEmail: "careers@adap.com",
    datePosted: new Date().toISOString().split("T")[0],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 2) JSON-LD builder for a single Job
// ─────────────────────────────────────────────────────────────────────────────
export function jobToJsonLd(job: Job) {
  const isRemote = /remote/i.test(job.location);
  const datePosted = job.datePosted || new Date().toISOString().split("T")[0];

  const description = [
    job.summary,
    "",
    "Responsibilities:",
    ...job.responsibilities.map((r) => `• ${r}`),
    "",
    "Requirements:",
    ...job.requirements.map((r) => `• ${r}`),
    ...(job.niceToHaves?.length
      ? ["", "Nice to have:", ...job.niceToHaves.map((n) => `• ${n}`)]
      : []),
  ].join("\n");

  // Compute close date (~60 days) and salary BEFORE building the JSON
  const validThrough = new Date();
  validThrough.setMonth(validThrough.getMonth() + 2);
  const validThroughISO = validThrough.toISOString().split("T")[0]; // YYYY-MM-DD

  const baseSalary = {
    "@type": "MonetaryAmount",
    currency: "USD",
    value: {
      "@type": "QuantitativeValue",
      minValue: 60000,
      maxValue: 95000,
      unitText: "YEAR",
    },
  };

  const url = `${siteUrl()}/careers/${job.slug}`;

  const json: any = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description,
    datePosted,
    validThrough: validThroughISO, // ✅ computed above
    baseSalary,                    // ✅ computed above
    employmentType:
      job.type === "Full-time"
        ? "FULL_TIME"
        : job.type === "Part-time"
        ? "PART_TIME"
        : "CONTRACTOR",
    hiringOrganization: {
      "@type": "Organization",
      name: "American Design And Printing",
      sameAs: siteUrl(),
      logo: orgLogoUrl(), // Cloudflare Images CDN
    },
    identifier: { "@type": "PropertyValue", name: "ADAP", value: job.slug },
    directApply: true,
    url,
    ...(isRemote
      ? {
          jobLocationType: "TELECOMMUTE",
          applicantLocationRequirements: { "@type": "Country", name: "US/CA" },
        }
      : {
          jobLocation: [
            {
              "@type": "Place",
              address: {
                "@type": "PostalAddress",
                streetAddress: "—",
                addressLocality: "—",
                addressRegion: "—",
                postalCode: "—",
                addressCountry: "US",
              },
            },
          ],
        }),
  };

  return json;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) JSON-LD builder for ItemList (careers listing page)
// ─────────────────────────────────────────────────────────────────────────────

export function jobsItemListJsonLd(jobs: Job[]) {
  const items = jobs.map((job, idx) => ({
    "@type": "ListItem",
    position: idx + 1,
    url: `${siteUrl()}/careers/${job.slug}`,
    name: job.title,
  }));

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items,
  };
}
