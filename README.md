# E-RikshaNet (ই-রিকশানেট)

> A digital regulatory and dispatch platform to register, authorize, monitor, and manage electric rickshaws and their drivers within designated local areas in Bangladesh, paired with an authorized passenger ride-booking service.

Read the complete [Product Requirements Document (PRD.md)](./PRD.md).

### 📚 Documentation Suite
- 🏗️ **[System Architecture & Workflow Specification](./docs/ARCHITECTURE.md)**
- 🔌 **[REST API Specification](./docs/API_SPECIFICATION.md)**
- 🗄️ **[Database Schema & ER Diagram](./docs/DATABASE_SCHEMA.md)**
- 🧭 **[Pilot Operations & Demonstration Guide](./docs/PILOT_OPERATIONS_GUIDE.md)**

---

## 🏛️ System Architecture

```text
E-RikshaNet/
├── PRD.md                # Complete Product Requirements Document v1.0
├── server/               # Node.js + Express + TypeScript + Prisma + Socket.io (Port 5000)
│   ├── src/
│   │   ├── config/       # Database & environment configuration
│   │   ├── modules/      # Auth, Drivers, Vehicles, Permits, Zones, Tracking, Violations, Trips, Audit
│   │   ├── middlewares/  # RBAC, JWT, Append-Only Audit Logger
│   │   └── utils/        # Geofencing Point-in-Polygon & Haversine distance calculations
│   └── prisma/
│       ├── schema.prisma # Relational SQLite/PostgreSQL schema
│       └── seed.ts       # Pilot zone, seeded authority, driver, and passenger test accounts
├── web-admin/            # React + Vite + Tailwind CSS + Leaflet Dashboard (Port 3000)
│   └── src/
│       ├── pages/LiveMap.tsx        # Real-time fleet tracking map with stale-status pills
│       ├── pages/Permits.tsx        # Officer permit review & issuance workflow
│       ├── pages/Registrations.tsx  # Driver NID & vehicle verification
│       ├── pages/Violations.tsx     # Candidate geofence breach review & legal appeals
│       └── pages/AuditLogs.tsx      # Immutable append-only regulatory audit trail
└── mobile-app/           # React Native (Expo) Mobile App for Drivers & Passengers
    └── src/
        ├── screens/DriverScreen.tsx    # On-duty switch, GPS telemetry simulator, ride accept, appeal
        └── screens/PassengerScreen.tsx # Ward pickup/dropoff selector, fare estimator, live tracking
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18+ (v22 recommended)
- **npm**: v10+

### 2. Setup Database & Seed Initial Pilot Data
```bash
# Push Prisma schema and seed Mirpur Ward 7 pilot accounts
cd server
npm install
npm run prisma:push
npm run prisma:seed
```

### 3. Run the Backend Server
```bash
npm run dev
# Running on http://localhost:5000 (API & WebSockets ready)
```

### 4. Run the Web Authority Dashboard
In a new terminal:
```bash
cd web-admin
npm install
npm run dev
# Dashboard running on http://localhost:3000
```

### 5. Run the Mobile App (Driver & Passenger)
In a new terminal:
```bash
cd mobile-app
npm install
npm run start
# Supports Expo Go, Web, Android Emulator, and iOS Simulator
```

---

## 👥 Seeded Pilot Accounts

All accounts share the default test password: `password123`

| Role | Phone | Name | Access Scope |
| --- | --- | --- | --- |
| **System Admin** | `01700000001` | Tariqul Islam | Operating zones, full audit trail, system config |
| **Registration Reviewer** | `01700000002` | Farhana Akter | Verifies driver NIDs and vehicle registration ownership |
| **Permit Officer** | `01700000003` | Mahmud Hasan | Issues, suspends, or revokes local ward operating permits |
| **Enforcement Officer** | `01700000004` | Inspector K. Rahman | Reviews candidate geofence breaches, issues formal notices |
| **Appeals Reviewer** | `01700000005` | Barrister S. Chowdhury | Independent legal appeal rulings and fine dismissals |
| **Fleet Owner** | `01700000006` | Haji Nurul Alam | Registers rickshaw vehicles, links authorized drivers |
| **Driver (Permitted)** | `01700000007` | Md. Rafiqul Islam | Mirpur Ward 7 active permit, on-duty GPS reporting, rides |
| **Passenger** | `01700000008` | Sharmin Sultana | Books rides within designated ward, views fare estimate |

---

## 🛡️ Core Business Rules Implemented

- **BR-02 & BR-04 (Eligibility Gating):** Drivers cannot toggle on-duty or accept passenger rides without an approved registration and an active, unexpired ward permit.
- **BR-06 (No Automatic Fines):** GPS coordinate pings outside designated boundaries generate reviewable candidate events (`CANDIDATE_REVIEW`), not automatic fines. Human enforcement review is enforced.
- **BR-09 & BR-11 (Immutable Audit Trail):** Every permit state change, verification decision, notice issuance, and appeal ruling records the actor, timestamp, and mandatory notes in an append-only audit log.
- **BR-12 (Configurable Ward Geofences):** Ward polygons and fares are stored as GeoJSON coordinates, enabling dynamic boundary updates without code changes.

---

## 📄 License
ISC License · Developed for E-RikshaNet Pilot Implementation
