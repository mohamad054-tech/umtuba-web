import type { HardwareContract } from "./types";

/**
 * Hardware contracts describe future runtime requirements.
 * No provisioning in this milestone.
 */
export const HARDWARE_CONTRACTS: HardwareContract[] = [
  {
    id: "hw_cpu_dev",
    label: "CPU Development",
    cpuCoresMin: 4,
    gpuRequired: false,
    gpuClass: null,
    ramGbMin: 16,
    storageGbMin: 64,
    vramGbMin: null,
    acceleration: ["none"],
    containerProfile: "umtuba-ai-dev-cpu",
    notes: "Local development contract only.",
  },
  {
    id: "hw_gpu_internal",
    label: "GPU Internal",
    cpuCoresMin: 8,
    gpuRequired: true,
    gpuClass: "nvidia-consumer-or-datacenter",
    ramGbMin: 32,
    storageGbMin: 256,
    vramGbMin: 16,
    acceleration: ["cuda", "tensorrt-optional"],
    containerProfile: "umtuba-ai-internal-gpu",
    notes: "Internal evaluation / candidate profiling.",
  },
  {
    id: "hw_airgap_secure",
    label: "Air-gapped Secure",
    cpuCoresMin: 16,
    gpuRequired: true,
    gpuClass: "datacenter",
    ramGbMin: 64,
    storageGbMin: 1024,
    vramGbMin: 40,
    acceleration: ["cuda"],
    containerProfile: "umtuba-ai-airgap",
    notes: "Offline / air-gapped deployment contract.",
  },
];

export function getHardwareContract(id: string): HardwareContract | null {
  return HARDWARE_CONTRACTS.find((h) => h.id === id) ?? null;
}

export function listHardwareContracts(): HardwareContract[] {
  return [...HARDWARE_CONTRACTS];
}
