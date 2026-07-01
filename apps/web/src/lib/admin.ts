// Shared types + helpers for the admin dashboard. Interfaces mirror the API DTOs
// (the SDK enforces the wire types; these keep component code readable).

export type BookingStatus =
  | "REQUESTED"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export interface Me {
  id: string;
  email: string;
  role: string;
  tenantId: string | null;
  storeId: string | null;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  timezone: string;
}

export interface Booking {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  serviceName: string;
  staffName: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  priceCents: number;
}

export interface Service {
  id: string;
  storeId: string;
  name: string;
  durationMin: number;
  bufferMin: number;
  priceCents: number;
  active: boolean;
}

export interface StaffMember {
  id: string;
  storeId: string;
  name: string;
  jobTitle: string | null;
  photoUrl: string | null;
  active: boolean;
}

const MANAGER_ROLES = ["TENANT_OWNER", "STORE_MANAGER"];

/** Whether a role may manage services/staff (mirrors the API's @Roles guard). */
export function canManage(role: string | undefined): boolean {
  return role ? MANAGER_ROLES.includes(role) : false;
}

/**
 * Valid next statuses per current status — mirrors the API state machine so the
 * UI only offers legal actions. The API remains the source of truth.
 */
export const BOOKING_ACTIONS: Record<string, string[]> = {
  REQUESTED: ["CONFIRMED", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["IN_PROGRESS", "COMPLETED", "CANCELLED", "NO_SHOW"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

/** Short verb shown on the action button for a target status. */
export const STATUS_VERB: Record<string, string> = {
  CONFIRMED: "Confirm",
  IN_PROGRESS: "Start",
  COMPLETED: "Complete",
  CANCELLED: "Cancel",
  NO_SHOW: "No-show",
};

export function humanize(value: string): string {
  return value.replaceAll("_", " ").toLowerCase();
}
