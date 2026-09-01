const API_URL = "http://localhost:4000/api";

export type Client = { id: number; name: string };

export type TimeEntry = {
  id: number;
  consultant_id: number;
  client_id: number;
  client_name?: string;
  consultant_name?: string;
  date: string;
  start_time: string;
  end_time: string;
  billable: 0 | 1;
  description: string;
};

export type LoginResponse = {
  token: string;
  user: { id: number; username: string; role: string; name: string };
};

export type SummaryResponse = {
  client_id: number;
  month: string;
  billableHours: number;
  entryCount: number;
};

function getHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error("Credenciales inválidas");
  const data = await res.json();
  localStorage.setItem("token", data.token);
  return data;
}

export async function getClients(): Promise<Client[]> {
  const res = await fetch(`${API_URL}/clients`, { headers: getHeaders() });
  return res.json();
}

export async function getTimeEntries(): Promise<TimeEntry[]> {
  const res = await fetch(`${API_URL}/time-entries`, { headers: getHeaders() });
  return res.json();
}

export async function createTimeEntry(input: Omit<TimeEntry, "id" | "consultant_id">): Promise<{ id: number }> {
  const res = await fetch(`${API_URL}/time-entries`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || "Error al crear entrada");
  }
  return res.json();
}

export async function deleteTimeEntry(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/time-entries/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("No tienes autorización para eliminar este registro");
}

export async function searchTimeEntries(q: string): Promise<TimeEntry[]> {
  const res = await fetch(`${API_URL}/time-entries/search?q=${encodeURIComponent(q)}`, {
    headers: getHeaders(),
  });
  return res.json();
}

export async function getSummary(clientId: number, month: string): Promise<SummaryResponse> {
  const res = await fetch(`${API_URL}/time-entries/summary?client_id=${clientId}&month=${month}`, {
    headers: getHeaders(),
  });
  return res.json();
}