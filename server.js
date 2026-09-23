const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// =====================================================
// DATABASE
// =====================================================

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// =====================================================
// DATABASE INITIALIZATION
// =====================================================

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(180) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      phone VARCHAR(40),
      whatsapp VARCHAR(40),
      photo_url TEXT,
      location VARCHAR(180),
      bio TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS businesses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(180) NOT NULL,
      description TEXT,
      category VARCHAR(100),
      phone VARCHAR(40),
      whatsapp VARCHAR(40),
      location VARCHAR(180),
      address TEXT,
      opening_hours VARCHAR(255),
      photo_url TEXT,
      rating NUMERIC(3,2) DEFAULT 0,
      reviews_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      business_id INTEGER REFERENCES businesses(id) ON DELETE SET NULL,
      title VARCHAR(180) NOT NULL,
      description TEXT,
      price NUMERIC(12,2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'HTG',
      category VARCHAR(100),
      location VARCHAR(180),
      whatsapp VARCHAR(40),
      phone VARCHAR(40),
      image_url TEXT,
      quantity INTEGER DEFAULT 1,
      status VARCHAR(30) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS services (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      business_id INTEGER REFERENCES businesses(id) ON DELETE SET NULL,
      title VARCHAR(180) NOT NULL,
      description TEXT,
      price NUMERIC(12,2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'HTG',
      category VARCHAR(100),
      location VARCHAR(180),
      whatsapp VARCHAR(40),
      phone VARCHAR(40),
      image_url TEXT,
      status VARCHAR(30) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
      service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_type VARCHAR(30) NOT NULL,
      target_id INTEGER NOT NULL,
      reason TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log("HElPY database ready");
}

// =====================================================
// HELPERS
// =====================================================

function escapeHtml(value) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function cleanPhone(value) {
  return String(value || "").replace(/[^\d+]/g, "");
}

function whatsappUrl(value) {
  const phone = cleanPhone(value).replace("+", "");
  return "https://wa.me/" + phone;
}

function authRequired(req, res, next) {
  const userId = req.headers["x-user-id"];

  if (!userId) {
    return res.status(401).json({
      status: "error",
      message: "Connexion requise"
    });
  }

  req.userId = Number(userId);
  next();
}

async function getUser(userId) {
  const result = await pool.query(
    "SELECT * FROM users WHERE id = $1",
    [userId]
  );

  return result.rows[0];
}

// =====================================================
// API HOME
// =====================================================

app.get("/api", (req, res) => {
  res.json({
    status: "ok",
    app: "HElPY",
    message: "HElPY API is running"
  });
});

// =====================================================
// REGISTER
// =====================================================

app.post("/api/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      whatsapp,
      photo_url,
      location,
      bio
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Nom, email et mot de passe obligatoires"
      });
    }

    const existing = await pool.query(
      "SELECT id FROM users WHERE LOWER(email) = LOWER($1)",
      [email.trim()]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        status: "error",
        message: "Ce compte existe déjà"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users
      (name, email, password, phone, whatsapp, photo_url, location, bio)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING id, name, email, phone, whatsapp, photo_url, location, bio, created_at
      `,
      [
        name.trim(),
        email.trim().toLowerCase(),
        hashedPassword,
        phone || null,
        whatsapp || null,
        photo_url || null,
        location || null,
        bio || null
      ]
    );

    res.status(201).json({
      status: "ok",
      message: "Compte créé avec succès",
      user: result.rows[0]
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Erreur serveur"
    });
  }
});

// =====================================================
// LOGIN
// =====================================================

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE LOWER(email) = LOWER($1)",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        status: "error",
        message: "Email ou mot de passe incorrect"
      });
    }

    const user = result.rows[0];

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({
        status: "error",
        message: "Email ou mot de passe incorrect"
      });
    }

    delete user.password;

    res.json({
      status: "ok",
      message: "Connexion réussie",
      user
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Erreur serveur"
    });
  }
});

// =====================================================
// PROFILE
// =====================================================

app.get("/api/profile/:id", async (req, res) => {
  try {
    const user = await getUser(req.params.id);

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "Utilisateur introuvable"
      });
    }

    delete user.password;

    const businesses = await pool.query(
      "SELECT * FROM businesses WHERE user_id = $1 ORDER BY id DESC",
      [req.params.id]
    );

    const products = await pool.query(
      "SELECT * FROM products WHERE user_id = $1 ORDER BY id DESC",
      [req.params.id]
    );

    const services = await pool.query(
      "SELECT * FROM services WHERE user_id = $1 ORDER BY id DESC",
      [req.params.id]
    );

    res.json({
      status: "ok",
      user,
      businesses: businesses.rows,
      products: products.rows,
      services: services.rows
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Erreur serveur"
    });
  }
});

// =====================================================
// UPDATE PROFILE
// =====================================================

app.put("/api/profile", authRequired, async (req, res) => {
  try {
    const {
      name,
      phone,
      whatsapp,
      photo_url,
      location,
      bio
    } = req.body;

    const result = await pool.query(
      `
      UPDATE users
      SET
        name = COALESCE($1, name),
        phone = COALESCE($2, phone),
        whatsapp = COALESCE($3, whatsapp),
        photo_url = COALESCE($4, photo_url),
        location = COALESCE($5, location),
        bio = COALESCE($6, bio)
      WHERE id = $7
      RETURNING id, name, email, phone, whatsapp, photo_url, location, bio
      `,
      [
        name,
        phone,
        whatsapp,
        photo_url,
        location,
        bio,
        req.userId
      ]
    );

    res.json({
      status: "ok",
      user: result.rows[0]
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Impossible de modifier le profil"
    });
  }
});

// =====================================================
// BUSINESSES - CREATE
// =====================================================

app.post("/api/businesses", authRequired, async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      phone,
      whatsapp,
      location,
      address,
      opening_hours,
      photo_url
    } = req.body;

    if (!name) {
      return res.status(400).json({
        status: "error",
        message: "Nom de l'entreprise obligatoire"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO businesses
      (
        user_id,
        name,
        description,
        category,
        phone,
        whatsapp,
        location,
        address,
        opening_hours,
        photo_url
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
      `,
      [
        req.userId,
        name,
        description || null,
        category || null,
        phone || null,
        whatsapp || null,
        location || null,
        address || null,
        opening_hours || null,
        photo_url || null
      ]
    );

    res.status(201).json({
      status: "ok",
      business: result.rows[0]
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Impossible de créer l'entreprise"
    });
  }
});

