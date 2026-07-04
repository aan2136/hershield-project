const express = require("express");

const router = express.Router();

// NOTE: adjust this import to match your project's actual JWT middleware
// file name/path and export name if it differs.
const { authenticate } = require("../middleware/authMiddleware");

const {
  createEmergencyContacts,
} = require("../controllers/emergencyContactController");

router.post(
  "/emergency-contacts",
  authenticate,
  createEmergencyContacts
);

module.exports = router;
