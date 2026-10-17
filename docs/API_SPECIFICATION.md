# E-RikshaNet — REST API Specification

Base URL: `http://localhost:5000/api` (or `http://<LAN_IP>:5000/api`)  
Authentication: HTTP Bearer Token (`Authorization: Bearer <JWT_TOKEN>`)

---

## 1. Authentication & Identity (`/auth`)

### 1.1 Register User / Driver / Owner
- **Endpoint**: `POST /auth/register`
- **Auth**: Public
- **Request Body**:
  ```json
  {
    "name": "Md. Rafiqul Islam",
    "phone": "01700000007",
    "password": "password123",
    "role": "DRIVER",
    "email": "driver@erikshanet.gov.bd",
    "nidNumber": "19922691234567890",
    "licenseNumber": "DL-DH-88219",
    "emergencyContact": "01711223344"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "message": "Registration successful",
    "token": "eyJhbGciOi...",
    "user": { "id": "...", "name": "...", "phone": "...", "role": "DRIVER" }
  }
  ```

### 1.2 User Login
- **Endpoint**: `POST /auth/login`
- **Auth**: Public
- **Request Body**:
  ```json
  {
    "phone": "01700000001",
    "password": "password123"
  }
  ```
- **Response**: `200 OK` with JWT token and profile.

### 1.3 Get Current Profile
- **Endpoint**: `GET /auth/me`
- **Auth**: Bearer token required

---

## 2. Operating Zones (`/zones`)

### 2.1 List Active Zones
- **Endpoint**: `GET /zones`
- **Auth**: Public
- **Response**: `200 OK`
  ```json
  {
    "zones": [
      {
        "id": "zone-dhaka-ward-7",
        "name": "Mirpur Ward 7 Pilot Zone",
        "wardNumber": "07",
        "polygonGeoJson": "[[90.355,23.805],[90.375,23.805],...]",
        "speedLimitKmh": 25,
        "maxPermittedVehicles": 200,
        "isActive": true
      }
    ]
  }
  ```

### 2.2 Create Operating Zone
- **Endpoint**: `POST /zones`
- **Auth**: `ADMIN` role required

---

## 3. Permits (`/permits`)

### 3.1 Apply for Ward Permit
- **Endpoint**: `POST /permits/apply`
- **Auth**: `DRIVER` role required
- **Preconditions (FR-08)**: Driver registration approved, vehicle approved and linked.
- **Request Body**:
  ```json
  {
    "zoneId": "zone-dhaka-ward-7",
    "vehicleId": "<VEHICLE_UUID>"
  }
  ```

### 3.2 List Permits
- **Endpoint**: `GET /permits`
- **Auth**: Authenticated (Drivers see own permits; Officers see full queue)
- **Query Params**: `status`, `zoneId`

### 3.3 Permit Officer Decision
- **Endpoint**: `PATCH /permits/:id/decision`
- **Auth**: `ADMIN` or `PERMIT_OFFICER`
- **Request Body**:
  ```json
  {
    "status": "ACTIVE",
    "decisionNotes": "Physical documents verified at Ward 7 regulatory desk.",
    "validityDays": 180
  }
  ```

---

## 4. Telemetry & Geofencing (`/tracking`)

### 4.1 Ingest GPS Ping
- **Endpoint**: `POST /tracking/ping`
- **Auth**: `DRIVER` role required (must be `isOnDuty: true`)
- **Request Body**:
  ```json
  {
    "latitude": 23.8152,
    "longitude": 90.3654,
    "speedKmh": 18.2,
    "accuracyMeters": 4.5,
    "recordedAt": "2026-10-17T07:15:00.000Z"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "status": "OK",
    "isInsideZone": true,
    "reportId": "<LOCATION_REPORT_UUID>"
  }
  ```
  *Note: If `isInsideZone === false`, an audit candidate record (`CANDIDATE_REVIEW`) is automatically logged.*

### 4.2 Live Fleet Coordinates
- **Endpoint**: `GET /tracking/live`
- **Auth**: Authority Officers (`ADMIN`, `PERMIT_OFFICER`, `ENFORCEMENT_OFFICER`, `REGISTRATION_REVIEWER`)
- **Response**: List of on-duty drivers with last coordinates and `isStale` boolean flag.

---

## 5. Violations & Appeals (`/violations`)

### 5.1 List Violations
- **Endpoint**: `GET /violations`
- **Auth**: Authenticated

### 5.2 Enforcement Officer Decision
- **Endpoint**: `PATCH /violations/:id/notice`
- **Auth**: `ADMIN` or `ENFORCEMENT_OFFICER`
- **Request Body**:
  ```json
  {
    "status": "NOTICE_ISSUED",
    "officerNotes": "Verified GPS breadcrumbs show persistent driving 600m outside ward boundary.",
    "penaltyAmount": 500
  }
  ```

### 5.3 Driver Legal Appeal
- **Endpoint**: `POST /violations/:id/appeal`
- **Auth**: `DRIVER`
- **Request Body**:
  ```json
  {
    "reason": "Passenger emergency detour caused brief crossing of ward perimeter."
  }
  ```

### 5.4 Appeals Reviewer Ruling
- **Endpoint**: `PATCH /violations/appeals/:appealId/decision`
- **Auth**: `ADMIN` or `APPEALS_REVIEWER`
- **Request Body**:
  ```json
  {
    "status": "APPROVED_DISMISSED",
    "reviewerNotes": "Medical emergency statement corroborated by passenger record. Penalty waived."
  }
  ```

---

## 6. Ride Booking & Dispatch (`/trips`)

### 6.1 Estimate Fare
- **Endpoint**: `POST /trips/estimate`
- **Auth**: Public
- **Request Body**: `{ "pickupLat": 23.807, "pickupLng": 90.368, "dropoffLat": 23.818, "dropoffLng": 90.365 }`
- **Response**: `{ "distanceKm": 1.42, "estimatedFare": 46, "currency": "BDT" }`

### 6.2 Request Ride
- **Endpoint**: `POST /trips/request`
- **Auth**: `PASSENGER`
- **Request Body**:
  ```json
  {
    "zoneId": "zone-dhaka-ward-7",
    "pickupLat": 23.807,
    "pickupLng": 90.368,
    "pickupAddress": "Mirpur-10 Roundabout",
    "dropoffLat": 23.818,
    "dropoffLng": 90.365,
    "dropoffAddress": "Mirpur-11 Bus Stand"
  }
  ```

### 6.3 Accept Ride
- **Endpoint**: `POST /trips/:id/accept`
- **Auth**: `DRIVER` (Must hold active permit for the trip's zone)

### 6.4 Update Trip Status
- **Endpoint**: `PATCH /trips/:id/status`
- **Auth**: Authenticated
- **Allowed Transitions**: `REQUESTED` ➔ `ACCEPTED` ➔ `ARRIVING` ➔ `IN_PROGRESS` ➔ `COMPLETED` | `CANCELLED`

---

## 7. Regulatory Audit Logs (`/audit`)

- **Endpoint**: `GET /audit`
- **Auth**: `ADMIN`, `PERMIT_OFFICER`, `ENFORCEMENT_OFFICER`
- **Query Params**: `entityType`, `entityId`, `limit`
- **Response**: Chronological append-only ledger entries containing timestamp, actor ID, action name, and JSON diff.
