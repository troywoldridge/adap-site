"use client";

import ArtworkUpload, { ArtworkFile } from "./ArtworkUpload";

export default function ArtworkUploadBoxes({
  cartId,
  lineId,
  sides = 2,
}: {
  cartId?: string;
  lineId: string;
  sides?: number; // default 2 (front/back)
}) {
  return (
    <section className="grid place-items-center px-4 py-6">
      <div className="w-full max-w-[1100px] rounded-xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
        {/* Header */}
        <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
          <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-900">
            Set #1
          </span>
          <h2 className="m-0 text-base font-semibold text-slate-900">
            Upload your file {sides === 2 ? "— 2 sides" : sides > 1 ? `— ${sides} sides` : ""}
          </h2>
        </header>

        {/* Body */}
        <div className="grid gap-6 px-5 py-4 md:grid-cols-[1.2fr_1fr]">
          {/* Left: uploaders */}
          <div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="font-semibold text-slate-700">Front</div>
                <ArtworkUpload
                  cartId={cartId}
                  lineId={lineId}
                  side={1}
                  label="Choose File"
                  onUploaded={(f: ArtworkFile | null) => {
                    // hook if needed
                  }}
                />
              </div>

              {sides >= 2 && (
                <div className="space-y-2">
                  <div className="font-semibold text-slate-700">Back</div>
                  <ArtworkUpload
                    cartId={cartId}
                    lineId={lineId}
                    side={2}
                    label="Choose File"
                    onUploaded={(f: ArtworkFile | null) => {
                      // hook if needed
                    }}
                  />
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <button className="inline-flex items-center rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">
                Upload
              </button>
              <button className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 hover:bg-slate-50">
                Go back
              </button>
            </div>
          </div>

          {/* Right: prep tips (kept concise; matches Sinalite guidance) */}
          <aside className="border-t border-slate-100 pt-4 md:border-l md:border-t-0 md:pl-4">
            <h3 className="mb-2 text-base font-semibold text-slate-900">Artwork Preparation Tips</h3>
            <ul className="ml-4 list-disc space-y-1 text-slate-700">
              <li>Delete hidden/setup layers not intended to print.</li>
              <li>Correct orientation, include bleed, 300&nbsp;DPI raster.</li>
              <li>CMYK (not RGB). Outline all text (no embedded fonts).</li>
              <li>No linked images, form fields, or comments.</li>
              <li>Provide a separate <em className="not-italic font-semibold">Dieline</em> spot-color layer.</li>
              <li>Use vector for logos/shapes where possible.</li>
              <li>Rich black e.g. <span className="font-mono">C30 M20 Y20 K100</span> for large areas.</li>
              <li>White ink: separate spot-color layer named <em className="not-italic font-semibold">White_Ink</em>.</li>
              <li>Thin white text on rich black: thicken / apply slight swelling.</li>
              <li>Formats: PDF (preferred), AI, EPS, PNG, JPG, TIFF.</li>
            </ul>

            <h4 className="mt-3 text-sm font-semibold text-slate-900">PDF Template References</h4>
            <p className="mt-1 text-sm text-slate-600">
              Download product-specific templates from the product page (per Sinalite API documentation).
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}
