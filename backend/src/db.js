const { Pool } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required. Set it in environment variables.");
}

const useSsl = process.env.DB_SSL !== "false";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false
});

async function query(text, params = []) {
  return pool.query(text, params);
}

async function closePool() {
  await pool.end();
}

module.exports = {
  query,
  closePool
};

