import type { Metadata } from "next";

// NOTE: Per project standards, fulfillment/pricing integrate via Sinalite.
// See /mnt/data/sinalite_documentation.txt for API flows (auth, product, price).
// Image delivery: Cloudflare Images CDN
// https://imagedelivery.net/<ACCOUNT_HASH>/<IMAGE_ID>/<VARIANT_NAME>

export const metadata: Metadata = {
  title: "Careers | American Design And Printing",
  description:
    "Join American Design And Printing (ADAP). We’re building the best print & packaging experience online — designers, engineers, ops & support welcome!",
  openGraph: {
    title: "Careers at ADAP",
    description:
      "We’re hiring! Build premium print, packaging, and promo experiences with a modern web stack.",
    url: "/careers",
    type: "website",
  },
  robots: { index: true, follow: true },
};

type Job = {
  id: string;
  title: string;
  location: string; // e.g. "Remote (US/CA)" or "Dallas, TX"
  type: "Full-time" | "Part-time" | "Contract";
  summary: string;
  responsibilities: string[];
  requirements: string[];
  niceToHaves?: string[];
  applyEmail?: string;
};

// ✅ Seed roles (edit freely)
const OPEN_ROLES: Job[] = [
  {
    id: "fe-engineer",
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
  },
  {
    id: "ops-print",
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
  },
];

// ———————————————————————————————————————————————————————————————
// JSON-LD helpers
// ———————————————————————————————————————————————————————————————

function siteUrl() {
  // Prefer env var, fallback to relative path (Google still accepts absolute path recommended)
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://example.com";
}

function orgLogoUrl() {
  // Cloudflare Images (swap with your actual account hash & image id)
  return "https://imagedelivery.net/<ACCOUNT_HASH>/<IMAGE_ID>/public";
}

function jobToJsonLd(job: Job) {
  const isRemote = /remote/i.test(job.location);
  const todayISO = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // Build a human-readable plain-text description
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

  // Minimal physical place for non-remote (can be customized later)
  const jobLocation = isRemote
    ? []
    : [
        {
          "@type": "Place",
          "address": {
            "@type": "PostalAddress",
            // Fill as needed:
            "streetAddress": "—",
            "addressLocality": "—",
            "addressRegion": "—",
            "postalCode": "—",
            "addressCountry": "US",
          },
        },
      ];

  // Build a canonical URL per role (fragment link on careers page)
  const url = `${siteUrl()}/careers#${encodeURIComponent(job.id)}`;

  const json: any = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "title": job.title,
    "description": description, // plain text OK; HTML also supported
    "datePosted": todayISO,
    "employmentType": job.type === "Full-time" ? "FULL_TIME" : job.type === "Part-time" ? "PART_TIME" : "CONTRACTOR",
    "hiringOrganization": {
      "@type": "Organization",
      "name": "American Design And Printing",
      "sameAs": siteUrl(),
      "logo": orgLogoUrl(),
    },
    "identifier": {
      "@type": "PropertyValue",
      "name": "ADAP",
      "value": job.id,
    },
    "directApply": true,
    "url": url,
    ...(isRemote
      ? {
          jobLocationType: "TELECOMMUTE",
          applicantLocationRequirements: {
            "@type": "Country",
            // Adjust to your policy (US & CA)
            "name": "US/CA",
          },
        }
      : { jobLocation }),
  };

  return json;
}

function JobsJsonLd() {
  const items = OPEN_ROLES.map(jobToJsonLd);
  const json = items.length === 1 ? items[0] : items; // Either array or single object is fine
  return (
    <script
      type="application/ld+json"
      // JSON-LD must be a JSON string; do not pretty-print to keep bundle small
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

// ———————————————————————————————————————————————————————————————
// UI Components
// ———————————————————————————————————————————————————————————————

function JobCard({ job }: { job: Job }) {
  return (
    <article
      id={job.id}
      className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <header className="mb-2">
        <h3 className="m-0 text-xl font-semibold">{job.title}</h3>
        <p className="mt-1 text-sm text-gray-600">
          {job.location} • {job.type}
        </p>
      </header>
      <p className="mt-3">{job.summary}</p>

      <section className="mt-4">
        <h4 className="text-base font-semibold">Responsibilities</h4>
        <ul className="list-disc pl-5">
          {job.responsibilities.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </section>

      <section className="mt-4">
        <h4 className="text-base font-semibold">Requirements</h4>
        <ul className="list-disc pl-5">
          {job.requirements.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </section>

      {job.niceToHaves?.length ? (
        <section className="mt-4">
          <h4 className="text-base font-semibold">Nice to have</h4>
          <ul className="list-disc pl-5">
            {job.niceToHaves.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="mt-5">
        <a
          className="inline-flex items-center rounded-md border border-black px-4 py-2 font-medium hover:bg-black hover:text-white"
          href={`mailto:${job.applyEmail ?? "careers@adap.com"}?subject=Application: ${encodeURIComponent(
            job.title
          )}`}
        >
          Apply now
        </a>
      </footer>
    </article>
  );
}

export default function CareersPage() {
  return (
    <main className="container mx-auto max-w-4xl px-6 py-12">
      {/* Optional Cloudflare Images hero (swap IDs when ready) */}
      {/* <img
        src="https://imagedelivery.net/<ACCOUNT_HASH>/<IMAGE_ID>/public"
        alt="Join ADAP — Careers"
        className="mb-10 h-48 w-full rounded-lg object-cover"
        loading="eager"
      /> */}

      {/* JSON-LD for all open roles */}
      <JobsJsonLd />

      <h1 className="mb-4 text-3xl font-bold">Careers at ADAP</h1>
      <p className="prose">
        We’re building the most delightful way to buy premium print, packaging,
        and promotional products online — with fast Cloudflare-powered images,
        real-time option pricing, and streamlined fulfillment with trusted trade
        partners. If you thrive on shipping great experiences and solving real
        customer problems, come build with us!
      </p>

      <section className="prose mt-8">
        <h2>Why ADAP</h2>
        <ul>
          <li>
            <strong>Impact</strong> — Ship features that customers use daily.
          </li>
          <li>
            <strong>Quality</strong> — From substrate to UI polish, details
            matter.
          </li>
          <li>
            <strong>Modern stack</strong> — Next.js, Postgres (Drizzle ORM),
            Cloudflare Images CDN, and API integrations with trade print
            partners.
          </li>
          <li>
            <strong>Flexibility</strong> — Remote-friendly, async collaboration.
          </li>
        </ul>
      </section>

      <section className="prose mt-10">
        <h2>Open Roles</h2>
        <div className="mt-4 grid gap-6 sm:grid-cols-1">
          {OPEN_ROLES.length ? (
            OPEN_ROLES.map((job) => <JobCard key={job.id} job={job} />)
          ) : (
            <p>
              We’re not hiring for specific roles today, but we love meeting
              great people. Send your resume to{" "}
              <a href="mailto:careers@adap.com">careers@adap.com</a>.
            </p>
          )}
        </div>
      </section>

      <section className="prose mt-10">
        <h2>How to Apply</h2>
        <p>
          Email{" "}
          <a href="mailto:careers@adap.com">careers@adap.com</a> with your
          resume/portfolio and a brief note about why you’d be a great fit.
          Include links (GitHub, portfolio, Dribbble, etc.).
        </p>
      </section>
    </main>
  );
}
