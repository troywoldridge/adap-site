import { pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const careerEvents = pgTable("career_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

  // who/where
  sid: text("sid"),                  // your session cookie 'sid' (if available)
  ipHash: text("ip_hash"),           // sha256(ip + salt) anonymized
  userAgent: text("user_agent"),
  referer: text("referer"),

  // what
  event: text("event").notNull(),    // "list_view" | "job_view" | "apply_click"
  jobSlug: text("job_slug"),
  jobTitle: text("job_title"),
  location: text("location"),
  employmentType: text("employment_type"),

  // optional marketing context
  utm: jsonb("utm"),

  createdAt: timestamp("created_at", { mode: "string" })
    .notNull()
    .defaultNow(),
}, (t) => [
  index("idx_career_events_created_at").on(t.createdAt),
  index("idx_career_events_event").on(t.event),
  index("idx_career_events_job_slug").on(t.jobSlug),
  index("idx_career_events_sid").on(t.sid),
]);
