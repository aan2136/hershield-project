const express = require("express");
const router = express.Router();

// Import controller
const {
  triggerSOS,
  getSOSHistory,
  cancelSOS,
} = require("../controllers/sosController");

// Routes
router.post("/sos/trigger", triggerSOS);
router.get("/sos/history", getSOSHistory);
router.post("/sos/cancel", cancelSOS);

module.exports = router;

