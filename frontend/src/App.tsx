import { useEffect, useState, type FormEvent } from "react";
import { 
  getTimeEntries, getClients, login, createTimeEntry, deleteTimeEntry, 
  searchTimeEntries, getSummary, type TimeEntry, type Client, type SummaryResponse 
} from "./api";
import "./App.css";

function App() {
  const [user, setUser] = useState<{ id: number; username: string; role: string; name: string } | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // Búsqueda y Resumen
  const [searchQuery, setSearchQuery] = useState("");
  const [summaryClientId, setSummaryClientId] = useState("");
  const [summaryMonth, setSummaryMonth] = useState("");
  const [summaryData, setSummaryData] = useState<SummaryResponse | null>(null);

  const [form, setForm] = useState({
    client_id: "",
    date: "",
    start_time: "",
    end_time: "",
    billable: true,
    description: "",
  });

  const loadData = async () => {
    try {
      const [entriesData, clientsData] = await Promise.all([getTimeEntries(), getClients()]);
      setEntries(entriesData);
      setClients(clientsData);
    } catch (err) {
      console.error("Error al cargar datos", err);
    }
  };

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError("");
    try {
      const data = await login(username, password);
      setUser(data.user);
    } catch {
      setLoginError("Usuario o contraseña incorrectos");
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!form.client_id || !form.date || !form.start_time || !form.end_time) {
      alert("Completa cliente, fecha, hora de inicio y hora de fin antes de agregar.");
      return;
    }
    try {
      await createTimeEntry({
        client_id: Number(form.client_id),
        date: form.date,
        start_time: form.start_time,
        end_time: form.end_time,
        billable: form.billable ? 1 : 0,
        description: form.description,
      });
      setForm({ client_id: "", date: "", start_time: "", end_time: "", billable: true, description: "" });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleDelete(entry: TimeEntry) {
    try {
      await deleteTimeEntry(entry.id);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) {
      loadData();
      return;
    }
    const results = await searchTimeEntries(searchQuery);
    setEntries(results);
  }

  async function handleFetchSummary(e: FormEvent) {
    e.preventDefault();
    if (!summaryClientId || !summaryMonth) return;
    const summary = await getSummary(Number(summaryClientId), summaryMonth);
    setSummaryData(summary);
  }

  return (
    <div className="app">
      <header>
        <h1>ConsultHours</h1>
        {user ? (
          <span className="user-pill">{user.name} · {user.role}</span>
        ) : (
          <span className="user-pill muted">sin sesión</span>
        )}
      </header>

      {!user ? (
        <form className="login-form" onSubmit={handleLogin}>
          <h2>Iniciar sesión</h2>
          <input placeholder="usuario" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input placeholder="contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="submit">Entrar</button>
          {loginError && <p className="error">{loginError}</p>}
        </form>
      ) : (
        <>
          <section className="search-bar">
            <form onSubmit={handleSearch}>
              <input 
                placeholder="Buscar por descripción..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
              />
              <button type="submit">Buscar</button>
            </form>
          </section>

          <section className="summary">
            <h3>Resumen Mensual Facturable</h3>
            <form onSubmit={handleFetchSummary}>
              <select value={summaryClientId} onChange={(e) => setSummaryClientId(e.target.value)}>
                <option value="">Seleccionar cliente...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <input type="month" value={summaryMonth} onChange={(e) => setSummaryMonth(e.target.value)} />
              <button type="submit">Calcular</button>
            </form>
            {summaryData && (
              <div className="summary-result">
                <p>Horas facturables: <strong>{summaryData.billableHours} hrs</strong></p>
                <p>Total de registros: <strong>{summaryData.entryCount}</strong></p>
                {user.role !== "admin" && (
                  <p className="hint">Este resumen solo incluye tus propias horas.</p>
                )}
              </div>
            )}
          </section>

          <section className="entry-list">
            <h2>Registros de horas</h2>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Consultor</th>
                  <th>Cliente</th>
                  <th>Horario</th>
                  <th>Facturable</th>
                  <th>Descripción</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td>{e.date}</td>
                    <td>{e.consultant_name}</td>
                    <td>{e.client_name}</td>
                    <td>{e.start_time}–{e.end_time}</td>
                    <td>{e.billable ? "Sí" : "No"}</td>
                    <td>{e.description}</td>
                    <td>
                      {/* CORREGIDO: antes solo el admin veía el botón de eliminar.
                          Ahora también aparece si el registro es del propio consultor,
                          consistente con la autorización dueño-o-admin del backend. */}
                      {(user.role === "admin" || e.consultant_id === user.id) && (
                        <button onClick={() => handleDelete(e)}>Eliminar</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="new-entry">
            <h2>Registrar horas</h2>
            <form onSubmit={handleCreate}>
              <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
                <option value="">cliente…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              <input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
              <label className="checkbox">
                <input type="checkbox" checked={form.billable} onChange={(e) => setForm({ ...form, billable: e.target.checked })} />
                Facturable
              </label>
              <input placeholder="descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <button type="submit">Agregar</button>
            </form>
          </section>
        </>
      )}
    </div>
  );
}

export default App;