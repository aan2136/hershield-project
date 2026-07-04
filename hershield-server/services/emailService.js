// services/emailService.js

const nodemailer = require("nodemailer");

/**
 * Uses the SAME Gmail configuration as the OTP mailer.
 *
 * Required .env
 *
 * EMAIL_USER=yourgmail@gmail.com
 * EMAIL_PASS=your_16_character_app_password
 */

let transporter = null;

const getTransporter = () => {
  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  return transporter;
};

const sendSosEmail = async ({ to, subject, html }) => {
  if (!to) {
    throw new Error('Recipient email is required.');
  }

  const mailer = getTransporter();

  try {
    await mailer.verify();
    console.log('Email server connected.');

    const info = await mailer.sendMail({
      from: `"HerShield" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log('Email sent to:', to);
    return info;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

getTransporter().verify(function (error, success) {
  if (error) {
    console.error("SMTP ERROR:");
    console.error(error);
  } else {
    console.log("✅ Gmail SMTP Connected");
  }
});

module.exports = {
  sendSosEmail,
  getTransporter,
};