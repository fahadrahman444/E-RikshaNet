# E-RikhsaNET — Product Requirements Document (PRD)

Version 1.0 · 17 October 2026 · Status: Draft for product planning

## 1. Product overview

E-RikhsaNET is a digital platform to register, authorize, monitor, and manage rickshaws and their drivers within designated local areas in Bangladesh, while providing a passenger ride-booking service.

The initial pilot will cover one local area or ward. E-RikhsaNET will be designed to work with an authorized government or local authority for permit approvals and enforcement, rather than assuming that the platform itself has statutory powers.

### Product objectives

- **Establish digital identities:** Maintain unique records for vehicles, drivers, owners, registrations, and permits.
- **Control local operating eligibility:** Identify whether a driver and vehicle have valid authorization for a particular area.
- **Improve operational visibility:** Provide authorized, appropriately limited vehicle-location monitoring and compliance records.
- **Enable passenger transport:** Allow passengers to request rides between two destinations using eligible drivers and vehicles.

### Success measures

The pilot should measure:
- Percentage of submitted driver and vehicle registrations reviewed.
- Time taken to process permit applications.
- Percentage of active vehicles with valid permits.
- Location-reporting reliability and GPS data freshness.
- Number of suspected violations reviewed and resolved.
- Successful ride bookings, cancellations, and completed trips.
- Passenger and driver complaints, appeals, and resolution times.

Numerical targets should be agreed with the pilot authority after establishing baseline conditions.

---

## 2. Scope of the MVP

The MVP is the smallest working product that can support a controlled pilot in one local area.

| Included in MVP | Deferred until later |
| --- | --- |
| Driver and owner registration | National rollout and multi-city operations |
| Vehicle registration and driver-vehicle linking | Advanced fleet optimization |
| Document verification and permit applications | Automated legal penalties |
| Authority-controlled approval and rejection | Automatic number-plate recognition |
| Local operating zones and permit validity | Advanced AI violation detection |
| Smartphone GPS tracking prototype | Mandatory dedicated tracking hardware |
| Basic violation records and appeal workflow | Complex court or government-system integrations |
| Basic passenger booking and trip status | Advanced surge pricing and loyalty systems |
| Role-based admin dashboard and audit logs | Advanced analytics and predictive models |

> **MVP Boundary:** Build a functional registration, permit, monitoring, and basic booking workflow. Do not make the first release dependent on automated fines or expensive hardware.

---

## 3. Actors, roles, and permissions

Permissions must be enforced by the server, not just by hiding buttons in the interface.

| Actor | Primary permissions |
| --- | --- |
| **Driver** | Manage own profile, submit documents, apply for permits, view violations, appeal decisions, manage availability, accept eligible rides |
| **Vehicle owner** | Register vehicles, submit ownership documents, link authorized drivers, view vehicle and permit status |
| **Passenger** | Search, request and cancel eligible rides, view assigned-driver information, track an active trip, report issues |
| **Registration reviewer** | Review submitted records, request corrections, verify documents, recommend approval or rejection |
| **Authorized permit officer** | Approve, reject, suspend or revoke permits only within delegated authority |
| **Authorized enforcement officer** | Review evidence and create or issue notices within delegated authority; record outcomes |
| **Appeals reviewer** | Review disputed cases and record independent or appropriately separated decisions |
| **System administrator** | Manage accounts, configurations, technical operations and audit records; no automatic authority to approve permits or impose legal penalties |
| **Platform support** | Resolve technical and account issues without unrestricted access to sensitive identity or tracking data |

---

## 4. Core user stories and requirements

### A. Registration and identity
- **FR-01:** A driver can create an account and submit required identity and contact information.
- **FR-02:** A vehicle owner can register a vehicle and submit required registration or ownership evidence.
- **FR-03:** Each driver and vehicle receives a unique internal identifier.
- **FR-04:** A reviewer can approve, reject, or request corrections to a submission, with a recorded reason.
- **FR-05:** A vehicle can be linked to one or more authorized drivers, subject to configured rules.
- **FR-06:** Duplicate or suspicious registrations can be flagged for manual review.

### B. Permits and local operating zones
- **FR-07:** A driver can apply for a permit for a specific local area.
- **FR-08:** The system checks that required documents, driver eligibility, and vehicle association requirements are satisfied before an application can be approved.
- **FR-09:** An authorized officer can issue a permit with a unique number, area, effective date, expiry date, and status.
- **FR-10:** The system prevents an expired, suspended, revoked, or otherwise invalid permit from being treated as active.
- **FR-11:** Drivers and owners can view permit status, expiry, and renewal requirements.
- **FR-12:** Authorized administrators can configure local zones and their boundaries.

### C. Live monitoring
- **FR-13:** An authorized driver app can submit location coordinates and timestamps while the driver is on duty and has enabled the required permissions.
- **FR-14:** The dashboard displays the last reported location, timestamp, and tracking status.
- **FR-15:** The system can compare reported coordinates with a configured operating-zone boundary.
- **FR-16:** Potential violations are flagged for review, not automatically treated as proven offenses.
- **FR-17:** The system records periods of missing, stale, or inaccurate location data.
- **FR-18:** Access to live locations and location history is permission-controlled and audited.

