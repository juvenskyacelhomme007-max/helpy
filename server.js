const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        whatsapp VARCHAR(50),
        photo_url TEXT,
        bio TEXT,
        location VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS businesses (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        description TEXT,
        location VARCHAR(255),
        phone VARCHAR(50),
        whatsapp VARCHAR(50),
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        business_id INT REFERENCES businesses(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        price NUMERIC(12,2),
        currency VARCHAR(10) DEFAULT 'HTG',
        category VARCHAR(100),
        location VARCHAR(255),
        whatsapp VARCHAR(50),
        image_url TEXT,
        quantity INT DEFAULT 1,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS listings (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) NOT NULL,
        location VARCHAR(255),
        phone VARCHAR(50),
        whatsapp VARCHAR(50),
        price NUMERIC(12,2),
        currency VARCHAR(10) DEFAULT 'HTG',
        image_url TEXT,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        business_id INT REFERENCES businesses(id) ON DELETE CASCADE,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        rating INT CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INT REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INT REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        listing_id INT REFERENCES listings(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database tables initialized successfully.');
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}

initDb();

const getUserId = (req) => {
  const userId = req.headers['x-user-id'];
  return userId ? parseInt(userId, 10) : null;
};

app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, phone, whatsapp, location } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Email is already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (name, email, password, phone, whatsapp, location)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, phone, whatsapp, photo_url, bio, location, created_at`,
      [name, email, hashedPassword, phone || null, whatsapp || null, location || null]
    );

    res.json({ status: 'ok', user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ error: 'Invalid credentials.' });
    }

    delete user.password;
    res.json({ status: 'ok', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/profile', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await pool.query(
      'SELECT id, name, email, phone, whatsapp, photo_url, bio, location, created_at FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    res.json({ status: 'ok', user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/profile', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, phone, whatsapp, photo_url, bio, location } = req.body;
    const result = await pool.query(
      `UPDATE users
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           whatsapp = COALESCE($3, whatsapp),
           photo_url = COALESCE($4, photo_url),
           bio = COALESCE($5, bio),
           location = COALESCE($6, location)
       WHERE id = $7
       RETURNING id, name, email, phone, whatsapp, photo_url, bio, location, created_at`,
      [name, phone, whatsapp, photo_url, bio, location, userId]
    );

    res.json({ status: 'ok', user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/businesses', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, category, description, location, phone, whatsapp, image_url } = req.body;
    const result = await pool.query(
      `INSERT INTO businesses (user_id, name, category, description, location, phone, whatsapp, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [userId, name, category, description, location, phone, whatsapp, image_url]
    );

    res.json({ status: 'ok', business: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/businesses', async (req, res) => {
  try {
    const result = await pool.query('SELECT b.*, u.name as owner_name FROM businesses b JOIN users u ON b.user_id = u.id ORDER BY b.created_at DESC');
    res.json({ status: 'ok', businesses: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/businesses/:id', async (req, res) => {
  try {
    const businessId = req.params.id;
    const result = await pool.query(
      `SELECT b.*, u.name as owner_name, u.photo_url as owner_photo
       FROM businesses b
       JOIN users u ON b.user_id = u.id
       WHERE b.id = $1`,
      [businessId]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Business not found' });

    const products = await pool.query('SELECT * FROM products WHERE business_id = $1', [businessId]);

    res.json({ status: 'ok', business: result.rows[0], products: products.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/businesses/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const businessId = req.params.id;
    const check = await pool.query('SELECT user_id FROM businesses WHERE id = $1', [businessId]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Business not found' });
    if (check.rows[0].user_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    const { name, category, description, location, phone, whatsapp, image_url } = req.body;
    const result = await pool.query(
      `UPDATE businesses
       SET name = COALESCE($1, name),
           category = COALESCE($2, category),
           description = COALESCE($3, description),
           location = COALESCE($4, location),
           phone = COALESCE($5, phone),
           whatsapp = COALESCE($6, whatsapp),
           image_url = COALESCE($7, image_url)
       WHERE id = $8 RETURNING *`,
      [name, category, description, location, phone, whatsapp, image_url, businessId]
    );

    res.json({ status: 'ok', business: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/businesses/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const businessId = req.params.id;
    const check = await pool.query('SELECT user_id FROM businesses WHERE id = $1', [businessId]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Business not found' });
    if (check.rows[0].user_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    await pool.query('DELETE FROM businesses WHERE id = $1', [businessId]);
    res.json({ status: 'ok', message: 'Business deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/listings', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { type, title, description, category, location, phone, whatsapp, price, currency, image_url } = req.body;

    const allowedTypes = ['business', 'product', 'service', 'realestate', 'vehicle'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid listing type' });
    }

    const result = await pool.query(
      `INSERT INTO listings (user_id, type, title, description, category, location, phone, whatsapp, price, currency, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [userId, type, title, description, category, location, phone, whatsapp, price || 0, currency || 'HTG', image_url]
    );

    res.json({ status: 'ok', listing: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/listings', async (req, res) => {
  try {
    const { type, category, user_id } = req.query;
    let query = 'SELECT l.*, u.name as owner_name, u.photo_url as owner_photo FROM listings l JOIN users u ON l.user_id = u.id WHERE 1=1';
    let params = [];

    if (type) {
      params.push(type);
      query += ` AND l.type = $${params.length}`;
    }
    if (category) {
      params.push(category);
      query += ` AND l.category = $${params.length}`;
    }
    if (user_id) {
      params.push(user_id);
      query += ` AND l.user_id = $${params.length}`;
    }

    query += ' ORDER BY l.created_at DESC';
    const result = await pool.query(query, params);

    res.json({ status: 'ok', listings: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/listings/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.*, u.name as owner_name, u.photo_url as owner_photo, u.phone as owner_phone, u.whatsapp as owner_whatsapp, u.bio as owner_bio, u.location as owner_location
       FROM listings l
       JOIN users u ON l.user_id = u.id
       WHERE l.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Listing not found' });

    res.json({ status: 'ok', listing: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/listings/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const check = await pool.query('SELECT user_id FROM listings WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Listing not found' });
    if (check.rows[0].user_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    const { title, description, category, location, phone, whatsapp, price, currency, image_url, status } = req.body;
    const result = await pool.query(
      `UPDATE listings
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           category = COALESCE($3, category),
           location = COALESCE($4, location),
           phone = COALESCE($5, phone),
           whatsapp = COALESCE($6, whatsapp),
           price = COALESCE($7, price),
           currency = COALESCE($8, currency),
           image_url = COALESCE($9, image_url),
           status = COALESCE($10, status)
       WHERE id = $11 RETURNING *`,
      [title, description, category, location, phone, whatsapp, price, currency, image_url, status, req.params.id]
    );

    res.json({ status: 'ok', listing: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/listings/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const check = await pool.query('SELECT user_id FROM listings WHERE id = $1', [req.params.id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Listing not found' });
    if (check.rows[0].user_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    await pool.query('DELETE FROM listings WHERE id = $1', [req.params.id]);
    res.json({ status: 'ok', message: 'Listing deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    const searchTerm = `%${q}%`;

    const businesses = await pool.query(
      `SELECT * FROM businesses WHERE name ILIKE $1 OR description ILIKE $1 OR category ILIKE $1 OR location ILIKE $1`,
      [searchTerm]
    );

    const products = await pool.query(
      `SELECT * FROM products WHERE title ILIKE $1 OR description ILIKE $1 OR category ILIKE $1 OR location ILIKE $1`,
      [searchTerm]
    );

    const listings = await pool.query(
      `SELECT * FROM listings WHERE title ILIKE $1 OR description ILIKE $1 OR category ILIKE $1 OR location ILIKE $1`,
      [searchTerm]
    );

    res.json({
      status: 'ok',
      businesses: businesses.rows,
      products: products.rows,
      listings: listings.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reviews', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { business_id, rating, comment } = req.body;
    if (!business_id || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Valid business_id and rating (1-5) required' });
    }

    const result = await pool.query(
      `INSERT INTO reviews (business_id, user_id, rating, comment)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [business_id, userId, rating, comment]
    );

    res.json({ status: 'ok', review: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reviews/:businessId', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, u.name as reviewer_name, u.photo_url as reviewer_photo
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.business_id = $1
       ORDER BY r.created_at DESC`,
      [req.params.businessId]
    );

    res.json({ status: 'ok', reviews: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const senderId = getUserId(req);
    if (!senderId) return res.status(401).json({ error: 'Unauthorized' });

    const { receiver_id, message } = req.body;
    if (!receiver_id || !message) {
      return res.status(400).json({ error: 'Receiver ID and message required' });
    }

    const result = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, message)
       VALUES ($1, $2, $3) RETURNING *`,
      [senderId, receiver_id, message]
    );

    res.json({ status: 'ok', message: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/messages', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await pool.query(
      `SELECT m.*, u1.name as sender_name, u2.name as receiver_name
       FROM messages m
       JOIN users u1 ON m.sender_id = u1.id
       JOIN users u2 ON m.receiver_id = u2.id
       WHERE m.sender_id = $1 OR m.receiver_id = $1
       ORDER BY m.created_at DESC`,
      [userId]
    );

    res.json({ status: 'ok', messages: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reports', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { listing_id, reason } = req.body;
    if (!listing_id || !reason) {
      return res.status(400).json({ error: 'Listing ID and reason required' });
    }

    const result = await pool.query(
      `INSERT INTO reports (user_id, listing_id, reason)
       VALUES ($1, $2, $3) RETURNING *`,
      [userId, listing_id, reason]
    );

    res.json({ status: 'ok', report: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'HElPY' });
});

app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`HElPY server running on port ${PORT}`);
});
