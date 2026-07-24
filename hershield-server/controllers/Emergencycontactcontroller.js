// Emergency Contact Controller

const getEmergencyContacts = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "Emergency contacts fetched",
      data: [],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const addEmergencyContact = async (req, res) => {
  try {
    const { name, phone, email, relation } = req.body;
    res.status(200).json({
      success: true,
      message: "Emergency contact added",
      data: { name, phone, email, relation },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateEmergencyContact = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "Emergency contact updated",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteEmergencyContact = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "Emergency contact deleted",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getEmergencyContacts,
  addEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
};
