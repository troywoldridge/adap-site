// /home/twoldridge/adap-site/db/index.js
import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

export const pool = new Pool({
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT || "5432", 10),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : false,
});

// Simple query helper:
export const db = {
  query: (text, params) => pool.query(text, params),
  execute: (text, params) => pool.query(text, params),
};
