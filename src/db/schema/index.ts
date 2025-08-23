// src/db/schema/index.ts

// --- Customer & Loyalty (keep these in customer.ts)
export {
  customers,
  // customerAddresses,           // uncomment if defined here
  loyaltyWallets,
  loyaltyTransactions,
  // loyaltyReason,               // uncomment if you defined enum here
} from "./customer";

// --- Orders (keep these ONLY in orders.ts)
export {
  orders,
  // orderItems,                  // uncomment if orders.ts exports it
  // orderStatus,                 // uncomment if enum is here
} from "./orders";

// --- Cart core (from cart.ts)
export {
  carts,
  cartLines,
  // cartsRelations,              // uncomment if defined
  // cartLinesRelations,          // uncomment if defined
} from "./cart";

// --- Cart attachments/artwork (pick one source of truth)
export { cartAttachments } from "./cartAttachments"; // <- use the dedicated file
export { cartArtwork } from "./cart-artwork";        // <- separate file

// --- Other modules that don't collide
export * from "./reviews";
export * from "./sessions";
export * from "./uploads";
