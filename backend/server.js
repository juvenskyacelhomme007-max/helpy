const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");

const { pool, initializeDatabase } = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());
app.use(express.json());

// =====================================================
// DATABASE
// =====================================================

initializeDatabase();

// =====================================================
// DATABASE TEST
// =====================================================

app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      status: "ok",
      database: "connected",
      time: result.rows[0].now
    });

  } catch (error) {
    console.error("DB TEST ERROR:", error);

    res.status(500).json({
      status: "error",
      database: "not connected"
    });
  }
});

// =====================================================
// HEALTH
// =====================================================

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "HELPY"
  });
});

// =====================================================
// USERS
// =====================================================

app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        name,
        email,
        phone,
        role,
        status,
        verified,
        created_at
      FROM users
      ORDER BY id DESC
    `);

    res.json({
      status: "ok",
      users: result.rows
    });

  } catch (error) {
    console.error("USERS ERROR:", error);

    res.status(500).json({
      status: "error",
      message: "Unable to load users"
    });
  }
});

// =====================================================
// REGISTER
// =====================================================

app.post("/api/auth/register", async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password
    } = req.body;

    if (!name || !password || (!email && !phone)) {
      return res.status(400).json({
        status: "error",
        message: "Name, password and email or phone are required"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        status: "error",
        message: "Password must contain at least 6 characters"
      });
    }

    const existingUser = await pool.query(
      `
      SELECT id
      FROM users
      WHERE email = $1 OR phone = $2
      `,
      [
        email || null,
        phone || null
      ]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        status: "error",
        message: "User already exists"
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `
      INSERT INTO users
      (
        name,
        email,
        phone,
        password_hash
      )
      VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        name,
        email,
        phone,
        role,
        status,
        verified,
        created_at
      `,
      [
        name,
        email || null,
        phone || null,
        passwordHash
      ]
    );

    res.status(201).json({
      status: "ok",
      message: "Account created successfully",
      user: result.rows[0]
    });

  } catch (error) {
    console.error("REGISTER ERROR:", error);

    res.status(500).json({
      status: "error",
      message: "Unable to create account"
    });
  }
});

// =====================================================
// LOGIN
// =====================================================

app.post("/api/auth/login", async (req, res) => {
  try {
    const {
      identifier,
      password
    } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        status: "error",
        message: "Email/téléphone et mot de passe sont requis"
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        phone,
        password_hash,
        role,
        status,
        verified
      FROM users
      WHERE email = $1 OR phone = $1
      LIMIT 1
      `,
      [identifier]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        status: "error",
        message: "Compte introuvable"
      });
    }

    const user = result.rows[0];

    const passwordMatch = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        status: "error",
        message: "Mot de passe incorrect"
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        status: "error",
        message: "Ce compte est désactivé"
      });
    }

    delete user.password_hash;

    res.json({
      status: "ok",
      message: "Connexion réussie",
      user
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);

    res.status(500).json({
      status: "error",
      message: "Erreur serveur"
    });
  }
});

// =====================================================
// PRODUCTS
// =====================================================

// GET ALL PRODUCTS

app.get("/api/products", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.id,
        p.title,
        p.description,
        p.price,
        p.currency,
        p.category,
        p.location,
        p.whatsapp,
        p.image_url,
        p.quantity,
        p.status,
        p.created_at,
        u.name AS seller_name
      FROM products p
      JOIN users u
        ON u.id = p.user_id
      WHERE p.status = 'active'
      ORDER BY p.id DESC
    `);

    res.json({
      status: "ok",
      products: result.rows
    });

  } catch (error) {
    console.error("PRODUCTS ERROR:", error);

    res.status(500).json({
      status: "error",
      message: "Unable to load products"
    });
  }
});

// CREATE PRODUCT

app.post("/api/products", async (req, res) => {
  try {
    const {
      user_id,
      title,
      description,
      price,
      currency,
      category,
      location,
      whatsapp,
      image_url,
      quantity
    } = req.body;

    if (
      !user_id ||
      !title ||
      !price ||
      !whatsapp
    ) {
      return res.status(400).json({
        status: "error",
        message: "user_id, title, price and WhatsApp are required"
      });
    }

    const user = await pool.query(
      `
      SELECT id
      FROM users
      WHERE id = $1
      `,
      [user_id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "User not found"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO products
      (
        user_id,
        title,
        description,
        price,
        currency,
        category,
        location,
        whatsapp,
        image_url,
        quantity
      )
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
      `,
      [
        user_id,
        title,
        description || null,
        price,
        currency || "HTG",
        category || null,
        location || null,
        whatsapp,
        image_url || null,
        quantity || 1
      ]
    );

    res.status(201).json({
      status: "ok",
      message: "Product created successfully",
      product: result.rows[0]
    });

  } catch (error) {
    console.error("CREATE PRODUCT ERROR:", error);

    res.status(500).json({
      status: "error",
      message: "Unable to create product"
    });
  }
});

