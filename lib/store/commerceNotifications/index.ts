export {
  COMMERCE_TRANSACTIONAL_NOTIFICATIONS_VERSION,
  COMMERCE_NOTIFICATION_EVENT_TYPES,
  commerceEventToNotificationType,
} from "./types";
export type {
  CommerceNotificationChannel,
  CommerceNotificationEvent,
  CommerceNotificationEventType,
  CommerceNotificationIntent,
  CommerceNotificationPermission,
  CommerceNotificationTemplate,
  CommerceIntentDeliveryStatus,
  CommerceRecipientRole,
  CommerceSafeMetadata,
  ResolvedRecipient,
} from "./types";

export {
  redactCommerceMetadata,
  assertNoSensitiveMetadata,
} from "./redaction";
export {
  buildCommerceDeepLink,
  isAllowedCommerceDeepLink,
  sanitizeCommerceDeepLink,
} from "./deepLinks";
export {
  resolveCommerceNotificationRecipients,
  assertSameStoreScope,
} from "./recipients";
export type { RecipientResolutionInput, RecipientResolutionResult } from "./recipients";
export {
  commerceNotificationTemplateRegistry,
  buildCommerceNotificationTemplates,
  renderCommerceTemplateCopy,
  CommerceNotificationTemplateRegistry,
} from "./templates";
export {
  hasCommerceNotificationPermission,
  COMMERCE_NOTIFICATION_SERVER_CREATE,
} from "./permissions";
export type { CommerceNotificationAuthContext } from "./permissions";
export {
  EXTERNAL_CHANNEL_CONTRACT,
  COMMERCE_EXTERNAL_CHANNELS,
  isExternalCommerceChannel,
  assertExternalChannelsDisabled,
} from "./channels";
export {
  commerceNotificationMemoryStore,
  resetCommerceNotificationFoundation,
  CommerceNotificationMemoryStore,
} from "./store";
export {
  emitCommerceNotificationEvent,
  notifyCommerceBestEffort,
  buildEventIdempotencyKey,
  buildBuyerNotificationReadModel,
  buildSellerNotificationReadModel,
  buildAdminNotificationDiagnostics,
} from "./service";
export type {
  EmitCommerceNotificationInput,
  EmitCommerceNotificationResult,
} from "./service";
export {
  wireCommerceOrderCreated,
  wireCommercePaymentOutcome,
  wireCommerceFulfillmentUpdate,
  wireCommerceModeration,
  wireCommerceRefundCompleted,
  wireCommerceInventorySignal,
} from "./wire";
