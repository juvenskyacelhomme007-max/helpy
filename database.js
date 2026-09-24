const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL pa defini. Backend la pap ka itilize PostgreSQL.');
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS businesses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      name VARCHAR(180) NOT NULL,
      category VARCHAR(100) NOT NULL,
      description TEXT DEFAULT '',
      phone VARCHAR(40) DEFAULT '',
      whatsapp VARCHAR(40) DEFAULT '',
      address VARCHAR(255) DEFAULT '',
      location VARCHAR(180) DEFAULT '',
      image_url TEXT DEFAULT '',
      rating NUMERIC(3,2) NOT NULL DEFAULT 0,
      review_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS services (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      title VARCHAR(180) NOT NULL,
      category VARCHAR(100) NOT NULL,
      phone VARCHAR(40) NOT NULL,
      description TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS listings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      title VARCHAR(180) NOT NULL,
      description TEXT DEFAULT '',
      price NUMERIC(12,2),
      currency VARCHAR(10) NOT NULL DEFAULT 'HTG',
      category VARCHAR(100) DEFAULT '',
      location VARCHAR(180) DEFAULT '',
      phone VARCHAR(40) DEFAULT '',
      whatsapp VARCHAR(40) DEFAULT '',
      image_url TEXT DEFAULT '',
      type VARCHAR(50) NOT NULL DEFAULT 'product',
      status VARCHAR(30) NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (business_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_type VARCHAR(40) NOT NULL,
      item_id INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, item_type, item_id)
    );

    CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category);
    CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category);
    CREATE INDEX IF NOT EXISTS idx_listings_user ON listings(user_id);
    CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
    CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);

    -- Compatibility migrations for older HELPY PostgreSQL schemas.
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS phone VARCHAR(40) DEFAULT '';
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(40) DEFAULT '';
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS address VARCHAR(255) DEFAULT '';
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS location VARCHAR(180) DEFAULT '';
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) NOT NULL DEFAULT 0;
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS review_count INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

    ALTER TABLE services ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE services ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

    ALTER TABLE listings ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS price NUMERIC(12,2);
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'HTG';
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT '';
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS location VARCHAR(180) DEFAULT '';
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS phone VARCHAR(40) DEFAULT '';
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(40) DEFAULT '';
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS type VARCHAR(50) NOT NULL DEFAULT 'product';
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'active';
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE;
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS rating INTEGER;
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS comment TEXT DEFAULT '';
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

    ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS message TEXT DEFAULT '';
    ALTER TABLE messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

    ALTER TABLE favorites ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
    ALTER TABLE favorites ADD COLUMN IF NOT EXISTS item_type VARCHAR(40) DEFAULT '';
    ALTER TABLE favorites ADD COLUMN IF NOT EXISTS item_id INTEGER;
    ALTER TABLE favorites ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  `);

  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_business_user_unique') THEN
        ALTER TABLE reviews ADD CONSTRAINT reviews_business_user_unique UNIQUE (business_id, user_id);
      END IF;
    EXCEPTION WHEN duplicate_table THEN NULL; END $$;
  `);

  console.log('HELPY PostgreSQL database initialized.');
}

module.exports = { pool, initializeDatabase };
