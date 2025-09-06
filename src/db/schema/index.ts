// src/db/schema/index.ts

// ── Customers & addresses
export * from "./customer";            // includes orders + orderItems today
export * from "./customerAddresses";   // remove if you kept addresses inside customer.ts

// ── Cart core
export * from "./cart";
export * from "./cartLines";

// ── Cart attachments / artwork
export * from "./cartAttachments";
export * from "./cartArtwork";
// DO NOT also export from "./artworkUploads" if uploads.ts already exports artworkUploads
// export * from "./artworkUploads";

// ── Reviews
export * from "./productReviews";
export * from "./reviewHelpfulVotes";

// ── Sessions / uploads
export * from "./sessions";
export * from "./uploads";            
export * from "./cartCredit";

// ── If/when you move orders into their own files, uncomment these
// export * from "./orders";
// export * from "./orderItems";

// ── Relations (avoid star-export to prevent duplicate named exports)
import * as schemaRelations from "./relations";
export const relations = schemaRelations;

// ── Carrers
export * from "./careerEvents";


