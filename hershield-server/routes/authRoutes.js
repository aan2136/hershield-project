const express = require("express");
const upload = require("../config/multer");

const router = express.Router();

const {
  signup,
  verifyOTP,
  login,
  uploadVoice,
} = require("../controllers/authController");

router.post("/signup", signup);

router.post("/verify-otp", verifyOTP);

router.post("/login", login);
router.post(
  "/upload-voice",
  upload.single("voice"),
  uploadVoice
);

module.exports = router;