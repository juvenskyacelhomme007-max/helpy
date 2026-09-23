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
        email VARCHAR(150) UNIQUE,
        phone VARCHAR(30),
        password TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);


    // =========================
    // PRODUCTS
    // =========================

    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        price NUMERIC(12,2) NOT NULL DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'HTG',
        category VARCHAR(100),
        location VARCHAR(150),
        whatsapp VARCHAR(30),
        image_url TEXT,
        quantity INTEGER DEFAULT 1,
        status VARCHAR(30) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);


    // =========================
    // BUSINESSES / ENTREPRISES
    // =========================

    await pool.query(`
      CREATE TABLE IF NOT EXISTS businesses (
        id SERIAL PRIMARY KEY,

        name VARCHAR(150) NOT NULL,

        description TEXT,

        category VARCHAR(100),

        location VARCHAR(200),

        phone VARCHAR(30),

        whatsapp VARCHAR(30),

        email VARCHAR(150),

        image_url TEXT,

        website VARCHAR(255),

        status VARCHAR(30) DEFAULT 'active',

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);


    // =========================
    // INDEXES
    // =========================

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_businesses_category
      ON businesses(category);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_businesses_location
      ON businesses(location);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_businesses_status
      ON businesses(status);
    `);


    console.log("✅ Database HELPY initialized successfully");

  } catch (error) {

    console.error("❌ Database initialization error:");
    console.error(error);

  }
}


module.exports = {
  pool,
  initializeDatabase
};

Kounye a fè sa 👇🏽

1. Louvri pwojè HELPY ou a.
2. Chèche fichye "database.js".
3. Efase ansyen kòd la.
4. Kole kòd ki anlè a.
5. Save / Commit.
6. Railway ap fè nouvo deploy la otomatikman.

Apre deploy la fin di Successful, n ap pase nan pwochen etap la: API Entreprises ("POST", "GET", "PUT", "DELETE") pou nou ka ajoute antrepriz epi fè yo parèt sou HELPY.