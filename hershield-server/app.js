require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

const authRoutes = require("./routes/authRoutes");
const routeRoutes = require("./routes/routeRoutes");
const sosRoutes = require("./routes/sosRoutes");
const emergencyContactRoutes = require("./routes/Emergencycontactroutes"); // ✅ ADD THIS

app.use(cors());
app.use(express.json());

app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "HerShield Backend Running 🚀",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/routes", routeRoutes);

// SOS API
app.use("/api", sosRoutes);

// Emergency Contacts API
app.use("/api", emergencyContactRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});