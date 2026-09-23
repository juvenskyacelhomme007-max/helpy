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
app.use(express.urlencoded({ extended: true }));

// Fichye frontend yo
app.use(express.static(path.join(__dirname, "public")));

// =====================================================
// HOME
// =====================================================

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT NOW()");

    res.json({
      status: "ok",
      message: "HELPY backend is online",
      database: "connected"
    });
  } catch (error) {
    console.error("Health error:", error);

    res.status(500).json({
      status: "error",
      message: "Database connection failed"
    });
  }
});

// =====================================================
// USERS - REGISTER
// =====================================================

app.post("/api/register", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Non, email ak modpas obligatwa."
      });
    }

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        status: "error",
        message: "Email sa deja itilize."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users
      (name, email, phone, password)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, phone, created_at
      `,
      [name, email, phone || null, hashedPassword]
    );

    res.status(201).json({
      status: "ok",
      message: "Kont kreye avèk siksè.",
      user: result.rows[0]
    });

  } catch (error) {
    console.error("Register error:", error);

    res.status(500).json({
      status: "error",
      message: "Erè pandan kreyasyon kont lan."
    });
  }
});

// =====================================================
// USERS - LOGIN
// =====================================================

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Email ak modpas obligatwa."
      });
    }

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        status: "error",
        message: "Email oswa modpas pa kòrèk."
      });
    }

    const user = result.rows[0];

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        status: "error",
        message: "Email oswa modpas pa kòrèk."
      });
    }

    delete user.password;

    res.json({
      status: "ok",
      message: "Koneksyon reyisi.",
      user
    });

  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      status: "error",
      message: "Erè pandan koneksyon."
    });
  }
});

// =====================================================
// BUSINESSES - CREATE
// =====================================================

app.post("/api/businesses", async (req, res) => {
  try {
    const {
      user_id,
      name,
      description,
      category,
      phone,
      whatsapp,
      email,
      address,
      city,
      image_url
    } = req.body;

    if (!name || !category) {
      return res.status(400).json({
        status: "error",
        message: "Non antrepriz la ak kategori a obligatwa."
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
        email,
        address,
        city,
        image_url
      )
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
      `,
      [
        user_id || null,
        name,
        description || null,
        category,
        phone || null,
        whatsapp || null,
        email || null,
        address || null,
        city || null,
        image_url || null
      ]
    );

    res.status(201).json({
      status: "ok",
      message: "Antrepriz la ajoute avèk siksè.",
      business: result.rows[0]
    });

  } catch (error) {
    console.error("Create business error:", error);

    res.status(500).json({
      status: "error",
      message: "Pa kapab ajoute antrepriz la.",
      error: error.message
    });
  }
});

// =====================================================
// BUSINESSES - GET ALL
// =====================================================

app.get("/api/businesses", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM businesses
      ORDER BY created_at DESC
      `
    );

    res.json({
      status: "ok",
      businesses: result.rows
    });

  } catch (error) {
    console.error("Get businesses error:", error);

    res.status(500).json({
      status: "error",
      message: "Pa kapab jwenn antrepriz yo."
    });
  }
});

// =====================================================
// BUSINESS - GET ONE
// =====================================================

app.get("/api/businesses/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "SELECT * FROM businesses WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Antrepriz la pa jwenn."
      });
    }

    res.json({
      status: "ok",
      business: result.rows[0]
    });

  } catch (error) {
    console.error("Get business error:", error);

    res.status(500).json({
      status: "error",
      message: "Erè pandan rechèch antrepriz la."
    });
  }
});

// =====================================================
// BUSINESS - UPDATE
// =====================================================

app.put("/api/businesses/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      description,
      category,
      phone,
      whatsapp,
      email,
      address,
      city,
      image_url
    } = req.body;

    const result = await pool.query(
      `
      UPDATE businesses
      SET
        name = $1,
        description = $2,
        category = $3,
        phone = $4,
        whatsapp = $5,
        email = $6,
        address = $7,
        city = $8,
        image_url = $9
      WHERE id = $10
      RETURNING *
      `,
      [
        name,
        description || null,
        category,
        phone || null,
        whatsapp || null,
        email || null,
        address || null,
        city || null,
        image_url || null,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Antrepriz la pa jwenn."
      });
    }

    res.json({
      status: "ok",
      message: "Antrepriz la modifye.",
      business: result.rows[0]
    });

  } catch (error) {
    console.error("Update business error:", error);

    res.status(500).json({
      status: "error",
      message: "Pa kapab modifye antrepriz la."
    });
  }
});

// =====================================================
// BUSINESS - DELETE
// =====================================================

app.delete("/api/businesses/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM businesses WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Antrepriz la pa jwenn."
      });
    }

    res.json({
      status: "ok",
      message: "Antrepriz la efase avèk siksè."
    });

  } catch (error) {
    console.error("Delete business error:", error);

    res.status(500).json({
      status: "error",
      message: "Pa kapab efase antrepriz la."
    });
  }
});

// =====================================================
// SEARCH BUSINESSES
// =====================================================

app.get("/api/search", async (req, res) => {
  try {
    const q = req.query.q || "";

    const result = await pool.query(
      `
      SELECT *
      FROM businesses
      WHERE
        name ILIKE $1
        OR category ILIKE $1
        OR description ILIKE $1
        OR city ILIKE $1
        OR address ILIKE $1
      ORDER BY created_at DESC
      `,
      [`%${q}%`]
    );

    res.json({
      status: "ok",
      businesses: result.rows
    });

  } catch (error) {
    console.error("Search error:", error);

    res.status(500).json({
      status: "error",
      message: "Erè pandan rechèch la."
    });
  }
});

// =====================================================
// 404 API
// =====================================================

app.use("/api", (req, res) => {
  res.status(404).json({
    status: "error",
    message: "API route pa jwenn."
  });
});

// =====================================================
// ERROR HANDLER
// =====================================================

app.use((err, req, res, next) => {
  console.error("Server error:", err);

  res.status(500).json({
    status: "error",
    message: "Yon erè entèn rive sou sèvè a."
  });
});

// =====================================================
// START SERVER
// =====================================================

async function startServer() {
  try {
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log("======================================");
      console.log("🚀 HELPY SERVER ONLINE");
      console.log(`🌐 Port: ${PORT}`);
      console.log("🗄️ Database: Connected");
      console.log("======================================");
    });

  } catch (error) {
    console.error("❌ Database initialization failed:");
    console.error(error);
    process.exit(1);
  }
}

startServer();