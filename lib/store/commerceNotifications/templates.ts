import type {
  CommerceNotificationEventType,
  CommerceNotificationTemplate,
  CommerceRecipientRole,
} from "./types";

const LOCALES = ["en", "ar"] as const;

function tpl(
  eventType: CommerceNotificationEventType,
  role: CommerceRecipientRole,
  requiredVariables: string[] = ["orderId"]
): CommerceNotificationTemplate {
  return {
    templateId: `tpl.commerce.${eventType}.${role}.v1`,
    eventType,
    recipientRole: role,
    locales: [...LOCALES],
    titleKey: `commerce.notifications.${eventType}.${role}.title`,
    bodyKey: `commerce.notifications.${eventType}.${role}.body`,
    requiredVariables,
    lifecycle: "active",
    version: 1,
  };
}

export function buildCommerceNotificationTemplates(): CommerceNotificationTemplate[] {
  return [
    tpl("order_created", "buyer"),
    tpl("order_created", "seller"),
    tpl("payment_pending", "buyer"),
    tpl("payment_captured", "buyer"),
    tpl("payment_captured", "seller"),
    tpl("payment_failed", "buyer"),
    tpl("order_confirmed", "buyer"),
    tpl("order_confirmed", "seller"),
    tpl("order_cancelled", "buyer"),
    tpl("order_cancelled", "seller"),
    tpl("fulfillment_ready", "seller"),
    tpl("digital_access_granted", "buyer"),
    tpl("order_shipped", "buyer"),
    tpl("order_shipped", "seller"),
    tpl("order_delivered", "buyer"),
    tpl("order_delivered", "seller"),
    tpl("refund_requested", "buyer"),
    tpl("refund_requested", "seller"),
    tpl("refund_completed", "buyer"),
    tpl("refund_completed", "seller"),
    tpl("product_approved", "seller", ["productId"]),
    tpl("product_rejected", "seller", ["productId"]),
    tpl("seller_approved", "seller", ["storeId"]),
    tpl("seller_rejected", "seller", ["storeId"]),
    tpl("inventory_low", "seller", ["sku"]),
    tpl("inventory_out", "seller", ["sku"]),
    tpl("payout_ready", "seller", ["storeId"]),
    tpl("payout_blocked", "seller", ["storeId"]),
    tpl("product_approved", "platform_admin", ["productId"]),
    tpl("product_rejected", "platform_admin", ["productId"]),
    tpl("seller_approved", "platform_admin", ["storeId"]),
    tpl("order_created", "supplier"),
    tpl("order_shipped", "supplier"),
    tpl("fulfillment_ready", "supplier"),
  ];
}

export class CommerceNotificationTemplateRegistry {
  private readonly byId = new Map<string, CommerceNotificationTemplate>();

  constructor(templates: CommerceNotificationTemplate[] = buildCommerceNotificationTemplates()) {
    for (const t of templates) this.byId.set(t.templateId, t);
  }

  list(): CommerceNotificationTemplate[] {
    return [...this.byId.values()];
  }

  get(templateId: string): CommerceNotificationTemplate | null {
    return this.byId.get(templateId) ?? null;
  }

  select(
    eventType: CommerceNotificationEventType,
    role: CommerceRecipientRole,
    locale = "en"
  ): CommerceNotificationTemplate | null {
    const match = this.list().find(
      (t) =>
        t.eventType === eventType &&
        t.recipientRole === role &&
        t.lifecycle === "active"
    );
    if (!match) return null;
    if (!match.locales.includes(locale) && !match.locales.includes("en")) {
      return null;
    }
    return match;
  }

  resolveLocale(template: CommerceNotificationTemplate, locale: string): string {
    if (template.locales.includes(locale)) return locale;
    if (template.locales.includes("en")) return "en";
    return template.locales[0] ?? "en";
  }
}

export const commerceNotificationTemplateRegistry =
  new CommerceNotificationTemplateRegistry();

/** Safe English fallbacks for V1 (keys remain source of truth for i18n later). */
export function renderCommerceTemplateCopy(
  eventType: CommerceNotificationEventType,
  role: CommerceRecipientRole
): { title: string; body: string } {
  const label = eventType.replace(/_/g, " ");
  return {
    title: `Commerce · ${label}`,
    body: `A ${label} update is available for you as ${role}.`,
  };
}
