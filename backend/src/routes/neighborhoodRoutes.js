const express = require("express");
const router = express.Router();
const {
  getNeighborhoods,
  getNeighborhood,
  viewMapOwnNeighborhood,
  viewAboutYourNeighborhood,
  viewOtherNeighborhoods,
  updateNeighborhood,
  archivedNeighborhood,
  getArchivedNeighborhoods,
  deleteNeighborhood
} = require("../controllers/neighborhoodController");
const { requireRole } = require("../middleware/authMiddleware");
const { uploadFocalPhotos } = require("../middleware/uploadFocalPhotos");

// CRUD + Archived 
router.get("/archived", getArchivedNeighborhoods);

// For Focal Person
router.get("/map/own", requireRole("focalPerson"), viewMapOwnNeighborhood);
router.get("/map/others", requireRole("focalPerson"), viewOtherNeighborhoods);
router.get("/own", requireRole("focalPerson"), viewAboutYourNeighborhood);


router.get("/", getNeighborhoods);
router.get("/:id", getNeighborhood);
router.put("/:id", uploadFocalPhotos, updateNeighborhood);
router.delete("/:id", archivedNeighborhood);
router.delete("/:id/permanent", deleteNeighborhood);

// Upload alternative focal person photo
router.post("/:id/alt-photo", uploadFocalPhotos, requireRole("focalPerson"), require("../controllers/neighborhoodController").uploadAltFocalPhoto);

// Get alternative focal person photo (returns image blob)
router.get("/:id/alt-photo", requireRole("focalPerson"), require("../controllers/neighborhoodController").getAltFocalPhoto);

// Delete alternative focal person photo
router.delete("/:id/alt-photo", requireRole("focalPerson"), require("../controllers/neighborhoodController").deleteAltFocalPhoto);


module.exports = router;