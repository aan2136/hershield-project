require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

const authRoutes = require("./routes/authRoutes");
const routeRoutes = require("./routes/routeRoutes");
const sosRoutes = require("./routes/sosRoutes");
const emergencyContactRoutes = require("./routes/Emergencycontactroutes");

// CORS Configuration - Allow Vercel frontend
const corsOptions = {
  origin: [
    "http://localhost:3000", // Local development
    "https://hershield-project-aan2136s-projects.vercel.app", // Production frontend
    "https://hershield-project.onrender.com", // Backend self-reference
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use("/uploads", express.static("uploads"));

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "HerShield Backend Running 🚀",
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api", sosRoutes);
app.use("/api", emergencyContactRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

module.exports = app;
