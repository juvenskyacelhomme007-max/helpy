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
        phone VARCHAR(30) UNIQUE,
        password_hash TEXT NOT NULL,
        role VARCHAR(30) DEFAULT 'user',
        status VARCHAR(30) DEFAULT 'active',
        verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);


    // =========================
    // PRODUCTS
    // =========================

    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
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
    // SERVICES
    // =========================

    await pool.query(`
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        price NUMERIC(12,2) NOT NULL DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'HTG',
        category VARCHAR(100),
        location VARCHAR(150),
        whatsapp VARCHAR(30),
        image_url TEXT,
        status VARCHAR(30) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);


    // =========================
    // BUSINESSES
    // =========================

    await pool.query(`
      CREATE TABLE IF NOT EXISTS businesses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
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
        verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);


    // =========================
    // MIGRATION ANCIENNE TABLE
    // =========================

    await pool.query(`
      ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS user_id INTEGER;
    `);

    await pool.query(`
      ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS name VARCHAR(150);
    `);

    await pool.query(`
      ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS description TEXT;
    `);

    await pool.query(`
      ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS category VARCHAR(100);
    `);

    await pool.query(`
      ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS location VARCHAR(200);
    `);

    await pool.query(`
      ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
    `);

    await pool.query(`
      ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(30);
    `);

    await pool.query(`
      ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS email VARCHAR(150);
    `);

    await pool.query(`
      ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS image_url TEXT;
    `);

    await pool.query(`
      ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS website VARCHAR(255);
    `);

    await pool.query(`
      ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS status VARCHAR(30);
    `);

    await pool.query(`
      ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS verified BOOLEAN;
    `);

    await pool.query(`
      ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP;
    `);

    await pool.query(`
      ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
    `);


    // =========================
    // DEFAULT VALUES
    // =========================

    await pool.query(`
      UPDATE businesses
      SET status = 'active'
      WHERE status IS NULL;
    `);

    await pool.query(`
      UPDATE businesses
      SET verified = false
      WHERE verified IS NULL;
    `);

    await pool.query(`
      UPDATE businesses
      SET created_at = CURRENT_TIMESTAMP
      WHERE created_at IS NULL;
    `);

    await pool.query(`
      UPDATE businesses
      SET updated_at = CURRENT_TIMESTAMP
      WHERE updated_at IS NULL;
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

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_businesses_user
      ON businesses(user_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_products_category
      ON products(category);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_services_category
      ON services(category);
    `);


    console.log("=================================");
    console.log("✅ HELPY DATABASE READY");
    console.log("=================================");

    return true;

  } catch (error) {

    console.error("=================================");
    console.error("❌ DATABASE INITIALIZATION ERROR");
    console.error("=================================");
    console.error(error);

    throw error;

  }

}


module.exports = {
  pool,
  initializeDatabase
};