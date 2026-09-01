const db = require("../config/db");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "consulthours-super-secret-2024";

exports.login = (req, res) => {
  const { username, password } = req.body;

  // Consulta parametrizada — previene inyección SQL.
  const consultant = db.prepare("SELECT * FROM consultants WHERE username = ? AND password = ?").get(username, password);

  if (!consultant) {
    return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
  }

  const token = jwt.sign(
    { id: consultant.id, username: consultant.username, role: consultant.role },
    JWT_SECRET,
    { expiresIn: "2h" }
  );

  res.json({
    token,
    user: { id: consultant.id, username: consultant.username, role: consultant.role, name: consultant.name }
  });
};