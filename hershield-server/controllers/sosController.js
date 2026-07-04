// controllers/sosController.js

const { PrismaClient } = require('@prisma/client');
const { sendSosEmail } = require('../services/emailService');

const prisma = new PrismaClient();

const DEFAULT_REASON = 'Emergency detected';

/**
 * Build a Google Maps link from raw lat/lon values.
 */
const buildMapsLink = (latitude, longitude) =>
  `https://maps.google.com/?q=${latitude},${longitude}`;

/**
 * Current time formatted in Indian Standard Time.
 */
const getIndianTime = () =>
  new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

/**
 * Build the HTML body for the SOS alert email.
 */
const buildEmailHtml = ({ reason, vehicleNumber, time, latitude, longitude, mapsLink }) => `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial, Helvetica, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;background-color:#f4f4f5;">
      <tr>
        <td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #f1c7c7;">
            <tr>
              <td style="background:#dc2626;padding:20px 24px;">
                <h1 style="margin:0;color:#ffffff;font-size:20px;letter-spacing:0.03em;">
                  🚨 HERSHIELD EMERGENCY ALERT
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;color:#1f2937;">
                <p style="margin:0 0 16px;font-size:15px;line-height:1.5;font-weight:bold;">
                  Possible Emergency Detected
                </p>

                <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#1f2937;">
                  <tr>
                    <td style="padding:6px 0;color:#6b7280;width:150px;">Reason:</td>
                    <td style="padding:6px 0;font-weight:bold;">${reason}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#6b7280;">Vehicle Number:</td>
                    <td style="padding:6px 0;font-weight:bold;">${vehicleNumber}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#6b7280;">Time:</td>
                    <td style="padding:6px 0;font-weight:bold;">${time}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#6b7280;">Latitude:</td>
                    <td style="padding:6px 0;font-weight:bold;">${latitude}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#6b7280;">Longitude:</td>
                    <td style="padding:6px 0;font-weight:bold;">${longitude}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#6b7280;">Google Maps:</td>
                    <td style="padding:6px 0;">
                      <a href="${mapsLink}" style="color:#dc2626;font-weight:bold;">${mapsLink}</a>
                    </td>
                  </tr>
                </table>

                <div style="margin-top:24px;text-align:center;">
                  <a href="${mapsLink}"
                     style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;
                            padding:12px 20px;border-radius:999px;font-weight:bold;font-size:14px;">
                    View Live Location
                  </a>
                </div>

                <p style="margin:24px 0 0;font-size:14px;color:#1f2937;text-align:center;">
                  Please contact the user immediately.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

/**
 * POST /api/sos
 * Auth: existing JWT middleware populates req.user.
 * Body: { latitude, longitude, vehicleNumber, reason }
 */
const sendSos = async (req, res) => {
  console.log("========== SOS API HIT ==========");
  console.log("User:", req.user);
  console.log("Body:", req.body);
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const { latitude, longitude, vehicleNumber, reason } = req.body || {};

    if (
      latitude === undefined ||
      latitude === null ||
      latitude === '' ||
      longitude === undefined ||
      longitude === null ||
      longitude === ''
    ) {
      return res.status(400).json({
        success: false,
        message: 'latitude and longitude are required.',
      });
    }

    const contacts = await prisma.emergencyContact.findMany({
      where: {
        userId: userId,
      },
    });

    console.log("Emergency Contacts Found:", contacts.length);
    console.log(
      contacts.map((c) => ({
        name: c.name,
        email: c.email,
      }))
    );

    if (!contacts || contacts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No emergency contacts found',
      });
    }

    const mapsLink = buildMapsLink(latitude, longitude);
    const time = getIndianTime();
    const subject = '🚨 HERSHIELD EMERGENCY ALERT';

    const html = buildEmailHtml({
      reason: reason || DEFAULT_REASON,
      vehicleNumber: vehicleNumber || 'N/A',
      time,
      latitude,
      longitude,
      mapsLink,
    });

    const emailTargets = contacts.filter((contact) => !!contact.email);

    // Send to every emergency contact. A failure on one must not stop the
    // rest — Promise.allSettled guarantees every send is attempted.
    const results = await Promise.allSettled(
      emailTargets.map((contact) =>
        sendSosEmail({ to: contact.email, subject, html })
      )
    );

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        console.log("✅ Email sent:", emailTargets[index].email);
      } else {
        console.error("❌ Email failed:", emailTargets[index].email);
        console.error(result.reason);
      }
    });

    const emailsSent = results.filter((r) => r.status === 'fulfilled').length;

    return res.status(200).json({
      success: true,
      emailsSent,
    });
  } catch (error) {
    console.error('SOS alert error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process SOS alert.',
    });
  }
};

module.exports = { sendSos };