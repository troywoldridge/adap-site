// src/lib/queries/getNavbarData.ts
import { Pool } from 'pg';

// Reuse or centralize this if you already have a shared DB client elsewhere
const pool = new Pool({
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT || '5432', 10),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false,
});

export interface Subcat {
  id: number;
  name: string;
  slug: string;
}

export interface NavCat {
  id: number;
  name: string;
  slug: string;
  subcategories: Subcat[];
}

// simple in-memory cache (per process)
let cachedNavbar: NavCat[] | null = null;
let cacheExpires = 0; // timestamp in ms
const CACHE_TTL = 30 * 1000; // 30 seconds

export async function getNavbarData(): Promise<NavCat[]> {
  const now = Date.now();
  if (cachedNavbar && now < cacheExpires) {
    return cachedNavbar;
  }

  const sql = `
    SELECT
      c.id AS category_id,
      c.name AS category_name,
      c.slug AS category_slug,
      sc.id AS subcat_id,
      sc.name AS subcat_name,
      sc.slug AS subcat_slug
    FROM categories c
    LEFT JOIN subcategories sc ON sc.category_id = c.id
    WHERE c.hidden IS NOT TRUE
    ORDER BY c.name ASC, sc.name ASC
  `;

  const res = await pool.query(sql);

  if (res.rowCount === 0) {
    console.warn('getNavbarData returned no rows; verify categories table content.');
  }

  const map: Record<number, NavCat> = {};

  for (const row of res.rows) {
    const catId: number = row.category_id;
    if (!map[catId]) {
      map[catId] = {
        id: catId,
        name: row.category_name,
        slug: row.category_slug,
        subcategories: [],
      };
    }

    if (row.subcat_id) {
      map[catId].subcategories.push({
        id: row.subcat_id,
        name: row.subcat_name,
        slug: row.subcat_slug,
      });
    }
  }

  cachedNavbar = Object.values(map);
  cacheExpires = now + CACHE_TTL;
  return cachedNavbar;
}
