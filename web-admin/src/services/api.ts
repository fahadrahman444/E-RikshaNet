const API_BASE = "http://localhost:5000/api";

export function getAuthToken(): string | null {
  return localStorage.getItem("erikshanet_token");
}

export function setAuthToken(token: string): void {
  localStorage.setItem("erikshanet_token", token);
}

export function removeAuthToken(): void {
  localStorage.removeItem("erikshanet_token");
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "API Request failed");
  }

  return data;
}

export const api = {
  // Auth
  login: (phone: string, password = "password123") =>
    request<{ token: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, password }),
    }),
  getMe: () => request<{ user: any }>("/auth/me"),

  // Zones
  getZones: () => request<{ zones: any[] }>("/zones"),

  // Tracking
  getLiveFleet: () => request<{ drivers: any[] }>("/tracking/live"),

  // Permits
  getPermits: (status?: string) =>
    request<{ permits: any[] }>(`/permits${status ? `?status=${status}` : ""}`),
  decidePermit: (id: string, status: string, decisionNotes: string, validityDays = 180) =>
    request<{ permit: any }>(`/permits/${id}/decision`, {
      method: "PATCH",
      body: JSON.stringify({ status, decisionNotes, validityDays }),
    }),

  // Registrations (Drivers & Vehicles)
  getDrivers: (status?: string) =>
    request<{ drivers: any[] }>(`/drivers${status ? `?status=${status}` : ""}`),
  reviewDriver: (id: string, status: string, reviewNotes: string) =>
    request<{ driver: any }>(`/drivers/${id}/review`, {
      method: "PATCH",
      body: JSON.stringify({ status, reviewNotes }),
    }),
  getVehicles: () => request<{ vehicles: any[] }>("/vehicles"),
  reviewVehicle: (id: string, status: string, reviewNotes: string) =>
    request<{ vehicle: any }>(`/vehicles/${id}/review`, {
      method: "PATCH",
      body: JSON.stringify({ status, reviewNotes }),
    }),

  // Violations & Appeals
  getViolations: (status?: string) =>
    request<{ violations: any[] }>(`/violations${status ? `?status=${status}` : ""}`),
  issueNotice: (id: string, status: string, officerNotes: string, penaltyAmount: number) =>
    request<{ violation: any }>(`/violations/${id}/notice`, {
      method: "PATCH",
      body: JSON.stringify({ status, officerNotes, penaltyAmount }),
    }),
  decideAppeal: (appealId: string, status: string, reviewerNotes: string) =>
    request<{ appeal: any }>(`/violations/appeals/${appealId}/decision`, {
      method: "PATCH",
      body: JSON.stringify({ status, reviewerNotes }),
    }),

  // Audit Logs
  getAuditLogs: () => request<{ logs: any[] }>("/audit"),
};
