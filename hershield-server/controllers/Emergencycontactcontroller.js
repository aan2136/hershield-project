const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
/**
 * POST /api/emergency-contacts
 * Auth: existing JWT middleware populates req.user.
 * Body: [{ name, relation, phone, email }, ...] (exactly 3 contacts)
 */
exports.createEmergencyContacts = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    const contacts = req.body;

    if (!Array.isArray(contacts) || contacts.length !== 3) {
      return res.status(400).json({
        success: false,
        message: "Exactly 3 emergency contacts are required",
      });
    }

    const isValidContact = (contact) =>
      contact &&
      typeof contact === "object" &&
      contact.name &&
      contact.relation &&
      contact.phone &&
      contact.email;

    if (!contacts.every(isValidContact)) {
      return res.status(400).json({
        success: false,
        message:
          "Each emergency contact must include name, relation, phone, and email",
      });
    }

    await prisma.emergencyContact.createMany({
      data: contacts.map((contact) => ({
        userId,
        name: contact.name,
        relation: contact.relation,
        phone: contact.phone,
        email: contact.email,
      })),
    });

    return res.status(200).json({
      success: true,
      message: "Emergency contacts saved successfully",
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};