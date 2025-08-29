// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: [
    // ✅ your actual schema files live here
    "./src/db/schema/cart.ts",
    "./src/db/schema/cartLines.ts",
    "./src/db/schema/cartAttachments.ts",
    "./src/db/schema/cartArtwork.ts",
    "./src/db/schema/customer.ts",
    "./src/db/schema/customerAddresses.ts",
    "./src/db/schema/orders.ts",
    "./src/db/schema/orderItems.ts",
    "./src/db/schema/productReviews.ts",
    "./src/db/schema/reviewHelpfulVotes.ts",
    "./src/db/schema/artworkUploads.ts",
    "./src/db/schema/sessions.ts",
    "./src/db/schema/uploads.ts",
    "./src/db/schema/relations.ts", // only if you actually have it
  ],
  // ✅ NEW output folder (stop using /drizzle/migrations)
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    host: "localhost",
    port: 5432,
    user: "admin",
    password: "Elizabeth71676",
    database: "adap_db_final",
    ssl: false,
  },
});
