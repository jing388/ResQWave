const multer = require("multer");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  console.log("Multer received file:", file.originalname, file.mimetype);
  const ok = ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
  if (!ok) return cb(new Error("Only JPEG, PNG, WEBP images are allowed"));
  cb(null, true);
};

// File size limit: 2MB to match database max_allowed_packet configuration
const limits = { fileSize: 2 * 1024 * 1024 };

const uploadFocalPhotos = multer({ 
  storage, 
  fileFilter, 
  limits 
}).fields([
  { name: "photo", maxCount: 1 },
  { name: "altPhoto", maxCount: 1 },
  { name: "alternativeFPImage", maxCount: 1 },
]);

// Add error handling wrapper
const uploadFocalPhotosWithErrorHandling = (req, res, next) => {
  uploadFocalPhotos(req, res, (err) => {
    if (err) {
      console.error("Multer error:", err);
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: "File too large. Maximum size is 5MB." });
        }
        return res.status(400).json({ message: `Upload error: ${err.message}` });
      }
      return res.status(500).json({ message: `Server error during upload: ${err.message}` });
    }
    next();
  });
};

const uploadSinglePhoto = multer({ storage, fileFilter, limits }).single("photo");

module.exports = { uploadFocalPhotos: uploadFocalPhotosWithErrorHandling, uploadSinglePhoto };
