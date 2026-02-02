// src/db/schema/guideDownloads.ts
import { pgTable, serial, text, integer, bigint, timestamp, index } from "drizzle-orm/pg-core";

export const guideDownloads = pgTable(
  "guide_downloads",
  {
    id: serial("id").primaryKey(),
    href: text("href").notNull(),              // e.g. /guides/Vinyl_Banners/24_x_36.pdf
    label: text("label").notNull(),            // human label shown to user
    categoryPath: text("category_path").notNull(), // e.g. "Vinyl Banners / 24 × 36"
    sizeBytes: integer("size_bytes").notNull().default(0),
    ts: bigint("ts", { mode: "number" }).notNull(), // client timestamp (ms)
    referer: text("referer"),
    ua: text("ua"),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    idxHref: index("gd_href_idx").on(t.href),
    idxTs: index("gd_ts_idx").on(t.ts),
    idxCreated: index("gd_created_idx").on(t.createdAt),
  })
);

export type GuideDownload = typeof guideDownloads.$inferSelect;
export type NewGuideDownload = typeof guideDownloads.$inferInsert;
