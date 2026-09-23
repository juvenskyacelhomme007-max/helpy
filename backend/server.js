const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    app: "HELPY",
    status: "online",
    message: "HELPY backend is working 🚀"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "HELPY"
  });
});

app.listen(PORT, () => {
  console.log(`HELPY server running on port ${PORT}`);
});