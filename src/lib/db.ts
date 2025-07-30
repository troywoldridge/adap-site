import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../drizzle/migrations/schema';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Use Pool instead of Client for connection pooling
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });

// Re-export tables from schema
export const {
  categories,
  products,
  subcategories,
  options,
  productVariants,
  pricing,
  images,
  optionsGroups,
} = schema;
