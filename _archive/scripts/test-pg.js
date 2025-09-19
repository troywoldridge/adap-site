import pg from 'pg';

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '5432', 10),
});

async function test() {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW()');
    console.log('DB connection successful:', res.rows);
    client.release();
  } catch (e) {
    console.error('DB connection error:', e.message);
  }
}

test();
