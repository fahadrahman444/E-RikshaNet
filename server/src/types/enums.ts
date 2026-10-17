export const Role = {
  PASSENGER: "PASSENGER",
  DRIVER: "DRIVER",
  OWNER: "OWNER",
  REGISTRATION_REVIEWER: "REGISTRATION_REVIEWER",
  PERMIT_OFFICER: "PERMIT_OFFICER",
  ENFORCEMENT_OFFICER: "ENFORCEMENT_OFFICER",
  APPEALS_REVIEWER: "APPEALS_REVIEWER",
  ADMIN: "ADMIN",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const UserStatus = {
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const RegistrationStatus = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  UNDER_REVIEW: "UNDER_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CHANGES_REQUESTED: "CHANGES_REQUESTED",
} as const;
export type RegistrationStatus = (typeof RegistrationStatus)[keyof typeof RegistrationStatus];

export const PermitStatus = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED",
  SUSPENDED: "SUSPENDED",
  REVOKED: "REVOKED",
} as const;
export type PermitStatus = (typeof PermitStatus)[keyof typeof PermitStatus];

export const ViolationCategory = {
  GEOFENCE_BREACH: "GEOFENCE_BREACH",
  NO_VALID_PERMIT: "NO_VALID_PERMIT",
  SPEEDING: "SPEEDING",
  OPERATING_OFF_HOURS: "OPERATING_OFF_HOURS",
  PASSENGER_SAFETY: "PASSENGER_SAFETY",
} as const;
export type ViolationCategory = (typeof ViolationCategory)[keyof typeof ViolationCategory];

export const ViolationStatus = {
  CANDIDATE_REVIEW: "CANDIDATE_REVIEW",
  DISMISSED: "DISMISSED",
  NOTICE_ISSUED: "NOTICE_ISSUED",
  APPEALED: "APPEALED",
  CONFIRMED: "CONFIRMED",
  RESOLVED: "RESOLVED",
} as const;
export type ViolationStatus = (typeof ViolationStatus)[keyof typeof ViolationStatus];

export const AppealStatus = {
  PENDING: "PENDING",
  APPROVED_DISMISSED: "APPROVED_DISMISSED",
  REJECTED: "REJECTED",
} as const;
export type AppealStatus = (typeof AppealStatus)[keyof typeof AppealStatus];

export const TripStatus = {
  REQUESTED: "REQUESTED",
  ACCEPTED: "ACCEPTED",
  ARRIVING: "ARRIVING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type TripStatus = (typeof TripStatus)[keyof typeof TripStatus];
