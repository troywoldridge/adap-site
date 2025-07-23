import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./drizzle/schema",        // your schema path
  out: "./drizzle/migrations",       // output folder for generated migrations
  driver: "pg",
  dbCredentials: {
    host: "localhost",
    port: 5432,
    user: "troy",
    password: "Elizabeth71676",
    database: "adap",
  },
});
