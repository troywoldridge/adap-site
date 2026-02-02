// src/lib/db/schema/index.ts

// The schema barrel must export each table exactly once.
// Do NOT re-export tables through other modules (ex: customer.ts re-exporting orders/loyalty/etc).

export * from "./addresses";
export * from "./artworkUploads";
export * from "./careerEvents";

export * from "./cart";
export * from "./cartArtwork";
export * from "./cartAttachments";
export * from "./cartCredits";
export * from "./cartLines";

export * from "./customer";


export * from "./guideDownloads";




export * from "./priceTiers";

export * from "./productReviews";
export * from "./reviewHelpfulVotes";


export * from "./sessions";



