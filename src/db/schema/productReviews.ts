import { ColumnBaseConfig, ColumnDataType } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  char,
  pgEnum,
  index,
  customType,
  varchar,
  ExtraConfigColumn,
} from "drizzle-orm/pg-core";

export const productReviews = pgTable("product_reviews", {
	productId: varchar("product_id", { length: 48 }).notNull(),
	name: varchar({ length: 60 }).notNull(),
	email: varchar({ length: 80 }),
	rating: integer().notNull(),
	comment: text().notNull(),
	approved: boolean().default(false),
	userIp: varchar("user_ip", { length: 45 }),
	termsAgreed: boolean("terms_agreed").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	verified: boolean().default(false),
	id: uuid().defaultRandom().primaryKey().notNull(),
});