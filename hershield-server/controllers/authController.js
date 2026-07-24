// Auth Controller

const signup = async (req, res) => {
  try {
    const { fullName, email, mobile, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password required" });
    }
    res.status(200).json({ success: true, message: "Signup successful" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP required" });
    }
    res.status(200).json({ success: true, message: "OTP verified" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password required" });
    }
    res.status(200).json({ success: true, message: "Login successful", token: "token" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const uploadVoice = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file" });
    }
    res.status(200).json({ success: true, message: "Voice uploaded" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { signup, verifyOTP, login, uploadVoice };
