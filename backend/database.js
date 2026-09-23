const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE,
        phone VARCHAR(30) UNIQUE,
        password_hash TEXT NOT NULL,
        role VARCHAR(30) DEFAULT 'user',
        status VARCHAR(30) DEFAULT 'active',
        verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("HELPY database initialized successfully.");
  } catch (error) {
    console.error("Database initialization error:", error);
  }
}

module.exports = {
  pool,
  initializeDatabase
};