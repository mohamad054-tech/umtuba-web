import type {
  CommerceNotificationEvent,
  CommerceNotificationIntent,
} from "./types";

const MAX = 500;

export class CommerceNotificationMemoryStore {
  private events: CommerceNotificationEvent[] = [];
  private intents: CommerceNotificationIntent[] = [];
  private eventByIdempotency = new Map<string, string>();
  private intentByDedupe = new Map<string, string>();

  reset(): void {
    this.events = [];
    this.intents = [];
    this.eventByIdempotency.clear();
    this.intentByDedupe.clear();
  }

  findEventByIdempotency(key: string): CommerceNotificationEvent | null {
    const id = this.eventByIdempotency.get(key);
    if (!id) return null;
    return this.events.find((e) => e.eventId === id) ?? null;
  }

  recordEvent(event: CommerceNotificationEvent): CommerceNotificationEvent {
    const existing = this.findEventByIdempotency(event.idempotencyKey);
    if (existing) return existing;
    this.events.push(event);
    this.eventByIdempotency.set(event.idempotencyKey, event.eventId);
    if (this.events.length > MAX) this.events.shift();
    return event;
  }

  findIntentByDedupe(key: string): CommerceNotificationIntent | null {
    const id = this.intentByDedupe.get(key);
    if (!id) return null;
    return this.intents.find((i) => i.intentId === id) ?? null;
  }

  recordIntent(intent: CommerceNotificationIntent): CommerceNotificationIntent {
    const existing = this.findIntentByDedupe(intent.dedupeKey);
    if (existing) return existing;
    this.intents.push(intent);
    this.intentByDedupe.set(intent.dedupeKey, intent.intentId);
    if (this.intents.length > MAX) this.intents.shift();
    return intent;
  }

  updateIntent(
    intentId: string,
    patch: Partial<CommerceNotificationIntent>
  ): CommerceNotificationIntent | null {
    const idx = this.intents.findIndex((i) => i.intentId === intentId);
    if (idx < 0) return null;
    const next = {
      ...this.intents[idx]!,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.intents[idx] = next;
    return next;
  }

  listEvents(limit = 50): CommerceNotificationEvent[] {
    return this.events.slice(-limit);
  }

  listIntents(limit = 100): CommerceNotificationIntent[] {
    return this.intents.slice(-limit);
  }

  listIntentsForRecipient(recipientId: string, limit = 50): CommerceNotificationIntent[] {
    return this.intents
      .filter((i) => i.recipientId === recipientId)
      .slice(-limit);
  }

  listIntentsForStore(storeId: string, limit = 50): CommerceNotificationIntent[] {
    const eventIds = new Set(
      this.events.filter((e) => e.storeId === storeId).map((e) => e.eventId)
    );
    return this.intents.filter((i) => eventIds.has(i.eventId)).slice(-limit);
  }

  unreadCountForRecipient(recipientId: string): number {
    return this.intents.filter(
      (i) =>
        i.recipientId === recipientId &&
        (i.status === "delivered" || i.status === "queued" || i.status === "created")
    ).length;
  }
}

export const commerceNotificationMemoryStore =
  new CommerceNotificationMemoryStore();

export function resetCommerceNotificationFoundation(): void {
  commerceNotificationMemoryStore.reset();
}
