# E-RikshaNet — Pilot Operations & Demonstration Guide

Version 1.0 · Ward 7 Mirpur Pilot Phase

---

## 1. Pilot Demonstration Script

This step-by-step test script allows municipal stakeholders to evaluate the 10 PRD acceptance criteria in under 15 minutes.

### Step 1: Identity & Vehicle Verification (PRD FR-01 - FR-06)
1. Open the Authority Dashboard at `http://localhost:3002`.
2. Click **"Reviewer"** in the top role switcher.
3. Open the **"Registrations"** tab.
4. Review submitted driver profiles and vehicles:
   - Click **"Review"** on driver *Md. Rafiqul Islam*.
   - View verified National ID: `19922691234567890`.
   - Update verification notes and confirm approval.

### Step 2: Permit Authorization Workflow (PRD FR-07 - FR-11)
1. Switch to **"Permit Officer"** in the top navigation bar.
2. Open the **"Permits"** tab.
3. Locate pending or active permit `PRM-MIRPUR-001` assigned to *Mirpur Ward 7 Pilot Zone*.
4. Test clicking **"Review & Issue"**:
   - Assign validity period (e.g., 180 days).
   - Enter mandatory decision rationale (e.g., *"Passed physical roadworthiness inspection"*).
   - Confirm issuance. Notice the permit state switches to **ACTIVE**.

### Step 3: Live Telemetry & Stale Tracking (PRD FR-13 - FR-14)
1. Switch to **"Enforcement"** role.
2. Open the **"Live Fleet Map"** tab.
3. Observe the green polygon delineating the boundaries of **Mirpur Ward 7**.
4. Active on-duty rickshaws appear with real-time green markers.
5. If a vehicle halts telemetry for >2 minutes, its indicator automatically switches from **Active (Green)** to **Stale (Yellow)** to alert dispatchers of lost tracking.

### Step 4: Geofence Breach Candidate Review (PRD FR-15, FR-16 & BR-06)
1. In the Mobile App (Driver Mode), tap **"⚡ Simulate Driving Outside Allowed Ward Boundary"**.
2. Notice that **no fine is automatically imposed** on the driver (protects drivers against GPS drift and network lag).
3. Return to the Authority Dashboard and open the **"Violations & Appeals"** tab.
4. A new case appears under status **`CANDIDATE_REVIEW`** with precise lat/lng coordinates and timestamp evidence.
5. Click **"Review & Decide"**:
   - Select **"Confirm Breach & Issue Notice"** with a 500 BDT fine, or **"Dismiss"** if within permitted road detours.
   - Enter mandatory officer findings.

### Step 5: Driver Defense & Legal Appeal (PRD FR-21, FR-23)
1. In the Mobile App (Driver Mode), scroll to the **"Notices & Candidate Breaches"** section.
2. View the issued citation. Tap **"File an Appeal"**.
3. Submit a defense statement (e.g., *"Medical emergency passenger detour around blocked road"*).
4. In the Authority Dashboard, switch to **"Appeals"** role (Barrister S. Chowdhury).
5. Click **"Resolve Appeal"**:
   - Select **"Uphold Appeal & Dismiss Fine"**.
   - Enter legal ruling notes. The violation status updates to **DISMISSED** and penalty is cleared.

### Step 6: Passenger Ride Booking & Ward Constrained Matching (PRD FR-24 - FR-29)
1. In the Mobile App, switch to **"👤 Passenger Mode"**.
2. Select pickup (*Mirpur-10 Roundabout*) and destination (*Mirpur-11 Bus Stand*).
3. Verify the calculated fare: Base 25 BDT + 15 BDT/km.
4. Tap **"Confirm & Request Rickshaw"**.
5. Switch to **"🛺 Driver Mode"**:
   - The incoming ride offer appears in the driver dispatch queue.
   - Tap **"Accept Ride"**.
   - Step through the trip states: *Arrived at Pickup* ➔ *Start Ride* ➔ *Complete Trip & Collect Fare*.

### Step 7: Regulatory Audit Trail Verification (PRD BR-09, BR-11)
1. In the Authority Dashboard, switch to **"Admin"** role.
2. Open the **"Audit Logs"** tab.
3. Review the immutable, append-only ledger displaying every action performed during the test, complete with timestamps, officer IDs, and JSON change payloads.

---

## 2. Production Deployment Notes (Debian/Ubuntu VPS)

When moving from local pilot testing to field deployment:

1. **Database Migration to PostgreSQL**:
   - Set `DATABASE_URL="postgresql://user:password@localhost:5432/erikshanet_db?schema=public"` in `server/.env`.
   - Update `server/prisma/schema.prisma` datasource provider to `postgresql`.
   - Run `npx prisma migrate deploy`.
2. **Reverse Proxying**:
   - Supervise Node.js with PM2 (`pm2 start dist/index.js --name erikshanet-api`).
   - Terminate SSL with Nginx and proxy `/api` and WebSocket upgrade headers (`Upgrade $http_upgrade`, `Connection "upgrade"`).
3. **PWA Mobile Deployment**:
   - The React Native web app can be installed directly to home screens on Android/iOS via standard PWA service workers for driver and passenger usability without initial app store friction.
