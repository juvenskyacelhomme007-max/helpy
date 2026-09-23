const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function db() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone VARCHAR(30),
      whatsapp VARCHAR(30),
      photo_url TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS businesses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(150) NOT NULL,
      description TEXT,
      category VARCHAR(100),
      location VARCHAR(150),
      phone VARCHAR(30),
      whatsapp VARCHAR(30),
      photo_url TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      business_id INTEGER REFERENCES businesses(id) ON DELETE SET NULL,
      title VARCHAR(150) NOT NULL,
      description TEXT,
      price NUMERIC(12,2),
      currency VARCHAR(10) DEFAULT 'HTG',
      location VARCHAR(150),
      whatsapp VARCHAR(30),
      image_url TEXT,
      quantity INTEGER DEFAULT 1,
      status VARCHAR(30) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

db()
  .then(() => console.log("Database OK"))
  .catch(err => console.error("Database error:", err));

function userId(req) {
  return Number(req.headers["x-user-id"]) || null;
}

app.get("/", (req, res) => {
  res.send("HElPY API OK");
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});
// ===============================
// AUTH
// ===============================

app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password, phone, whatsapp, photo_url } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password required" });
    }

    const exists = await pool.query(
      "SELECT id FROM users WHERE email=$1",
      [email]
    );

    if (exists.rows.length) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const hash = await bcrypt.hash(password, 10);

    const r = await pool.query(
      `INSERT INTO users
       (name,email,password,phone,whatsapp,photo_url)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id,name,email,phone,whatsapp,photo_url`,
      [name, email, hash, phone || null, whatsapp || null, photo_url || null]
    );

    res.json({
      status: "ok",
      user: r.rows[0]
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const r = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (!r.rows.length) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = r.rows[0];
    const ok = await bcrypt.compare(password, user.password);

    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    delete user.password;

    res.json({
      status: "ok",
      user: user
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


app.get("/api/profile", async (req, res) => {
  try {
    const id = userId(req);

    if (!id) {
      return res.status(401).json({ error: "Login required" });
    }

    const r = await pool.query(
      `SELECT id,name,email,phone,whatsapp,photo_url,created_at
       FROM users
       WHERE id=$1`,
      [id]
    );

    if (!r.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.put("/api/profile", async (req, res) => {
  try {
    const id = userId(req);

    if (!id) {
      return res.status(401).json({ error: "Login required" });
    }

    const {
      name,
      phone,
      whatsapp,
      photo_url
    } = req.body;

    const r = await pool.query(
      `UPDATE users
       SET name=$1, phone=$2, whatsapp=$3, photo_url=$4
       WHERE id=$5
       RETURNING id,name,email,phone,whatsapp,photo_url`,
      [
        name,
        phone || null,
        whatsapp || null,
        photo_url || null,
        id
      ]
    );

    res.json({
      status: "ok",
      user: r.rows[0]
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// ===============================
// BUSINESSES
// ===============================

app.post("/api/businesses", async (req, res) => {
  try {
    const id = userId(req);

    if (!id) {
      return res.status(401).json({ error: "Login required" });
    }

    const {
      name,
      description,
      category,
      location,
      phone,
      whatsapp,
      photo_url
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Business name required" });
    }

    const r = await pool.query(
      `INSERT INTO businesses
       (user_id,name,description,category,location,phone,whatsapp,photo_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        id,
        name,
        description || null,
        category || null,
        location || null,
        phone || null,
        whatsapp || null,
        photo_url || null
      ]
    );

    res.json({
      status: "ok",
      business: r.rows[0]
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


app.get("/api/businesses", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT b.*, u.name AS owner_name
       FROM businesses b
       LEFT JOIN users u ON u.id=b.user_id
       ORDER BY b.id DESC`
    );

    res.json({
      status: "ok",
      entreprises: r.rows
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/businesses/:id", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT b.*, u.name AS owner_name,
              u.photo_url AS owner_photo
       FROM businesses b
       LEFT JOIN users u ON u.id=b.user_id
       WHERE b.id=$1`,
      [req.params.id]
    );

    if (!r.rows.length) {
      return res.status(404).json({
        error: "Business not found"
      });
    }

    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});


app.put("/api/businesses/:id", async (req, res) => {
  try {
    const id = userId(req);

    if (!id) {
      return res.status(401).json({
        error: "Login required"
      });
    }

    const check = await pool.query(
      "SELECT id FROM businesses WHERE id=$1 AND user_id=$2",
      [req.params.id, id]
    );

    if (!check.rows.length) {
      return res.status(403).json({
        error: "Not your business"
      });
    }

    const {
      name,
      description,
      category,
      location,
      phone,
      whatsapp,
      photo_url
    } = req.body;

    const r = await pool.query(
      `UPDATE businesses
       SET name=$1,
           description=$2,
           category=$3,
           location=$4,
           phone=$5,
           whatsapp=$6,
           photo_url=$7
       WHERE id=$8
       RETURNING *`,
      [
        name,
        description || null,
        category || null,
        location || null,
        phone || null,
        whatsapp || null,
        photo_url || null,
        req.params.id
      ]
    );

    res.json({
      status: "ok",
      business: r.rows[0]
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});


app.delete("/api/businesses/:id", async (req, res) => {
  try {
    const id = userId(req);

    if (!id) {
      return res.status(401).json({
        error: "Login required"
      });
    }

    const r = await pool.query(
      `DELETE FROM businesses
       WHERE id=$1 AND user_id=$2
       RETURNING id`,
      [req.params.id, id]
    );

    if (!r.rows.length) {
      return res.status(403).json({
        error: "Not your business"
      });
    }

    res.json({
      status: "ok",
      message: "Business deleted"
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// ===============================
// PRODUCTS
// ===============================

app.post("/api/products", async (req, res) => {
  try {
    const id = userId(req);

    if (!id) {
      return res.status(401).json({
        error: "Login required"
      });
    }

    const {
      business_id,
      title,
      description,
      price,
      currency,
      location,
      whatsapp,
      image_url,
      quantity
    } = req.body;

    if (!title) {
      return res.status(400).json({
        error: "Product title required"
      });
    }

    const r = await pool.query(
      `INSERT INTO products
       (user_id,business_id,title,description,price,currency,
        location,whatsapp,image_url,quantity)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        id,
        business_id || null,
        title,
        description || null,
        price || 0,
        currency || "HTG",
        location || null,
        whatsapp || null,
        image_url || null,
        quantity || 1
      ]
    );

    res.json({
      status: "ok",
      product: r.rows[0]
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});


app.get("/api/products", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT p.*, u.name AS seller_name
       FROM products p
       LEFT JOIN users u ON u.id=p.user_id
       ORDER BY p.id DESC`
    );

    res.json({
      status: "ok",
      products: r.rows
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});


app.get("/api/products/:id", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT p.*, u.name AS seller_name,
              u.photo_url AS seller_photo
       FROM products p
       LEFT JOIN users u ON u.id=p.user_id
       WHERE p.id=$1`,
      [req.params.id]
    );

    if (!r.rows.length) {
      return res.status(404).json({
        error: "Product not found"
      });
    }

    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// ===============================
// PRODUCT EDIT / DELETE
// ===============================

app.put("/api/products/:id", async (req, res) => {
  try {
    const id = userId(req);

    if (!id) {
      return res.status(401).json({ error: "Login required" });
    }

    const check = await pool.query(
      "SELECT id FROM products WHERE id=$1 AND user_id=$2",
      [req.params.id, id]
    );

    if (!check.rows.length) {
      return res.status(403).json({ error: "Not your product" });
    }

    const {
      title,
      description,
      price,
      currency,
      location,
      whatsapp,
      image_url,
      quantity
    } = req.body;

    const r = await pool.query(
      `UPDATE products
       SET title=$1,
           description=$2,
           price=$3,
           currency=$4,
           location=$5,
           whatsapp=$6,
           image_url=$7,
           quantity=$8
       WHERE id=$9
       RETURNING *`,
      [
        title,
        description || null,
        price || 0,
        currency || "HTG",
        location || null,
        whatsapp || null,
        image_url || null,
        quantity || 1,
        req.params.id
      ]
    );

    res.json({
      status: "ok",
      product: r.rows[0]
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


app.delete("/api/products/:id", async (req, res) => {
  try {
    const id = userId(req);

    if (!id) {
      return res.status(401).json({ error: "Login required" });
    }

    const r = await pool.query(
      `DELETE FROM products
       WHERE id=$1 AND user_id=$2
       RETURNING id`,
      [req.params.id, id]
    );

    if (!r.rows.length) {
      return res.status(403).json({
        error: "Not your product"
      });
    }

    res.json({
      status: "ok",
      message: "Product deleted"
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// ===============================
// SEARCH
// ===============================

app.get("/api/search", async (req, res) => {
  try {
    const q = "%" + (req.query.q || "") + "%";

    const businesses = await pool.query(
      `SELECT id,name,description,location,photo_url
       FROM businesses
       WHERE name ILIKE $1
          OR description ILIKE $1
       ORDER BY id DESC`,
      [q]
    );

    const products = await pool.query(
      `SELECT id,title,description,price,currency,image_url
       FROM products
       WHERE title ILIKE $1
          OR description ILIKE $1
       ORDER BY id DESC`,
      [q]
    );

    res.json({
      status: "ok",
      businesses: businesses.rows,
      products: products.rows
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
// ===============================
// REVIEWS
// ===============================

app.post("/api/reviews", async (req, res) => {
  try {
    const id = userId(req);

    if (!id) {
      return res.status(401).json({
        error: "Login required"
      });
    }

    const {
      business_id,
      product_id,
      rating,
      comment
    } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        error: "Rating must be 1-5"
      });
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL,
        comment TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const r = await pool.query(
      `INSERT INTO reviews
       (user_id,business_id,product_id,rating,comment)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [
        id,
        business_id || null,
        product_id || null,
        rating,
        comment || null
      ]
    );

    res.json({
      status: "ok",
      review: r.rows[0]
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});


app.get("/api/reviews/:businessId", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT r.*, u.name AS user_name,
              u.photo_url AS user_photo
       FROM reviews r
       LEFT JOIN users u ON u.id=r.user_id
       WHERE r.business_id=$1
       ORDER BY r.id DESC`,
      [req.params.businessId]
    );

    res.json({
      status: "ok",
      reviews: r.rows
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});


// ===============================
// MESSAGES
// ===============================

app.post("/api/messages", async (req, res) => {
  try {
    const sender = userId(req);

    if (!sender) {
      return res.status(401).json({
        error: "Login required"
      });
    }

    const { receiver_id, message } = req.body;

    if (!receiver_id || !message) {
      return res.status(400).json({
        error: "Receiver and message required"
      });
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const r = await pool.query(
      `INSERT INTO messages
       (sender_id,receiver_id,message)
       VALUES ($1,$2,$3)
       RETURNING *`,
      [sender, receiver_id, message]
    );

    res.json({
      status: "ok",
      message: r.rows[0]
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// ===============================
// REPORTS
// ===============================

app.post("/api/reports", async (req, res) => {
  try {
    const id = userId(req);

    if (!id) {
      return res.status(401).json({
        error: "Login required"
      });
    }

    const { type, target_id, reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        error: "Reason required"
      });
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50),
        target_id INTEGER,
        reason TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const r = await pool.query(
      `INSERT INTO reports
       (user_id,type,target_id,reason)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [
        id,
        type || null,
        target_id || null,
        reason
      ]
    );

    res.json({
      status: "ok",
      report: r.rows[0]
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});


// ===============================
// START SERVER
// ===============================

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("HElPY running on port " + PORT);
});