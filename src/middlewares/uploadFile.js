const multer = require("multer");

const storeage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "src/uploads");
  },

  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname.replace(/\s/g, ""));
  },
});

const upload = multer({
  storage: storeage,
});

module.exports = upload;
