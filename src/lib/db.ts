import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// ✅ Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// ✅ Import schema and individual table objects
import * as schema from '@/drizzle/migrations/schema';
import {
  categories,
  subcategories,
  products,
  options,
  productVariants,
  pricing,
  images,
  optionsGroups
} from '@/drizzle/migrations/schema';

// ✅ Setup Postgres connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
  ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
});

// ✅ Create the Drizzle client with typed schema
export const db = drizzle(pool, { schema });

// ✅ Export all table objects for use in query files
export {
  db,
  categories,
  subcategories,
  products,
  options,
  productVariants,
  pricing,
  images,
  optionsGroups
};
