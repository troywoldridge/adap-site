import { pgTable, serial, varchar, text, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";

export const productReviews = pgTable(
  "product_reviews",
  {
    id: serial("id").primaryKey(),                          // matches existing SERIAL PK
    productId: varchar("product_id", { length: 48 }).notNull(),
    name: varchar("name", { length: 60 }).notNull(),
    email: varchar("email", { length: 80 }),                // optional
    rating: integer("rating").notNull(),                    // 1..5 (enforce in API)
    comment: text("comment").notNull(),
    approved: boolean("approved").default(false),           // new reviews start unapproved
    userIp: varchar("user_ip", { length: 45 }),             // IPv4/IPv6 safe
    termsAgreed: boolean("terms_agreed").default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    // keep names unique across your schema
    byProduct: index("idx_reviews_product").on(t.productId),
    byApproved: index("idx_reviews_approved").on(t.approved),
  })
);
