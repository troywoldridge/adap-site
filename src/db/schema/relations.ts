import { relations } from "drizzle-orm";
import { carts } from "./cart";
import { cartLines } from "./cartLines";



// cart has many cartLines
export const cartsRelations = relations(carts, ({ many }) => ({
  lines: many(cartLines),
}));

// cartLine belongs to cart
export const cartLinesRelations = relations(cartLines, ({ one }) => ({
  cart: one(carts, {
    fields: [cartLines.cartId],
    references: [carts.id],
  }),
}));
