import { io, Socket } from "socket.io-client";

const getHost = (): string => {
  if (typeof window !== "undefined" && window.location?.hostname) {
    return window.location.hostname;
  }
  return "localhost";
};

export const SERVER_HOST = getHost();
export const API_BASE = `http://${SERVER_HOST}:5000/api`;
export const WS_BASE = `http://${SERVER_HOST}:5000`;

const TOKEN_STORAGE_KEY = "erikshanet_passenger_token";
const USER_STORAGE_KEY = "erikshanet_passenger_user";

let authToken: string | null = null;
let currentUser: any = null;

if (typeof localStorage !== "undefined") {
  try {
    authToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    const savedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (savedUser) currentUser = JSON.parse(savedUser);
  } catch (e) {
    console.warn("Storage init warning:", e);
  }
}

export function setSession(token: string | null, user: any = null) {
  authToken = token;
  currentUser = user;
  if (typeof localStorage !== "undefined") {
    try {
      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
        if (user) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    } catch (e) {
      console.warn("Storage write error:", e);
    }
  }
}

export function getAuthToken(): string | null {
  return authToken;
}

export function getCurrentUser(): any {
  return currentUser;
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

let socket: Socket | null = null;

export function getPassengerSocket(): Socket {
  if (!socket) {
    socket = io(WS_BASE, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
  }
  return socket;
}

export const passengerApi = {
  login: async (phone: string, password = "password123") => {
    const res = await request<{ token: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, password }),
    });
    setSession(res.token, res.user);
    return res;
  },

  logout: () => {
    setSession(null, null);
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  getMe: () => request<{ user: any }>("/auth/me"),

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

  getMyTrips: () => request<{ trips: any[] }>("/trips/me"),

  updateTripStatus: (tripId: string, status: string, cancellationReason?: string) =>
    request<{ message: string; trip: any }>(`/trips/${tripId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, cancellationReason }),
    }),
};
