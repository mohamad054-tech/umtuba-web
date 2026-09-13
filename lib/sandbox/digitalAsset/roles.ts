import {
  ROLE_BURNER,
  ROLE_COMPLIANCE_VIEWER,
  ROLE_DEFAULT_ADMIN,
  ROLE_MINTER,
  ROLE_PAUSER,
  ROLE_TREASURY_ADMIN,
  ROLE_USER,
  SANDBOX_ADMIN_ID,
  SANDBOX_MINTER_ID,
  SANDBOX_TREASURY_ID,
} from "./constants";
import type { LabRole } from "./types";
import type { LabAuditTrail } from "./audit";

const ALL_ROLES: LabRole[] = [
  ROLE_DEFAULT_ADMIN,
  ROLE_MINTER,
  ROLE_BURNER,
  ROLE_PAUSER,
  ROLE_TREASURY_ADMIN,
  ROLE_COMPLIANCE_VIEWER,
  ROLE_USER,
];

export class LabAccessControl {
  private readonly grants = new Map<string, Set<LabRole>>();

  constructor(private readonly audit: LabAuditTrail) {
    this.grants.set(
      SANDBOX_ADMIN_ID,
      new Set<LabRole>([
        ROLE_DEFAULT_ADMIN,
        ROLE_MINTER,
        ROLE_BURNER,
        ROLE_PAUSER,
        ROLE_TREASURY_ADMIN,
        ROLE_COMPLIANCE_VIEWER,
      ])
    );
    this.grants.set(
      SANDBOX_MINTER_ID,
      new Set<LabRole>([ROLE_MINTER, ROLE_BURNER])
    );
    this.grants.set(
      SANDBOX_TREASURY_ID,
      new Set<LabRole>([ROLE_TREASURY_ADMIN, ROLE_COMPLIANCE_VIEWER])
    );
  }

  has(actorId: string, role: LabRole): boolean {
    const set = this.grants.get(actorId);
    if (!set) return false;
    return set.has(role) || set.has(ROLE_DEFAULT_ADMIN);
  }

  grant(adminId: string, actorId: string, role: LabRole): boolean {
    if (!this.has(adminId, ROLE_DEFAULT_ADMIN)) return false;
    if (!ALL_ROLES.includes(role)) return false;
    const set = this.grants.get(actorId) ?? new Set<LabRole>();
    set.add(role);
    this.grants.set(actorId, set);
    this.audit.record(adminId, "role.grant", { actorId, role });
    return true;
  }

  revoke(adminId: string, actorId: string, role: LabRole): boolean {
    if (!this.has(adminId, ROLE_DEFAULT_ADMIN)) return false;
    const set = this.grants.get(actorId);
    if (!set) return false;
    set.delete(role);
    this.audit.record(adminId, "role.revoke", { actorId, role });
    return true;
  }

  assignUser(userId: string): void {
    const set = this.grants.get(userId) ?? new Set<LabRole>();
    set.add(ROLE_USER);
    this.grants.set(userId, set);
  }

  rolesOf(actorId: string): LabRole[] {
    return [...(this.grants.get(actorId) ?? new Set<LabRole>())];
  }
}
