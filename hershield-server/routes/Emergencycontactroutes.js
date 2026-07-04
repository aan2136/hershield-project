const express = require("express");
const router = express.Router();

// Import controller
const {
  getEmergencyContacts,
  addEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
} = require("../controllers/Emergencycontactcontroller");

// Routes
router.get("/emergency-contacts", getEmergencyContacts);
router.post("/emergency-contacts", addEmergencyContact);
router.put("/emergency-contacts/:id", updateEmergencyContact);
router.delete("/emergency-contacts/:id", deleteEmergencyContact);

module.exports = router;
