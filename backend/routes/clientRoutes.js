const express = require("express");
const router = express.Router();
const clientController = require("../controllers/clientController");
const { authenticateToken } = require("../middlewares/authMiddleware");

router.get("/", authenticateToken, clientController.getClients);

module.exports = router;