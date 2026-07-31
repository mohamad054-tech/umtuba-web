/**
 * Emit commerce notification events → intents → optional in-app delivery.
 * Never throws into caller business paths when used via notifyCommerceBestEffort.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { assertExternalChannelsDisabled } from "./channels";
import { buildCommerceDeepLink, sanitizeCommerceDeepLink } from "./deepLinks";
import {
  assertNoSensitiveMetadata,
  redactCommerceMetadata,
} from "./redaction";
import {
  resolveCommerceNotificationRecipients,
  type RecipientResolutionInput,
} from "./recipients";
import { commerceNotificationMemoryStore } from "./store";
import {
  commerceNotificationTemplateRegistry,
  renderCommerceTemplateCopy,
} from "./templates";
import {
  COMMERCE_TRANSACTIONAL_NOTIFICATIONS_VERSION,
  commerceEventToNotificationType,
  type CommerceNotificationEvent,
  type CommerceNotificationEventType,
  type CommerceNotificationIntent,
  type CommerceSafeMetadata,
} from "./types";

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export type EmitCommerceNotificationInput = {
  eventType: CommerceNotificationEventType;
  orderId?: string | null;
  paymentId?: string | null;
  fulfillmentId?: string | null;
  storeId?: string | null;
  buyerId?: string | null;
  sellerId?: string | null;
  supplierId?: string | null;
  actorId?: string | null;
  correlationId?: string | null;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
  auditLinkage?: string | null;
  locale?: string;
  productId?: string | null;
  storeOwnerId?: string | null;
  platformAdminIds?: string[];
  supplierOwnedListing?: boolean;
  /** When set, attempts durable in-app insert via service-role RPC. */
  supabase?: SupabaseClient | null;
};

export type EmitCommerceNotificationResult = {
  version: typeof COMMERCE_TRANSACTIONAL_NOTIFICATIONS_VERSION;
  replayed: boolean;
  event: CommerceNotificationEvent;
  intents: CommerceNotificationIntent[];
};

export function buildEventIdempotencyKey(parts: {
  eventType: CommerceNotificationEventType;
  orderId?: string | null;
  paymentId?: string | null;
  storeId?: string | null;
  productId?: string | null;
  correlationId?: string | null;
  suffix?: string | null;
}): string {
  return [
    "commerce",
    parts.eventType,
    parts.storeId ?? "-",
    parts.orderId ?? "-",
    parts.paymentId ?? "-",
    parts.productId ?? "-",
    parts.correlationId ?? "-",
    parts.suffix ?? "v1",
  ].join(":");
}

export function emitCommerceNotificationEvent(
  input: EmitCommerceNotificationInput
): EmitCommerceNotificationResult {
  const existing = commerceNotificationMemoryStore.findEventByIdempotency(
    input.idempotencyKey
  );
  if (existing) {
    const intents = commerceNotificationMemoryStore
      .listIntents(500)
      .filter((i) => i.eventId === existing.eventId);
    return {
      version: COMMERCE_TRANSACTIONAL_NOTIFICATIONS_VERSION,
      replayed: true,
      event: existing,
      intents,
    };
  }

  const metadata = redactCommerceMetadata(input.metadata);
  assertNoSensitiveMetadata(metadata);

  const event: CommerceNotificationEvent = {
    eventId: newId("cne"),
    eventType: input.eventType,
    orderId: input.orderId ?? null,
    paymentId: input.paymentId ?? null,
    fulfillmentId: input.fulfillmentId ?? null,
    storeId: input.storeId ?? null,
    buyerId: input.buyerId ?? null,
    sellerId: input.sellerId ?? null,
    supplierId: input.supplierId ?? null,
    actorId: input.actorId ?? null,
    occurredAt: new Date().toISOString(),
    correlationId: input.correlationId?.trim() || newId("corr"),
    idempotencyKey: input.idempotencyKey,
    metadata,
    auditLinkage: input.auditLinkage ?? null,
  };

  const recorded = commerceNotificationMemoryStore.recordEvent(event);

  const resolutionInput: RecipientResolutionInput = {
    event: recorded,
    storeOwnerId: input.storeOwnerId,
    platformAdminIds: input.platformAdminIds,
    supplierOwnedListing: input.supplierOwnedListing,
  };
  const resolved = resolveCommerceNotificationRecipients(resolutionInput);
  if (!resolved.ok) {
    return {
      version: COMMERCE_TRANSACTIONAL_NOTIFICATIONS_VERSION,
      replayed: false,
      event: recorded,
      intents: [],
    };
  }

  const locale = input.locale ?? "en";
  const intents: CommerceNotificationIntent[] = [];

  for (const recipient of resolved.recipients) {
    assertExternalChannelsDisabled("in_app");

    const template = commerceNotificationTemplateRegistry.select(
      recorded.eventType,
      recipient.role,
      locale
    );
    if (!template) continue;

    const resolvedLocale = commerceNotificationTemplateRegistry.resolveLocale(
      template,
      locale
    );
    const copy = renderCommerceTemplateCopy(
      recorded.eventType,
      recipient.role
    );
    const deepLink = sanitizeCommerceDeepLink(
      buildCommerceDeepLink({
        role: recipient.role,
        event: {
          ...recorded,
          productId: input.productId,
        },
      })
    );

    const dedupeKey = [
      "cint",
      recorded.eventType,
      recorded.storeId ?? "-",
      recorded.orderId ?? recorded.paymentId ?? input.productId ?? "-",
      recipient.recipientId,
      "in_app",
    ].join(":");

    const prior = commerceNotificationMemoryStore.findIntentByDedupe(dedupeKey);
    if (prior) {
      intents.push(prior);
      continue;
    }

    const now = new Date().toISOString();
    let intent: CommerceNotificationIntent = {
      intentId: newId("cni"),
      eventId: recorded.eventId,
      recipientId: recipient.recipientId,
      recipientRole: recipient.role,
      channel: "in_app",
      templateId: template.templateId,
      locale: resolvedLocale,
      titleKey: template.titleKey,
      bodyKey: template.bodyKey,
      title: copy.title,
      body: copy.body,
      deepLink,
      priority:
        recorded.eventType === "payment_failed" ||
        recorded.eventType === "inventory_out"
          ? "high"
          : "normal",
      deliveryPolicy: "in_app_only_v1",
      dedupeKey,
      status: "created",
      suppressedReason: null,
      inAppNotificationId: null,
      createdAt: now,
      updatedAt: now,
    };

    intent = commerceNotificationMemoryStore.recordIntent(intent);

    // Durable in-app delivery is async-safe and optional.
    void deliverInAppIntent(
      intent,
      recorded.eventType,
      input.supabase ?? null
    ).then((next) => {
      if (next) {
        commerceNotificationMemoryStore.updateIntent(intent.intentId, next);
      }
    });

    // Synchronous local mark as queued/delivered for process diagnostics.
    const syncDelivered = markIntentQueuedOrDelivered(intent, input.supabase);
    intents.push(syncDelivered);
  }

  return {
    version: COMMERCE_TRANSACTIONAL_NOTIFICATIONS_VERSION,
    replayed: false,
    event: recorded,
    intents,
  };
}

