const express = require("express");
const cors = require("cors");
const path = require("path");

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

// Users test
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