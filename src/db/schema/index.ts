// src/db/schema/index.ts

// --- Customer, Orders, Loyalty (orders + orderItems live in customer.ts today)
export * from "./customer";

// --- Cart core (cartLines comes from its OWN file)
export { carts } from "./cart";
export { cartLines } from "./cartLines";

// --- Cart attachments/artwork
export { cartAttachments } from "./cartAttachments";
export { cartArtwork } from "./cartArtwork";

// --- Other modules
export * from "./reviews";
export * from "./sessions";
export * from "./uploads";

// Relations (only if you actually created this file)
export * from "./relations"; // <-- remove this if you don't have src/db/schema/relations.ts
