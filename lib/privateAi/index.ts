export type {
  AiCapabilityId,
  CapabilityRecord,
  DeploymentProfile,
  DeploymentProfileId,
  HardwareContract,
  ModelFamilyKind,
  PermissionScope,
  PersistedPrivateAiState,
  PrivateAiAuditTrailEntry,
  PrivateAiLifecycle,
  PrivateAiPermission,
  PrivateAiReadinessResult,
  PrivateAiWorkflowAction,
  PrivateModelClass,
  PrivateModelRecord,
  RoutingContract,
  RoutingTargetKind,
} from "./types";

export {
  AI_CAPABILITY_CATALOG,
  buildCapabilityRegistry,
  getCapabilityDefinition,
} from "./capabilities";

export {
  assertTransitionPrivateAiLifecycle,
  canTransitionPrivateAiLifecycle,
  listAllowedPrivateAiTransitions,
  PRIVATE_AI_LIFECYCLE_ORDER,
  transitionRequiresReason,
  workflowActionForTransition,
} from "./lifecycle";

export {
  evaluatePrivateAiReadiness,
  readinessRequiredForTransition,
} from "./readiness";

export { createPrivateAiAuditEntry } from "./audit";

export {
  getHardwareContract,
  HARDWARE_CONTRACTS,
  listHardwareContracts,
} from "./hardwareContracts";

export {
  DEPLOYMENT_PROFILES,
  getDeploymentProfile,
  listDeploymentProfiles,
} from "./deploymentProfiles";

export {
  assertRoutingContractShape,
  buildDefaultRoutingContracts,
} from "./routingContracts";

export {
  createPrivateAiPermission,
  DEFAULT_PLATFORM_ADMIN_ACTIONS,
  hasModelLifecyclePermission,
  hasPermission,
} from "./permissions";

export {
  emptyPrivateAiState,
  privateAiStorePath,
  readPersistedPrivateAiState,
  resolvePrivateAiDataDir,
  writePersistedPrivateAiState,
} from "./fileStore";

export { buildPrivateAiSeedState } from "./seed";

export {
  createPrivateAiService,
  getPrivateAiService,
  resetPrivateAiForTests,
  type AdvanceLifecycleInput,
  type PrivateAiService,
  type RegisterPrivateModelInput,
} from "./service";
