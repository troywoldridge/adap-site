import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './migrations/schema';

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, // Ensure this is a string
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
  ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });
