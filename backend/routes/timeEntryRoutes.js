const express = require("express");
const router = express.Router();
const timeEntryController = require("../controllers/timeEntryController");
const { authenticateToken } = require("../middlewares/authMiddleware");

router.get("/", authenticateToken, timeEntryController.getTimeEntries);
router.get("/search", authenticateToken, timeEntryController.searchTimeEntries);
router.get("/summary", authenticateToken, timeEntryController.getSummary);
router.post("/", authenticateToken, timeEntryController.createTimeEntry);
router.delete("/:id", authenticateToken, timeEntryController.deleteTimeEntry);

module.exports = router;