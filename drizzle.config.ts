import type { Config } from "drizzle-kit";
import { defineConfig } from "drizzle-kit";

const config: Config = {
  schema: "src/db/schema.ts",        // your schema path
  out: "./drizzle/migrations",       // output folder for generated migrations
    dialect: "postgresql",

  dbCredentials: {
    host: "localhost",
    port: 5432,
    user: "admin",
    password: "Elizabeth71676",
    database: "adap_db_final",
    ssl: false,
  },
};

export default defineConfig(config);
