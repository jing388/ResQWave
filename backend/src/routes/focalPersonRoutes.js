const express = require("express");
// removed unused multer variable
const router = express.Router();

const {
    createFocalPerson,
    approveFocalRegistration,
    getFocalPerson,
    getFocalPersons,
    updateFocalPerson,
    updateFocalPhotos,
    getFocalPhoto,
    getAlternativeFocalPhoto,
    deleteFocalPhoto,
    changePassword,
} = require("../controllers/focalPersonController");

const { uploadFocalPhotos } = require("../middleware/uploadFocalPhotos");


// CRUD
router.post("/", uploadFocalPhotos, createFocalPerson);
router.post("/:id/approve", approveFocalRegistration);
router.get("/", getFocalPersons);
router.get("/:id", getFocalPerson);
router.get("/:id/photo", getFocalPhoto);
router.get("/:id/altPhoto", getAlternativeFocalPhoto);
router.delete("/:id/photo", deleteFocalPhoto);
router.put("/:id", updateFocalPerson);
router.put("/me/changePassword", changePassword);
router.put("/:id/changePassword", changePassword);
router.put("/:id/photos", uploadFocalPhotos, updateFocalPhotos);


module.exports = router;