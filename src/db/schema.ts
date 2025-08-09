import { pgTable, serial, varchar, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";

// Artwork Uploads Table
export const artworkUploads = pgTable("artwork_uploads", {
  id: serial("id").primaryKey(),
  productId: varchar("product_id", { length: 48 }).notNull(),
  orderId: varchar("order_id", { length: 48 }), // Optional, for when you add orders
  userId: varchar("user_id", { length: 64 }),   // Optional, for customer upload
  fileUrl: varchar("file_url", { length: 255 }).notNull(), // Link to file (local/S3/R2)
  fileName: varchar("file_name", { length: 128 }).notNull(),
  fileSize: integer("file_size"),
  fileType: varchar("file_type", { length: 64 }),
  approved: boolean("approved").default(false),  // For moderation
  createdAt: timestamp("created_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 64 }).notNull(),
  email: varchar("email", { length: 80 }).notNull(),
  productId: varchar("product_id", { length: 48 }).notNull(),
  status: varchar("status", { length: 32 }).notNull(), // e.g. "completed"
  createdAt: timestamp("created_at").defaultNow(),
});

export const orderSessions = pgTable("order_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id", { length: 64 }),

  productId: varchar("product_id", { length: 64 }).notNull(),
  options: jsonb("options").$type<(number | string)[]>().default([]).notNull(),
  files: jsonb("files").$type<{ type: string; url: string }[]>().default([]).notNull(),

  shippingInfo: jsonb("shipping_info").$type<Record<string, any> | null>(),
  billingInfo: jsonb("billing_info").$type<Record<string, any> | null>(),

  currency: varchar("currency", { length: 8 }).default("USD").notNull(),
  subtotal: numeric("subtotal").default("0").notNull(),
  tax: numeric("tax").default("0").notNull(),
  discount: numeric("discount").default("0").notNull(),
  total: numeric("total").default("0").notNull(),

  selectedShippingRate: jsonb("selected_shipping_rate").$type<[string, string, number, number] | null>(),

  stripeCheckoutSessionId: varchar("stripe_checkout_session_id", { length: 128 }),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 128 }),
  sinaliteOrderId: varchar("sinalite_order_id", { length: 64 }),

  notes: text("notes"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Product Reviews Table
export const productReviews = pgTable("product_reviews", {
  id: serial("id").primaryKey(),
  productId: varchar("product_id", { length: 48 }).notNull(),
  name: varchar("name", { length: 60 }).notNull(),
  email: varchar("email", { length: 80 }),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
  approved: boolean("approved").default(false),
  userIp: varchar("user_ip", { length: 45 }),
  termsAgreed: boolean("terms_agreed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  verified: boolean("verified").default(false),
});

export const reviewHelpfulVotes = pgTable("review_helpful_votes", {
  id: serial("id").primaryKey(),
  reviewId: integer("review_id").notNull(),
  userId: varchar("user_id", { length: 64 }), // Optional, if logged in
  ip: varchar("ip", { length: 48 }), // Fallback for anonymous votes
  isHelpful: boolean("is_helpful").notNull(), // true = Yes, false = No
  createdAt: timestamp("created_at").defaultNow(),
});

// Add more tables here as you grow (e.g. artwork_uploads)