// =====================================================
// BUSINESSES - LIST
// =====================================================

app.get("/api/businesses", async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();

    let result;

    if (search) {
      result = await pool.query(
        `
        SELECT b.*, u.name AS owner_name, u.photo_url AS owner_photo
        FROM businesses b
        JOIN users u ON u.id = b.user_id
        WHERE
          b.name ILIKE $1
          OR b.category ILIKE $1
          OR b.location ILIKE $1
          OR b.description ILIKE $1
        ORDER BY b.id DESC
        `,
        ["%" + search + "%"]
      );
    } else {
      result = await pool.query(
        `
        SELECT b.*, u.name AS owner_name, u.photo_url AS owner_photo
        FROM businesses b
        JOIN users u ON u.id = b.user_id
        ORDER BY b.id DESC
        `
      );
    }

    res.json({
      status: "ok",
      entreprises: result.rows
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Erreur serveur"
    });
  }
});

// =====================================================
// BUSINESS DETAILS
// =====================================================

app.get("/api/businesses/:id", async (req, res) => {
  try {
    const business = await pool.query(
      `
      SELECT
        b.*,
        u.name AS owner_name,
        u.photo_url AS owner_photo,
        u.phone AS owner_phone,
        u.whatsapp AS owner_whatsapp
      FROM businesses b
      JOIN users u ON u.id = b.user_id
      WHERE b.id = $1
      `,
      [req.params.id]
    );

    if (business.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Entreprise introuvable"
      });
    }

    const products = await pool.query(
      "SELECT * FROM products WHERE business_id = $1 ORDER BY id DESC",
      [req.params.id]
    );

    const services = await pool.query(
      "SELECT * FROM services WHERE business_id = $1 ORDER BY id DESC",
      [req.params.id]
    );

    const reviews = await pool.query(
      `
      SELECT r.*, u.name AS reviewer_name, u.photo_url AS reviewer_photo
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.business_id = $1
      ORDER BY r.id DESC
      `,
      [req.params.id]
    );

    res.json({
      status: "ok",
      business: business.rows[0],
      products: products.rows,
      services: services.rows,
      reviews: reviews.rows
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Erreur serveur"
    });
  }
});

