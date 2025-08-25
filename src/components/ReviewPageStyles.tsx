'use client';

export default function ReviewPageStyles() {
  return (
    <style jsx global>{`
      /* ===== Review page only (scoped under .reviewpg) ===== */
      .reviewpg { --ink:#0f172a; --muted:#64748b; color:var(--ink); }
      .reviewpg__grid { display:grid; gap:24px; }

      /* Wide layouts: roomy right column for the summary card */
      @media (min-width: 1024px) {
        .reviewpg__grid { grid-template-columns: minmax(0,1fr) 480px; }
      }
      @media (min-width: 1280px) {
        .reviewpg__grid { grid-template-columns: minmax(0,1fr) 520px; }
      }
      @media (min-width: 1536px) {
        .reviewpg__grid { grid-template-columns: minmax(0,1fr) 560px; }
      }

      /* Sticky right rail */
      .reviewpg__summary { position: sticky; top: 96px; align-self: start; }

      /* Nice, consistent card feel */
      .reviewpg .card {
        background:#fff; border:1px solid #e5e7eb; border-radius:12px;
        padding:16px; box-shadow:0 1px 2px rgba(0,0,0,.06);
      }
    `}</style>
  );
}
