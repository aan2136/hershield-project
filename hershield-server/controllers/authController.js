const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");
const otpGenerator = require("otp-generator");

const sendOTP = require("../utils/sendOTP");

exports.signup = async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
    } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Check if user already exists

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Generate OTP

    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });

    // Hash Password

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    // Delete previous OTP if exists

    await prisma.oTP.deleteMany({
      where: {
        email,
      },
    });

    // Save OTP

    await prisma.oTP.create({
      data: {
        email,
        otp,

        fullName,

        password: hashedPassword,

        expiresAt: new Date(
          Date.now() + 10 * 60 * 1000
        ),
      },
    });

    // Send OTP Mail

    await sendOTP(email, otp);

    return res.status(200).json({
      success: true,
      message: "OTP Sent Successfully",
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const otpRecord = await prisma.oTP.findUnique({
      where: {
        email,
      },
    });

    if (!otpRecord) {
      return res.status(404).json({
        success: false,
        message: "OTP not found",
      });
    }

    if (otpRecord.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    if (otpRecord.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    const user = await prisma.user.create({
      data: {
        fullName: otpRecord.fullName,
        email: otpRecord.email,
        password: otpRecord.password,
        isVerified: true,
      },
    });

    await prisma.oTP.delete({
      where: {
        email,
      },
    });

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      token,
      user,
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};
exports.login = async (req, res) => {
  try {

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and Password are required",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const matched = await bcrypt.compare(
      password,
      user.password
    );

    if (!matched) {
      return res.status(400).json({
        success: false,
        message: "Incorrect Password",
      });
    }

    const token = jwt.sign(
  {
    id: user.id,
    email: user.email,
  },
  process.env.JWT_SECRET,
  {
    expiresIn: "7d",
  }
);

return res.status(200).json({
  success: true,
  message: "Login Successful",
  token,
  user,
});

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};
exports.uploadVoice = async (req, res) => {

  try {

    const { email } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Voice file missing",
      });
    }

    await prisma.user.update({
      where: {
        email,
      },
      data: {
        voicePath: req.file.path,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Voice uploaded successfully",
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });

  }

};
