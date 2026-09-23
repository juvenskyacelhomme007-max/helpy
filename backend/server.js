const express = require("express");
const cors = require("cors");
const path = require("path");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test database
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