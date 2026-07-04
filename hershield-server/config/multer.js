const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({

  destination(req, file, cb) {
    cb(null, "uploads/voices");
  },

  filename(req, file, cb) {
    cb(
      null,
      Date.now() + path.extname(file.originalname || ".webm")
    );
  },

});

module.exports = multer({ storage });