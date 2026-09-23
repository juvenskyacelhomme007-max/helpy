const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Frontend
app.use(express.static(path.join(__dirname, "..")));

// API
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "HELPY"
  });
});

// Basic chat endpoint
app.post("/api", (req, res) => {
  const message = req.body?.message || "";

  res.json({
    app: "HELPY",
    message: `Mwen resevwa mesaj ou a: ${message}`
  });
});

// Home page
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

app.listen(PORT, () => {
  console.log(`HELPY server running on port ${PORT}`);
});