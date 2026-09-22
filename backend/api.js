const express = require("express");
const { getHome, getHealth } = require("./controllers");

const router = express.Router();

router.get("/", getHome);
router.get("/health", getHealth);

module.exports = router;
