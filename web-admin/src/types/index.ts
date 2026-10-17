export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: string;
}

export interface Zone {
  id: string;
  name: string;
  city: string;
  wardNumber: string;
  polygonGeoJson: string;
  speedLimitKmh: number;
  maxPermittedVehicles: number;
}

export interface LiveDriver {
  driverId: string;
  name: string;
  phone: string;
  lat: number | null;
  lng: number | null;
  lastPingAt: string | null;
  isStale: boolean;
  permits: Array<{
    permitNumber: string;
    zoneName: string;
    wardNumber: string;
  }>;
  currentVehicle?: {
    registrationNumber: string;
    model: string;
  };
}

export interface Permit {
  id: string;
  permitNumber: string;
  driverId: string;
  driver: {
    user: {
      name: string;
      phone: string;
    };
  };
  vehicle: {
    registrationNumber: string;
    model: string;
  };
  zone: {
    id: string;
    name: string;
    wardNumber: string;
  };
  status: string;
  effectiveDate?: string;
  expiryDate?: string;
  issuedBy?: {
    name: string;
    role: string;
  };
  decisionNotes?: string;
  createdAt: string;
}

export interface DriverRecord {
  id: string;
  nidNumber: string;
  licenseNumber?: string;
  status: string;
  reviewNotes?: string;
  user: {
    name: string;
    phone: string;
    email?: string;
  };
  driverVehicleLinks: Array<{
    vehicle: {
      registrationNumber: string;
      model: string;
    };
  }>;
  createdAt: string;
}

export interface VehicleRecord {
  id: string;
  registrationNumber: string;
  chassisNumber: string;
  model: string;
  batteryCapacityKwh?: number;
  status: string;
  reviewNotes?: string;
  owner: {
    name: string;
    phone: string;
  };
  createdAt: string;
}

export interface ViolationCase {
  id: string;
  caseNumber: string;
  category: string;
  evidenceJson: string;
  status: string;
  officerNotes?: string;
  penaltyAmount?: number;
  driver: {
    user: {
      name: string;
      phone: string;
    };
  };
  zone?: {
    name: string;
  };
  appeals: Array<{
    id: string;
    reason: string;
    status: string;
    reviewerNotes?: string;
  }>;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  user?: {
    name: string;
    role: string;
  };
  createdAt: string;
}