### D. Violations and appeals
- **FR-19:** An authorized officer can create a case with a violation category, timestamp, location, evidence, and applicable rule.
- **FR-20:** The system records whether the case is under review, dismissed, confirmed, appealed, or resolved.
- **FR-21:** Drivers can view notices addressed to them and submit an appeal with supporting evidence.
- **FR-22:** Only an appropriately authorized person or integrated authority system can record an official penalty decision.
- **FR-23:** Any payment, adjustment, or appeal outcome must be recorded with a timestamp and responsible actor.

### E. Passenger booking
- **FR-24:** A passenger can select pickup and destination locations.
- **FR-25:** The system can estimate a fare using a configured pricing rule before booking confirmation.
- **FR-26:** The matching service considers driver availability, vehicle eligibility, and operating-zone rules.
- **FR-27:** Drivers can accept or reject requests; passengers can cancel under defined conditions.
- **FR-28:** The app tracks the trip through requested, accepted, arriving, in progress, completed, or cancelled states.
- **FR-29:** Trip records retain pickup, destination, assigned driver and vehicle, timestamps, and fare details.
- **FR-30:** Both passengers and drivers can report safety concerns or service issues.

---

## 5. End-to-end workflows

### Workflow A — Driver and vehicle authorization
1. **Create account:** Driver provides required identity information.
2. **Submit vehicle details:** Owner provides vehicle information and supporting evidence.
3. **Verify and review:** Reviewer checks completeness, duplicates and eligibility.
4. **Apply for local permit:** Driver selects the intended operating area.
5. **Authorized decision:** Permit officer approves, rejects or requests corrections.
6. **Activate eligibility:** System enables eligible operations only when all required records are valid.

- Application states: `Draft` → `Submitted` → `Under review` → `Approved` / `Rejected` / `Changes requested`
- Permit states: `Pending` → `Active` → `Expired` / `Suspended` / `Revoked`

### Workflow B — Operating-area monitoring
1. Driver signs in and selects the registered vehicle they will operate.
2. The backend validates the driver, vehicle, and applicable permit.
3. Location reporting starts for the authorized operational session.
4. The system displays fresh location reports on the restricted admin map.
5. The geofence service evaluates reported coordinates against the applicable zone.
6. If the system detects a possible breach, it records a candidate event and its evidence.
7. An authorized reviewer checks GPS accuracy, timestamps, zone rules, and any applicable exception.
8. The reviewer dismisses the case or follows the authorized enforcement process.

### Workflow C — Passenger ride booking
1. **Choose pickup and destination:** Passenger enters pickup and drop-off coordinates.
2. **Check eligibility and fare:** Validate available drivers, vehicles, permits, and fare rules.
3. **Match a driver:** Send the request to an eligible driver within the permitted zone.
4. **Accept and start trip:** Passenger sees assignment and real-time trip status.
5. **Complete and record:** Save trip details, fare, and feedback.

### Workflow D — Violation and appeal
`Detection` → `Evidence capture` → `Human review` → `Authorized decision` → `Notice` → `Appeal or payment` → `Resolution`

---

## 6. Business rules

| ID | Rule |
| --- | --- |
| **BR-01** | Every driver, vehicle, permit, ride, and violation case has a unique identifier. |
| **BR-02** | A driver cannot be treated as eligible to operate unless the required driver, vehicle, and permit records are valid. |
| **BR-03** | Permits are area-specific and time-bound where required by the applicable authorization. |
| **BR-04** | A driver cannot accept a ride if their required operating authorization is invalid. |
| **BR-05** | A vehicle must be linked to the assigned driver before it can be used for an eligible trip. |
| **BR-06** | Location loss or GPS failure must not automatically generate a confirmed offense. |
| **BR-07** | Suspected violations and official penalty decisions are separate records and states. |
| **BR-08** | Sensitive records can be accessed only by users with the necessary permissions and legitimate purpose. |
| **BR-09** | Permit, enforcement, and account-status changes must be logged in an append-only audit trail. |
| **BR-10** | A passenger's booking and location details must not be exposed to unrelated users. |
| **BR-11** | Critical actions such as permit revocation and penalty decisions must capture the responsible authority, reason, and timestamp. |
| **BR-12** | Zone boundaries, fare rules, and permit criteria must be configurable rather than embedded as unchangeable application logic. |

---

## 7. Tracking technology comparison

- **Option A — Smartphone GPS (Recommended for MVP):** Low upfront cost, uses driver's existing phone, allows rapid testing of location updates and geofencing.
- **Option B — Dedicated GPS tracker:** Medium upfront cost, installed in vehicle, hardware procurement & maintenance required.
- **Option C — Hybrid tracking:** Phone for driver interaction + vehicle IoT tracker. Deferred to later phase.

---

## 8. MVP acceptance criteria

- [ ] Driver registration, document upload, status check.
- [ ] Vehicle owner registration and driver-vehicle linking.
- [ ] Reviewer workflow: approve, reject, or request changes with recorded reasoning.
- [ ] Permit issuance with unique ID, zone boundary, validity dates, and lifecycle states.
- [ ] Operating eligibility gating: invalid/expired permit blocks trip matching.
- [ ] Admin live map displaying location pings, timestamps, and stale indicators.
- [ ] Geofence boundary check creating candidate breach events for human review.
- [ ] Violation case management and driver appeal submission.
- [ ] Passenger ride request, driver accept/reject, trip lifecycle states, completion.
- [ ] Role-based access control and append-only audit log.
