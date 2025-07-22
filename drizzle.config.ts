import type { Config } from 'drizzle-kit';

export default {
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  driver: 'pg',
  // For PG, just provide a connection string here
  dbCredentials: {
    connectionString: 'postgresql://troy@localhost:5432/adapdb',
  },
} satisfies Config;
