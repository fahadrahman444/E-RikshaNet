// Mobile API Client for E-RikshaNet
const host = typeof window !== "undefined" && window.location?.hostname ? window.location.hostname : "192.168.1.101";
export const API_BASE = `http://${host}:5000/api`;

let authToken: string | null = null;

export function setToken(token: string | null) {
  authToken = token;
}

export function getToken(): string | null {
  return authToken;
}

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Network request failed");
  }

  return data;
}

export const mobileApi = {
  login: (phone: string, password = "password123") =>
    request<{ token: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, password }),
    }),
  getMe: () => request<{ user: any }>("/auth/me"),
  toggleDuty: (isOnDuty: boolean, vehicleId?: string) =>
    request<{ message: string; driver: any }>("/drivers/duty", {
      method: "POST",
      body: JSON.stringify({ isOnDuty, vehicleId }),
    }),
  sendPing: (latitude: number, longitude: number, speedKmh = 18.5) =>
    request<{ status: string; isInsideZone: boolean }>("/tracking/ping", {
      method: "POST",
      body: JSON.stringify({ latitude, longitude, speedKmh, recordedAt: new Date().toISOString() }),
    }),
  getZones: () => request<{ zones: any[] }>("/zones"),
  estimateFare: (pickupLat: number, pickupLng: number, dropoffLat: number, dropoffLng: number) =>
    request<{ distanceKm: number; estimatedFare: number; currency: string }>("/trips/estimate", {
      method: "POST",
      body: JSON.stringify({ pickupLat, pickupLng, dropoffLat, dropoffLng }),
    }),
  requestTrip: (params: {
    zoneId: string;
    pickupLat: number;
    pickupLng: number;
    pickupAddress: string;
    dropoffLat: number;
    dropoffLng: number;
    dropoffAddress: string;
  }) =>
    request<{ message: string; trip: any }>("/trips/request", {
      method: "POST",
      body: JSON.stringify(params),
    }),
  getAvailableTrips: () => request<{ trips: any[] }>("/trips/available"),
  acceptTrip: (tripId: string) =>
    request<{ message: string; trip: any }>(`/trips/${tripId}/accept`, { method: "POST" }),
  updateTripStatus: (tripId: string, status: string, finalFare?: number) =>
    request<{ message: string; trip: any }>(`/trips/${tripId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, finalFare }),
    }),
  getMyTrips: () => request<{ trips: any[] }>("/trips/me"),
  getMyViolations: () => request<{ violations: any[] }>("/violations"),
  submitAppeal: (violationId: string, reason: string) =>
    request<{ message: string; appeal: any }>(`/violations/${violationId}/appeal`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
};
