const express = require("express");
const router = express.Router();
const {
    createTerminal,
    getNextTerminalId,
    getOnlineTerminals,
    getOfflineTerminals,
    getTerminals,
    getTerminal,
    updateTerminal,
    archivedTerminal,
    getArchivedTerminals,
    unarchiveTerminal,
    permanentDeleteTerminal,
    getTerminalsForMap
} = require("../controllers/terminalController");

// CRUD + Archived
router.get("/next-id", getNextTerminalId);
router.post("/", createTerminal);
router.get("/", getTerminals);
router.get("/archived", getArchivedTerminals);
router.get("/map", getTerminalsForMap);
router.get("/online", getOnlineTerminals);
router.get("/offline", getOfflineTerminals);
router.get("/:id", getTerminal);
router.put("/:id", updateTerminal);
router.patch("/:id", unarchiveTerminal);
router.delete("/:id", archivedTerminal);
router.delete("/:id/permanent", permanentDeleteTerminal);

module.exports = router;