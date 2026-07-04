const axios = require("axios");

const FLASK_URL = process.env.FLASK_URL || "http://localhost:5001";

const flaskClient = axios.create({
  baseURL: FLASK_URL,
  timeout: 60000,
  headers: { "Content-Type": "application/json" },
});

exports.predictRoute = async (req, res) => {
  try {
    const { source, destination, weather } = req.body;

    if (!source || !destination) {
      return res.status(400).json({
        success: false,
        message: "source and destination are required",
      });
    }

    const response = await flaskClient.post("/predict_route", {
      source,
      destination,
      weather: weather || "Clear",
    });

    return res.status(200).json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to predict route";

    console.error("predictRoute error:", message);
    return res.status(status).json({ success: false, message });
  }
};

exports.detectAnomaly = async (req, res) => {
  try {
    const { speed, gps_deviation, heading, stop_duration, acceleration } =
      req.body;

    const response = await flaskClient.post("/detect_anomaly", {
      speed,
      gps_deviation,
      heading,
      stop_duration,
      acceleration,
    });

    return res.status(200).json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    const message =
      error.response?.data?.message ||
      error.message ||
      "Failed to detect anomaly";

    console.error("detectAnomaly error:", message);
    return res.status(status).json({ success: false, message });
  }
};

exports.getWeather = async (req, res) => {
  try {
    const { lat, lon } = req.query;
    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: "lat and lon query params are required",
      });
    }

    if (!apiKey) {
      return res.status(200).json({
        success: true,
        weather: "Clear",
        description: "Weather API key not configured",
        temperature: null,
      });
    }

    const response = await axios.get(
      "https://api.openweathermap.org/data/2.5/weather",
      {
        params: {
          lat,
          lon,
          appid: apiKey,
          units: "metric",
        },
        timeout: 10000,
      }
    );

    const condition = response.data.weather?.[0]?.main || "Clear";

    return res.status(200).json({
      success: true,
      weather: condition,
      description: response.data.weather?.[0]?.description || "",
      temperature: response.data.main?.temp ?? null,
    });
  } catch (error) {
    console.error("getWeather error:", error.message);
    return res.status(200).json({
      success: true,
      weather: "Clear",
      description: "Weather unavailable",
      temperature: null,
    });
  }
};
