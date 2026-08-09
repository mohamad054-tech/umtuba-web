# UM Core — SDK Client Factory Foundation V1 (P21)

**Status:** Closed (thin in-process port-borrow factory only)
**Branch:** `office/um-core-platform-sdk-factory-foundation-v1`
**Base:** `origin/alpha-0.2` @ `c8f5c9657ab4670d676f7ce6640ea30fd837890d` (P17 + P18 join)
**Normative base:** UM_CORE_SPECIFICATION_V1 · UM_CORE_ENGINEERING_STANDARDS_V1
**Canonical identity:** `um.core.sdk_client_factory_foundation_v1`
**Task ID:** `UM_CORE_PLATFORM_SDK_FACTORY_FOUNDATION_IMPLEMENTATION_V1`

## Goal

Provide the smallest **deterministic**, **explicit-DI**, **fail-closed** SDK
factory that composes already-landed Core runtime ports:

| Port | Phase | Client member |
| --- | --- | --- |
| `UmFlagEvaluator` | P14 | `flags` |
| `UmCapabilityAsserter` | P15 | `capabilities` |
| `UmEventPublisher.publish` | P16 | `events` |
| `UmHealthReporter` | P17 | `health` |
| `UmInMemoryPlatformRegistry.register` | P4 | `register` |

## Architectural rules

**SDK FACTORY IS NOT REGISTRY CONSTRUCTION.**
**SDK FACTORY IS NOT DIAGNOSTICS JOIN.**
**SDK FACTORY IS NOT FLEET AGGREGATION.**
**SDK FACTORY IS NOT REFERENTIAL INTEGRITY.**
**SDK FACTORY IS NOT A PRODUCT INTEGRATION LAYER.**

## API

```ts
createInMemoryUmCoreSdkFactory({
  flags,
  capabilities,
  events,
  health,
  platforms, // Pick<UmInMemoryPlatformRegistry, "register">
}): UmCoreSdkFactory

factory.createClient(identity): UmCoreSdkClient
client.register(manifest): UmPlatformRegistrationResult
```

## Behavior

- Factory/client freeze facade objects; ports keep their own mutability
- Multiple clients share the same borrowed port references
- Identity is validated (`serviceId` / `platformId` non-empty; `platformId` machine id) then frozen
- Missing required deps throw at factory construction
- Ordinary P14–P17 / P4 negatives remain result-returning (not thrown)
- No auto-stamping of identity onto envelopes or health snapshots

## Deferred / non-goals

- P12 aggregate registry construction
- P13 / referential integrity validators
- P18 diagnostics join / fleet aggregation
- Networking, persistence, polling, scheduler, probe execution
- Product SDKs (Translation / Commerce / Learning / Collaboration / paid AI)
- Migrations / DB writes / alpha merge

## Proposed commit subject

`feat(core): add UM Core SDK client factory foundation v1`
