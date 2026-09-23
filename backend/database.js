const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function initializeDatabase() {
  try {

    // =========================
    // USERS
    // =========================

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


    // =========================
    // PRODUCTS
    // =========================

    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL
          REFERENCES users(id)
          ON DELETE CASCADE,

        title VARCHAR(150) NOT NULL,
        description TEXT,

        price NUMERIC(12,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'HTG',

        category VARCHAR(100),
        location VARCHAR(150),

        whatsapp VARCHAR(30) NOT NULL,

        image_url TEXT,

        quantity INTEGER DEFAULT 1,

        status VARCHAR(30) DEFAULT 'active',

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);


    // =========================
    // SERVICES
    // =========================

    await pool.query(`
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL
          REFERENCES users(id)
          ON DELETE CASCADE,

        title VARCHAR(150) NOT NULL,
        description TEXT,

        price NUMERIC(12,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'HTG',

        category VARCHAR(100),
        location VARCHAR(150),

        whatsapp VARCHAR(30) NOT NULL,

        image_url TEXT,

        status VARCHAR(30) DEFAULT 'active',

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);


    // =========================
    // BUSINESSES / ENTREPRISES
    // =========================

    await pool.query(`
      CREATE TABLE IF NOT EXISTS businesses (
        id SERIAL PRIMARY KEY,

        user_id INTEGER NOT NULL
          REFERENCES users(id)
          ON DELETE CASCADE,

        name VARCHAR(150) NOT NULL,

        description TEXT,

        category VARCHAR(100),

        location VARCHAR(150),

        whatsapp VARCHAR(30) NOT NULL,

        phone VARCHAR(30),

        email VARCHAR(255),

        website TEXT,

        image_url TEXT,

        status VARCHAR(30) DEFAULT 'active',

        verified BOOLEAN DEFAULT FALSE,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);


    console.log(
      "HELPY database initialized successfully."
    );

  } catch (error) {

    console.error(
      "Database initialization error:",
      error
    );

  }
}


module.exports = {
  pool,
  initializeDatabase
}; 