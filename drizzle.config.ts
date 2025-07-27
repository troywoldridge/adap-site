import type { Config } from "drizzle-kit";
import { defineConfig } from "drizzle-kit";

const config: Config = {
  schema: "./drizzle/migrations/schema.ts",        // your schema path
  out: "./drizzle/migrations",       // output folder for generated migrations
    dialect: "postgresql",

  dbCredentials: {
    host: "localhost",
    port: 5432,
    user: "troy",
    password: "Elizabeth71676",
    database: "adap",
    ssl: false,
  },
};

export default defineConfig(config);