// GET ONE PRODUCT

app.get("/api/products/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        p.*,
        u.name AS seller_name
      FROM products p
      JOIN users u
        ON u.id = p.user_id
      WHERE p.id = $1
      `,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Product not found"
      });
    }

    res.json({
      status: "ok",
      product: result.rows[0]
    });

  } catch (error) {
    console.error("GET PRODUCT ERROR:", error);

    res.status(500).json({
      status: "error",
      message: "Unable to load product"
    });
  }
});

// =====================================================
// SERVICES
// =====================================================

// GET ALL SERVICES

app.get("/api/services", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        s.id,
        s.title,
        s.description,
        s.price,
        s.currency,
        s.category,
        s.location,
        s.whatsapp,
        s.image_url,
        s.status,
        s.created_at,
        u.name AS provider_name
      FROM services s
      JOIN users u
        ON u.id = s.user_id
      WHERE s.status = 'active'
      ORDER BY s.id DESC
    `);

    res.json({
      status: "ok",
      services: result.rows
    });

  } catch (error) {
    console.error("GET SERVICES ERROR:", error);

    res.status(500).json({
      status: "error",
      message: "Unable to load services"
    });
  }
});

// CREATE SERVICE

app.post("/api/services", async (req, res) => {
  try {
    const {
      user_id,
      title,
      description,
      price,
      currency,
      category,
      location,
      whatsapp,
      image_url
    } = req.body;

    if (
      !user_id ||
      !title ||
      price === undefined ||
      price === null ||
      !whatsapp
    ) {
      return res.status(400).json({
        status: "error",
        message: "user_id, title, price and WhatsApp are required"
      });
    }

    const user = await pool.query(
      `
      SELECT id
      FROM users
      WHERE id = $1
      `,
      [user_id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "User not found"
      });
    }

    if (Number(price) < 0) {
      return res.status(400).json({
        status: "error",
        message: "Price cannot be negative"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO services
      (
        user_id,
        title,
        description,
        price,
        currency,
        category,
        location,
        whatsapp,
        image_url
      )
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
      `,
      [
        user_id,
        title.trim(),
        description || null,
        price,
        currency || "HTG",
        category || null,
        location || null,
        whatsapp.trim(),
        image_url || null
      ]
    );

    res.status(201).json({
      status: "ok",
      message: "Service created successfully",
      service: result.rows[0]
    });

  } catch (error) {
    console.error("CREATE SERVICE ERROR:", error);

    res.status(500).json({
      status: "error",
      message: "Unable to create service"
    });
  }
});

// GET ONE SERVICE

app.get("/api/services/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        s.*,
        u.name AS provider_name
      FROM services s
      JOIN users u
        ON u.id = s.user_id
      WHERE s.id = $1
      `,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Service not found"
      });
    }

    res.json({
      status: "ok",
      service: result.rows[0]
    });

  } catch (error) {
    console.error("GET SERVICE ERROR:", error);

    res.status(500).json({
      status: "error",
      message: "Unable to load service"
    });
  }
});

// =====================================================
// CHAT
// =====================================================

app.post("/api", (req, res) => {
  const message = req.body?.message || "";

  res.json({
    app: "HELPY",
    message: `Mwen resevwa mesaj ou a: ${message}`
  });
});

// =====================================================
// FRONTEND
// =====================================================

app.use(express.static(path.join(__dirname, "..")));

// =====================================================
// FRONTEND FALLBACK
// IMPORTANT: API ROUTES ARE ABOVE THIS
// =====================================================

app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(
    path.join(__dirname, "..", "index.html")
  );
});

// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, "0.0.0.0", () => {
  console.log(`HELPY server running on port ${PORT}`);
});