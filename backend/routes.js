const express = require("express");

const router = express.Router();

router.get("/status", (req, res) => {
  res.json({
    service: "HELPY",
    status: "online"
  });
});

module.exports = router;
