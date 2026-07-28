import type { AiDataClassification } from "../contracts/types";
import { AiPlatformError } from "../contracts/errors";

export type AiToolDefinition = {
  toolId: string;
  domainOwner: string;
  description: string;
  inputSchema: { required: string[] };
  outputSchema: { type: "object" };
  requiredPermissions: string[];
  dataClassification: AiDataClassification;
  mutating: boolean;
  confirmationRequired: boolean;
  idempotent: boolean;
  auditRequired: boolean;
  available: boolean;
  executor: AiToolExecutor;
};

export type AiToolExecutor = (input: {
  args: Record<string, unknown>;
  userId: string;
  storeId?: string | null;
  permissions: string[];
}) => Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; message: string }>;

const TOOLS: AiToolDefinition[] = [];

export function registerTool(tool: AiToolDefinition): void {
  const idx = TOOLS.findIndex((t) => t.toolId === tool.toolId);
  if (idx >= 0) TOOLS[idx] = tool;
  else TOOLS.push(tool);
}

export function listTools(): AiToolDefinition[] {
  return [...TOOLS];
}

export function getTool(toolId: string): AiToolDefinition | null {
  return TOOLS.find((t) => t.toolId === toolId) ?? null;
}

export async function invokeTool(input: {
  toolId: string;
  args: Record<string, unknown>;
  userId: string;
  storeId?: string | null;
  permissions: string[];
  allowlist: string[];
}): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; message: string }> {
  if (!input.allowlist.includes(input.toolId)) {
    throw new AiPlatformError("tool_denied", "Tool is not on the allowlist.");
  }
  const tool = getTool(input.toolId);
  if (!tool || !tool.available) {
    throw new AiPlatformError("tool_denied", "Tool is unavailable.");
  }
  if (tool.mutating) {
    throw new AiPlatformError(
      "tool_denied",
      "Mutating AI tools are not enabled in V1."
    );
  }
  for (const perm of tool.requiredPermissions) {
    if (!input.permissions.includes(perm)) {
      throw new AiPlatformError(
        "tool_denied",
        `Missing permission for tool: ${perm}`
      );
    }
  }
  for (const key of tool.inputSchema.required) {
    if (!(key in input.args)) {
      throw new AiPlatformError(
        "invalid_input",
        `Tool argument missing: ${key}`
      );
    }
  }
  const result = await tool.executor({
    args: input.args,
    userId: input.userId,
    storeId: input.storeId,
    permissions: input.permissions,
  });
  if (!result.ok) {
    throw new AiPlatformError("tool_failure", result.message);
  }
  return result;
}

/** Reference read-only tools (wired at module load). */
export function installReferenceTools(deps: {
  readSellerStoreSummary: AiToolExecutor;
  readProductDraft: AiToolExecutor;
  readUserPreferences: AiToolExecutor;
}): void {
  registerTool({
    toolId: "read_seller_store_summary",
    domainOwner: "commerce",
    description: "Read a bounded seller store summary for the caller.",
    inputSchema: { required: ["storeId"] },
    outputSchema: { type: "object" },
    requiredPermissions: ["store.catalog.read"],
    dataClassification: "confidential",
    mutating: false,
    confirmationRequired: false,
    idempotent: true,
    auditRequired: true,
    available: true,
    executor: deps.readSellerStoreSummary,
  });
  registerTool({
    toolId: "read_product_draft",
    domainOwner: "commerce",
    description: "Read an authorized seller product draft.",
    inputSchema: { required: ["productId"] },
    outputSchema: { type: "object" },
    requiredPermissions: ["store.catalog.read"],
    dataClassification: "confidential",
    mutating: false,
    confirmationRequired: false,
    idempotent: true,
    auditRequired: true,
    available: true,
    executor: deps.readProductDraft,
  });
  registerTool({
    toolId: "read_user_profile_preferences",
    domainOwner: "platform",
    description: "Read bounded current-user preference flags.",
    inputSchema: { required: [] },
    outputSchema: { type: "object" },
    requiredPermissions: ["user.self.read"],
    dataClassification: "internal",
    mutating: false,
    confirmationRequired: false,
    idempotent: true,
    auditRequired: false,
    available: true,
    executor: deps.readUserPreferences,
  });
  registerTool({
    toolId: "mutating_forbidden_example",
    domainOwner: "platform",
    description: "Sentinel mutating tool — always denied in V1.",
    inputSchema: { required: [] },
    outputSchema: { type: "object" },
    requiredPermissions: ["platform.admin"],
    dataClassification: "restricted",
    mutating: true,
    confirmationRequired: true,
    idempotent: false,
    auditRequired: true,
    available: true,
    executor: async () => ({ ok: false, message: "Mutating tools disabled." }),
  });
}
