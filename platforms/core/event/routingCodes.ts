/**
 * Deterministic event routing finding codes (UM Core P7).
 */

export const UmEventRoutingCode = {
  UNKNOWN_EVENT_TYPE: "event_routing.unknown_event_type",
  PRODUCER_INVALID: "event_routing.producer_invalid",
  UNKNOWN_DESTINATION: "event_routing.unknown_destination",
  DESTINATION_REQUIRED: "event_routing.destination_required",
  DESTINATION_NAMING: "event_routing.destination_naming",
  EVENT_TYPE_REQUIRED: "event_routing.event_type_required",
  DUPLICATE_ROUTE: "event_routing.duplicate_route",
  REGISTERED: "event_routing.registered",
} as const;

export type UmEventRoutingCodeName =
  (typeof UmEventRoutingCode)[keyof typeof UmEventRoutingCode];
