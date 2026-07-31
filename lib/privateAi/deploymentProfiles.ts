import type { DeploymentProfile } from "./types";

export const DEPLOYMENT_PROFILES: DeploymentProfile[] = [
  {
    id: "development",
    label: "Development",
    description: "Local developer experimentation profiles.",
    allowsExternalProviders: true,
    requiresAirGap: false,
    hardwareContractId: "hw_cpu_dev",
  },
  {
    id: "internal",
    label: "Internal",
    description: "Internal staff evaluation environments.",
    allowsExternalProviders: true,
    requiresAirGap: false,
    hardwareContractId: "hw_gpu_internal",
  },
  {
    id: "testing",
    label: "Testing",
    description: "QA and regression evaluation environments.",
    allowsExternalProviders: true,
    requiresAirGap: false,
    hardwareContractId: "hw_gpu_internal",
  },
  {
    id: "production",
    label: "Production",
    description: "Production-serving profile (future).",
    allowsExternalProviders: true,
    requiresAirGap: false,
    hardwareContractId: "hw_gpu_internal",
  },
  {
    id: "offline",
    label: "Offline",
    description: "Offline-capable private model profile.",
    allowsExternalProviders: false,
    requiresAirGap: false,
    hardwareContractId: "hw_gpu_internal",
  },
  {
    id: "air_gapped",
    label: "Air-gapped",
    description: "No external network egress.",
    allowsExternalProviders: false,
    requiresAirGap: true,
    hardwareContractId: "hw_airgap_secure",
  },
];

export function getDeploymentProfile(id: DeploymentProfile["id"]) {
  return DEPLOYMENT_PROFILES.find((p) => p.id === id) ?? null;
}

export function listDeploymentProfiles(): DeploymentProfile[] {
  return [...DEPLOYMENT_PROFILES];
}