// =====================================================
// BUSINESS - UPDATE
// =====================================================

app.put("/api/businesses/:id", authRequired, async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      phone,
      whatsapp,
      location,
      address,
      opening_hours,
      photo_url
    } = req.body;

    const result = await pool.query(
      `
      UPDATE businesses
      SET
        name = COALESCE($1,name),
        description = COALESCE($2,description),
        category = COALESCE($3,category),
        phone = COALESCE($4,phone),
        whatsapp = COALESCE($5,whatsapp),
        location = COALESCE($6,location),
        address = COALESCE($7,address),
        opening_hours = COALESCE($8,opening_hours),
        photo_url = COALESCE($9,photo_url)
      WHERE id = $10 AND user_id = $11
      RETURNING *
      `,
      [
        name,
        description,
        category,
        phone,
        whatsapp,
        location,
        address,
        opening_hours,
        photo_url,
        req.params.id,
        req.userId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        status: "error",
        message: "Vous ne pouvez modifier que votre propre entreprise"
      });
    }

    res.json({
      status: "ok",
      business: result.rows[0]
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Erreur serveur"
    });
  }
});

// =====================================================
// BUSINESS - DELETE
// =====================================================

app.delete("/api/businesses/:id", authRequired, async (req, res) => {
  try {
    const result = await pool.query(
      `
      DELETE FROM businesses
      WHERE id = $1 AND user_id = $2
      RETURNING id
      `,
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        status: "error",
        message: "Vous ne pouvez supprimer que votre propre entreprise"
      });
    }

    res.json({
      status: "ok",
      message: "Entreprise supprimée"
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Erreur serveur"
    });
  }
});

// =====================================================
// PRODUCTS - CREATE
// =====================================================

app.post("/api/products", authRequired, async (req, res) => {
  try {
    const {
      business_id,
      title,
      description,
      price,
      currency,
      category,
      location,
      whatsapp,
      phone,
      image_url,
      quantity
    } = req.body;

    if (!title) {
      return res.status(400).json({
        status: "error",
        message: "Nom du produit obligatoire"
      });
    }

    if (business_id) {
      const owner = await pool.query(
        "SELECT id FROM businesses WHERE id = $1 AND user_id = $2",
        [business_id, req.userId]
      );

      if (owner.rows.length === 0) {
        return res.status(403).json({
          status: "error",
          message: "Entreprise invalide"
        });
      }
    }

    const result = await pool.query(
      `
      INSERT INTO products
      (
        user_id,
        business_id,
        title,
        description,
        price,
        currency,
        category,
        location,
        whatsapp,
        phone,
        image_url,
        quantity
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *
      `,
      [
        req.userId,
        business_id || null,
        title,
        description || null,
        Number(price || 0),
        currency || "HTG",
        category || null,
        location || null,
        whatsapp || null,
        phone || null,
        image_url || null,
        Number(quantity || 1)
      ]
    );

    res.status(201).json({
      status: "ok",
      product: result.rows[0]
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Impossible de créer le produit"
    });
  }
});

// =====================================================
// PRODUCTS - LIST / SEARCH
// =====================================================

app.get("/api/products", async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();

    const result = await pool.query(
      `
      SELECT
        p.*,
        u.name AS seller_name,
        u.photo_url AS seller_photo,
        b.name AS business_name
      FROM products p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN businesses b ON b.id = p.business_id
      WHERE
        ($1 = '' OR
        p.title ILIKE $2 OR
        p.category ILIKE $2 OR
        p.location ILIKE $2 OR
        p.description ILIKE $2)
      ORDER BY p.id DESC
      `,
      [search, "%" + search + "%"]
    );

    res.json({
      status: "ok",
      products: result.rows
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Erreur serveur"
    });
  }
});

// =====================================================
// PRODUCT DETAILS
// =====================================================

app.get("/api/products/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        p.*,
        u.name AS seller_name,
        u.photo_url AS seller_photo,
        u.phone AS se