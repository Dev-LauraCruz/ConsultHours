const express = require("express");
const router = express.Router();
const timeEntryController = require("../controllers/timeEntryController");
const { authenticateToken } = require("../middlewares/authMiddleware");

router.get("/", authenticateToken, timeEntryController.getTimeEntries);
router.get("/search", authenticateToken, timeEntryController.searchTimeEntries);
router.get("/summary", authenticateToken, timeEntryController.getSummary);
router.post("/", authenticateToken, timeEntryController.createTimeEntry);
// CORREGIDO: antes tenía requireRole("admin") aquí, así que un consultor no
// podía borrar ni sus propios registros. La validación dueño-o-admin ahora
// vive en el controller porque necesita comparar contra el dueño del registro.
router.delete("/:id", authenticateToken, timeEntryController.deleteTimeEntry);

module.exports = router;