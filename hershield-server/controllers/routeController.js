// Route Controller

const getRoutes = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "Routes fetched",
      data: [],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createRoute = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "Route created",
      data: {},
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateRoute = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "Route updated",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteRoute = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "Route deleted",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getRoutes,
  createRoute,
  updateRoute,
  deleteRoute,
};

