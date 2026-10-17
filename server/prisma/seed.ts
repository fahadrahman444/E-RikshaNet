import { PrismaClient } from "@prisma/client";
import { Role, RegistrationStatus, PermitStatus } from "../src/types/enums.js";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding E-RikshaNet database...");

  const defaultPasswordHash = await bcrypt.hash("password123", 10);

  // 1. Create System Admin
  const admin = await prisma.user.upsert({
    where: { phone: "01700000001" },
    update: {},
    create: {
      name: "Tariqul Islam (System Admin)",
      phone: "01700000001",
      email: "admin@erikshanet.gov.bd",
      passwordHash: defaultPasswordHash,
      role: Role.ADMIN,
    },
  });

  // 2. Registration Reviewer
  const reviewer = await prisma.user.upsert({
    where: { phone: "01700000002" },
    update: {},
    create: {
      name: "Farhana Akter (Registration Reviewer)",
      phone: "01700000002",
      email: "reviewer@erikshanet.gov.bd",
      passwordHash: defaultPasswordHash,
      role: Role.REGISTRATION_REVIEWER,
    },
  });

  // 3. Permit Officer
  const permitOfficer = await prisma.user.upsert({
    where: { phone: "01700000003" },
    update: {},
    create: {
      name: "Mahmud Hasan (Permit Officer)",
      phone: "01700000003",
      email: "permit@erikshanet.gov.bd",
      passwordHash: defaultPasswordHash,
      role: Role.PERMIT_OFFICER,
    },
  });

  // 4. Enforcement Officer
  const enforcementOfficer = await prisma.user.upsert({
    where: { phone: "01700000004" },
    update: {},
    create: {
      name: "Inspector K. Rahman (Enforcement Officer)",
      phone: "01700000004",
      email: "enforcement@erikshanet.gov.bd",
      passwordHash: defaultPasswordHash,
      role: Role.ENFORCEMENT_OFFICER,
    },
  });

  // 5. Appeals Reviewer
  const appealsReviewer = await prisma.user.upsert({
    where: { phone: "01700000005" },
    update: {},
    create: {
      name: "Barrister S. Chowdhury (Appeals Reviewer)",
      phone: "01700000005",
      email: "appeals@erikshanet.gov.bd",
      passwordHash: defaultPasswordHash,
      role: Role.APPEALS_REVIEWER,
    },
  });

  // 6. Vehicle Owner
  const owner = await prisma.user.upsert({
    where: { phone: "01700000006" },
    update: {},
    create: {
      name: "Haji Nurul Alam (Fleet Owner)",
      phone: "01700000006",
      email: "owner@erikshanet.gov.bd",
      passwordHash: defaultPasswordHash,
      role: Role.OWNER,
    },
  });

  // 7. Pilot Ward 7 Zone (Mirpur, Dhaka polygon)
  // Polygon coordinates: [lng, lat] pairs
  const mirpurPolygon = [
    [90.355, 23.805],
    [90.375, 23.805],
    [90.380, 23.825],
    [90.350, 23.825],
    [90.355, 23.805],
  ];

  const zone = await prisma.operatingZone.upsert({
    where: { id: "zone-dhaka-ward-7" },
    update: {},
    create: {
      id: "zone-dhaka-ward-7",
      name: "Mirpur Ward 7 Pilot Zone",
      city: "Dhaka",
      wardNumber: "07",
      polygonGeoJson: JSON.stringify(mirpurPolygon),
      speedLimitKmh: 25.0,
      maxPermittedVehicles: 200,
      isActive: true,
    },
  });

  // 8. Registered Vehicle
  const vehicle = await prisma.vehicle.upsert({
    where: { registrationNumber: "DHK-HA-7012" },
    update: {},
    create: {
      registrationNumber: "DHK-HA-7012",
      chassisNumber: "CHS-ERIK-2026-904",
      model: "Walton E-Riksha Eco 1000W",
      batteryCapacityKwh: 3.2,
      ownerId: owner.id,
      status: RegistrationStatus.APPROVED,
      reviewNotes: "Verified ownership deeds and battery compliance certificate.",
    },
  });

  // 9. Driver User & Profile
  const driverUser = await prisma.user.upsert({
    where: { phone: "01700000007" },
    update: {},
    create: {
      name: "Md. Rafiqul Islam (Driver)",
      phone: "01700000007",
      email: "driver.rafiq@erikshanet.gov.bd",
      passwordHash: defaultPasswordHash,
      role: Role.DRIVER,
      driverProfile: {
        create: {
          nidNumber: "19922691234567890",
          licenseNumber: "DL-DH-88219",
          emergencyContact: "01711223344",
          status: RegistrationStatus.APPROVED,
          reviewNotes: "National ID and medical fitness verified.",
          isOnDuty: true,
          lastLatitude: 23.815,
          lastLongitude: 90.365,
          lastPingAt: new Date(),
          currentVehicleId: vehicle.id,
        },
      },
    },
    include: { driverProfile: true },
  });

  // Link driver to vehicle
  if (driverUser.driverProfile) {
    await prisma.driverVehicleLink.upsert({
      where: {
        driverId_vehicleId: {
          driverId: driverUser.driverProfile.id,
          vehicleId: vehicle.id,
        },
      },
      update: {},
      create: {
        driverId: driverUser.driverProfile.id,
        vehicleId: vehicle.id,
        isPrimary: true,
      },
    });

    // Active operating permit
    await prisma.permit.upsert({
      where: { permitNumber: "PRM-MIRPUR-001" },
      update: {},
      create: {
        permitNumber: "PRM-MIRPUR-001",
        driverId: driverUser.driverProfile.id,
        vehicleId: vehicle.id,
        zoneId: zone.id,
        status: PermitStatus.ACTIVE,
        effectiveDate: new Date(),
        expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
        issuedById: permitOfficer.id,
        decisionNotes: "Approved under pilot project criteria.",
      },
    });
  }

  // 10. Passenger User
  await prisma.user.upsert({
    where: { phone: "01700000008" },
    update: {},
    create: {
      name: "Sharmin Sultana (Passenger)",
      phone: "01700000008",
      email: "passenger@gmail.com",
      passwordHash: defaultPasswordHash,
      role: Role.PASSENGER,
    },
  });

  console.log("✅ Seed completed successfully! Seeded accounts with password: password123");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
