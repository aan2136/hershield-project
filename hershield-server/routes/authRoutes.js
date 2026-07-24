const express = require("express");
const router = express.Router();

// Import controller
const {
  signup,
  verifyOTP,
  login,
  uploadVoice,
} = require("../controllers/authController");

// Optional: multer setup for file uploads
let upload;
try {
  upload = require("../config/multer");
} catch (err) {
  console.warn("Multer config not found, voice upload may not work");
  upload = {
    single: () => (req, res, next) => next(),
  };
}

// Routes
router.post("/signup", signup);
router.post("/verify-otp", verifyOTP);
router.post("/login", login);
router.post("/upload-voice", upload.single("voice"), uploadVoice);

module.exports = router;
