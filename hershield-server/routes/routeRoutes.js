const express = require("express");
const router = express.Router();

// Import controller
const {
  getRoutes,
  createRoute,
  updateRoute,
  deleteRoute,
} = require("../controllers/routeController");

// Routes
router.get("/routes", getRoutes);
router.post("/routes", createRoute);
router.put("/routes/:id", updateRoute);
router.delete("/routes/:id", deleteRoute);

module.exports = router;
