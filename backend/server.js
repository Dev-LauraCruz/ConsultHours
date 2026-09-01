const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// Importar Rutas
const authRoutes = require("./routes/authRoutes");
const clientRoutes = require("./routes/clientRoutes");
const timeEntryRoutes = require("./routes/timeEntryRoutes");

// Registrar Endpoints
app.use("/api", authRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/time-entries", timeEntryRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor ConsultHours corriendo en http://localhost:${PORT}`);
});