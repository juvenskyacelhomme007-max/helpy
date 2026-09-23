const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");

const { pool, initializeDatabase } = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize database
initializeDatabase();

// Database test
app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      status: "ok",
      database: "connected",
      time: result.rows[0].now
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      database: "not connected"
    });
  }
});

// Users
app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, email, phone, role, status, verified, created_at
      FROM users
      ORDER BY id DESC
    `);

    res.json({
      status: "ok",
      users: result.rows
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Unable to load users"
    });
  }
});

// Register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

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
      `SELECT id FROM users WHERE email = $1 OR phone = $2`,
      [email || null, phone || null]
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
      (name, email, phone, password_hash)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, phone, role, status, verified, created_at
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
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Unable to create account"
    });
  }
});

// Frontend
app.use(express.static(path.join(__dirname, "..")));

// Health
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "HELPY"
  });
});

// Chat
app.post("/api", (req, res) => {
  const message = req.body?.message || "";

  res.json({
    app: "HELPY",
    message: `Mwen resevwa mesaj ou a: ${message}`
  });
});

// Home
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

app.listen(PORT, () => {
  console.log(`HELPY server running on port ${PORT}`);
}); 