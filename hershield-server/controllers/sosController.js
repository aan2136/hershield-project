// SOS Controller

const triggerSOS = async (req, res) => {
  try {
    const { location, contacts } = req.body;
    res.status(200).json({
      success: true,
      message: "SOS triggered",
      data: { location },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSOSHistory = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "SOS history fetched",
      data: [],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const cancelSOS = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "SOS cancelled",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  triggerSOS,
  getSOSHistory,
  cancelSOS,
};
