const db = require("../config/db");

exports.getClients = (req, res) => {
  const clients = db.prepare("SELECT * FROM clients").all();
  res.json(clients);
};