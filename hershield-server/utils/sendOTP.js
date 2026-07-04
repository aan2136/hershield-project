const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendOTP(email, otp) {
  await transporter.sendMail({
    from: `"HerShield" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "HerShield Email Verification",

    html: `
    <div style="font-family:Arial;padding:20px">

        <h2>Email Verification</h2>

        <p>Your verification code is</p>

        <h1 style="letter-spacing:8px;color:#0891b2">

            ${otp}

        </h1>

        <p>This OTP is valid for 10 minutes.</p>

    </div>
    `,
  });
}

module.exports = sendOTP;