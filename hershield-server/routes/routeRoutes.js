const express = require("express");

const router = express.Router();

const {
  predictRoute,
  detectAnomaly,
  getWeather,
} = require("../controllers/routeController");

router.post("/predict", predictRoute);
router.post("/anomaly", detectAnomaly);
router.get("/weather", getWeather);

module.exports = router;
