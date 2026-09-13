import type { AuditEvent, AuditSeverity } from "./types";
import { newLabId, nowIso } from "./ids";

export class LabAuditTrail {
  private readonly events: AuditEvent[] = [];

  record(
    actorId: string,
    action: string,
    details: Record<string, unknown> = {},
    severity: AuditSeverity = "info"
  ): AuditEvent {
    const event: AuditEvent = {
      auditId: newLabId("aud"),
      at: nowIso(),
      actorId,
      action,
      severity,
      details: { ...details },
    };
    this.events.push(event);
    return event;
  }

  list(): AuditEvent[] {
    return this.events.map((e) => ({ ...e, details: { ...e.details } }));
  }

  filterByAction(action: string): AuditEvent[] {
    return this.list().filter((e) => e.action === action);
  }
}