function markIntentQueuedOrDelivered(
  intent: CommerceNotificationIntent,
  supabase: SupabaseClient | null | undefined
): CommerceNotificationIntent {
  if (!supabase) {
    const next = commerceNotificationMemoryStore.updateIntent(intent.intentId, {
      status: "delivered",
      suppressedReason: null,
    });
    return next ?? { ...intent, status: "delivered" };
  }
  const next = commerceNotificationMemoryStore.updateIntent(intent.intentId, {
    status: "queued",
  });
  return next ?? { ...intent, status: "queued" };
}

async function deliverInAppIntent(
  intent: CommerceNotificationIntent,
  eventType: CommerceNotificationEventType,
  supabase: SupabaseClient | null
): Promise<Partial<CommerceNotificationIntent> | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc(
      "create_store_commerce_notification",
      {
        p_recipient_id: intent.recipientId,
        p_actor_id: null,
        p_type: commerceEventToNotificationType(eventType),
        p_title: intent.title,
        p_body: intent.body,
        p_entity_type: "commerce",
        p_entity_id: intent.eventId,
        p_href: intent.deepLink,
        p_metadata: {
          intent_id: intent.intentId,
          event_id: intent.eventId,
          template_id: intent.templateId,
          channel: "in_app",
        } satisfies CommerceSafeMetadata,
        p_dedupe_key: intent.dedupeKey,
      }
    );
    if (error) {
      return { status: "failed", suppressedReason: error.message };
    }
    return {
      status: "delivered",
      inAppNotificationId: data ? String(data) : null,
    };
  } catch (err) {
    return {
      status: "failed",
      suppressedReason: err instanceof Error ? err.message : "delivery_failed",
    };
  }
}

/**
 * Best-effort wrapper — never throws into checkout/payment/admin flows.
 */
export function notifyCommerceBestEffort(
  input: EmitCommerceNotificationInput
): EmitCommerceNotificationResult | null {
  try {
    return emitCommerceNotificationEvent(input);
  } catch {
    return null;
  }
}

export function buildBuyerNotificationReadModel(recipientId: string) {
  const items = commerceNotificationMemoryStore.listIntentsForRecipient(
    recipientId
  );
  return {
    recipientId,
    unreadCount:
      commerceNotificationMemoryStore.unreadCountForRecipient(recipientId),
    recent: items.slice().reverse(),
  };
}

export function buildSellerNotificationReadModel(recipientId: string) {
  return buildBuyerNotificationReadModel(recipientId);
}

export function buildAdminNotificationDiagnostics(limit = 40) {
  return {
    version: COMMERCE_TRANSACTIONAL_NOTIFICATIONS_VERSION,
    events: commerceNotificationMemoryStore.listEvents(limit),
    intents: commerceNotificationMemoryStore.listIntents(limit * 2),
    templates: commerceNotificationTemplateRegistry.list(),
    externalChannels: {
      email: false,
      sms: false,
      push: false,
    },
  };
}
