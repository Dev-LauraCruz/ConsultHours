const db = require("../config/db");

exports.getTimeEntries = (req, res) => {
  const rows = db.prepare(`
    SELECT te.*, c.name AS client_name, co.name AS consultant_name
    FROM time_entries te
    JOIN clients c ON c.id = te.client_id
    JOIN consultants co ON co.id = te.consultant_id
    ORDER BY te.date DESC, te.start_time ASC
  `).all();
  res.json(rows);
};

exports.searchTimeEntries = (req, res) => {
  const q = req.query.q || "";
  const rows = db.prepare("SELECT * FROM time_entries WHERE description LIKE ?").all(`%${q}%`);
  res.json(rows);
};

exports.createTimeEntry = (req, res) => {
  const { client_id, date, start_time, end_time, billable, description } = req.body;
  const consultant_id = req.user.id; // Del JWT, nunca del body — evita que un consultor cree registros a nombre de otro.

  // CORREGIDO: la versión anterior tenía dos condiciones OR con parámetros
  // repetidos; la segunda era redundante. Una sola condición basta para
  // detectar cualquier traslape entre [start_time, end_time) del nuevo
  // registro y [start_time, end_time) de uno existente el mismo día:
  //   existente.start < nuevo.end  AND  existente.end > nuevo.start
  //
  // DECISIÓN DE NEGOCIO (documentar en NOTES.md): se RECHAZA el traslape
  // con 400, en vez de solo advertir, porque dos registros facturables
  // traslapados para el mismo consultor duplicarían horas cobradas al
  // cliente (ver el caso real del 6 de agosto en seed.js).
  const overlap = db.prepare(`
    SELECT * FROM time_entries
    WHERE consultant_id = ? AND date = ?
    AND start_time < ? AND end_time > ?
  `).get(consultant_id, date, end_time, start_time);

  if (overlap) {
    return res.status(400).json({ error: "Existe un traslape de horario para este consultor en la misma fecha" });
  }

  const stmt = db.prepare(`
    INSERT INTO time_entries (consultant_id, client_id, date, start_time, end_time, billable, description)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(consultant_id, client_id, date, start_time, end_time, billable ? 1 : 0, description);
  res.status(201).json({ id: result.lastInsertRowid });
};

exports.deleteTimeEntry = (req, res) => {
  // CORREGIDO: antes la ruta restringía este endpoint a requireRole("admin"),
  // así que ningún consultor podía borrar ni sus propios registros. El
  // requisito pide dos niveles: dueño O admin. Esa lógica se movió aquí,
  // al controller, porque depende del dato (¿de quién es el registro?),
  // no solo del rol del usuario.
  const entry = db.prepare("SELECT * FROM time_entries WHERE id = ?").get(req.params.id);

  if (!entry) {
    return res.status(404).json({ error: "Registro no encontrado" });
  }

  const isOwner = entry.consultant_id === req.user.id;
  const isAdmin = req.user.role === "admin";

  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: "No puedes eliminar registros de otro consultor" });
  }

  db.prepare("DELETE FROM time_entries WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
};

exports.getSummary = (req, res) => {
  const { client_id, month, consultant_id } = req.query;

  let targetConsultantId = null;
  if (req.user.role === "admin") {
    if (consultant_id) targetConsultantId = consultant_id;
  } else {
    targetConsultantId = req.user.id;
  }

  // CORREGIDO: Se quita "AND billable = 1" del WHERE para traer todos los registros del mes
  let query = `SELECT * FROM time_entries WHERE client_id = ? AND date LIKE ?`;
  const params = [client_id, `${month}%`];

  if (targetConsultantId) {
    query += ` AND consultant_id = ?`;
    params.push(targetConsultantId);
  }

  const rows = db.prepare(query).all(...params);

  let totalHours = 0;
  rows.forEach((r) => {
    // Solo sumamos el tiempo si el registro es facturable (billable === 1)
    if (r.billable === 1) {
      const [sh, sm] = r.start_time.split(":").map(Number);
      const [eh, em] = r.end_time.split(":").map(Number);
      totalHours += (eh * 60 + em - (sh * 60 + sm)) / 60;
    }
  });

  res.json({
    client_id: Number(client_id),
    month,
    billableHours: Math.round(totalHours * 100) / 100,
    entryCount: rows.length, // Ahora sí reflejará el total real de registros (6)
  });
};