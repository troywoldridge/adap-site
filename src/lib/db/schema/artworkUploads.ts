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

export const artworkUploads = pgTable("artwork_uploads", {
	productId: varchar("product_id", { length: 48 }).notNull(),
	orderId: varchar("order_id", { length: 48 }),
	userId: varchar("user_id", { length: 64 }),
	fileUrl: varchar("file_url", { length: 255 }).notNull(),
	fileName: varchar("file_name", { length: 128 }).notNull(),
	fileSize: integer("file_size"),
	fileType: varchar("file_type", { length: 64 }),
	approved: boolean().default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	id: uuid().defaultRandom().primaryKey().notNull(),
});