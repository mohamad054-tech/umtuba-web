import type { SupabaseClient } from "@supabase/supabase-js";
import { executeAiGateway } from "../../gateway/execute";
import { installReferenceTools } from "../../tools/registry";
import { getOwnedOrMemberStore, getSellerProductBundle } from "../../../store/sellerStore";
import { canManageCatalog } from "../../../store/permissions";
import type { AiResult } from "../../contracts/types";
import { createAiSession } from "../../sessions/session";

let toolsReady = false;

export function resetAiReferenceToolsForTests(): void {
  toolsReady = false;
}

export function ensureAiReferenceToolsInstalled(
  supabase?: SupabaseClient | null
): void {
  if (toolsReady) return;
  installReferenceTools({
    readSellerStoreSummary: async ({ args, userId }) => {
      if (!supabase) {
        return { ok: false, message: "Store summary unavailable." };
      }
      const storeId = String(args.storeId ?? "");
      const membership = await getOwnedOrMemberStore(supabase, userId);
      if (!membership || membership.store.id !== storeId) {
        return { ok: false, message: "Store access denied." };
      }
      return {
        ok: true,
        data: {
          storeId: membership.store.id,
          name: membership.store.name,
          slug: membership.store.slug,
          status: membership.store.status,
          verificationStatus: membership.store.verification_status,
        },
      };
    },
    readProductDraft: async ({ args, userId }) => {
      if (!supabase) {
        return { ok: false, message: "Product draft unavailable." };
      }
      const productId = String(args.productId ?? "");
      const bundle = await getSellerProductBundle(supabase, userId, productId);
      if (!bundle.ok) {
        return { ok: false, message: bundle.message };
      }
      if (!canManageCatalog(bundle.role)) {
        return { ok: false, message: "Catalog permission denied." };
      }
      return {
        ok: true,
        data: {
          productId: bundle.product.id,
          title: bundle.product.title,
          shortDescription: bundle.product.short_description,
          description: bundle.product.description,
          status: bundle.product.status,
          // Intentionally omit price and inventory.
        },
      };
    },
    readUserPreferences: async ({ userId }) => ({
      ok: true,
      data: {
        userId,
        locale: null,
        note: "Bounded preference stub for V1.",
      },
    }),
  });
  toolsReady = true;
}

export type ProductDraftSuggestion = {
  title: string;
  description: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  runId: string;
  promptVersion: string;
  modelId: string;
  labeledAsAiGenerated: true;
  autoSaved: false;
  canAlterPrice: false;
  canAlterInventory: false;
  canPublish: false;
};

/**
 * Reference consumer: suggests product copy only.
 * Never auto-saves, never mutates price/inventory/publication.
 */
export async function runProductDraftAssistant(input: {
  supabase: SupabaseClient;
  userId: string;
  productId: string;
  sellerNotes?: string;
  forceStub?: boolean;
}): Promise<AiResult<ProductDraftSuggestion>> {
  ensureAiReferenceToolsInstalled(input.supabase);

  const bundle = await getSellerProductBundle(
    input.supabase,
    input.userId,
    input.productId
  );
  if (!bundle.ok) {
    return { ok: false, code: "permission_denied", message: bundle.message };
  }
  if (!canManageCatalog(bundle.role)) {
    return {
      ok: false,
      code: "permission_denied",
      message: "You cannot edit this product catalog.",
    };
  }

  const membership = await getOwnedOrMemberStore(input.supabase, input.userId);
  if (!membership || membership.store.id !== bundle.product.store_id) {
    return {
      ok: false,
      code: "permission_denied",
      message: "Product is outside your store.",
    };
  }

  const session = createAiSession({
    userId: input.userId,
    productDomain: "commerce",
    workspaceId: membership.store.id,
    locale: null,
  });

  const userInput = [
    `Current title: ${bundle.product.title}`,
    `Current short description: ${bundle.product.short_description ?? ""}`,
    `Current description: ${bundle.product.description ?? ""}`,
    input.sellerNotes?.trim()
      ? `Seller notes: ${input.sellerNotes.trim()}`
      : "",
    "Suggest improved title, description, tags, and SEO fields for human review.",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await executeAiGateway(
    input.userId,
    {
      capabilityId: "commerce.product_draft_assistant",
      promptId: "commerce.product_draft_assistant",
      userInput,
      outputMode: "structured_json",
      allowedToolIds: ["read_product_draft", "read_seller_store_summary"],
      sessionId: session.id,
      context: {
        productDomain: "commerce",
        surface: "seller.product_editor",
        dataClassification: "confidential",
        storeId: membership.store.id,
        workspaceId: membership.store.id,
        role: membership.role,
        allowedCapabilities: ["commerce.product_draft_assistant"],
        allowedToolIds: ["read_product_draft", "read_seller_store_summary"],
        resourceRefs: [{ type: "product", id: bundle.product.id }],
      },
      _test: input.forceStub ? { forceStub: true, bypassRateLimit: true } : undefined,
    },
    {
      supabase: input.supabase,
      permissions: ["store.catalog.read", "user.self.read"],
      capabilityEligible: true,
    }
  );

  if (!result.ok) return result;
  const structured = result.data.structured ?? {};
  return {
    ok: true,
    data: {
      title: String(structured.title ?? ""),
      description: String(structured.description ?? ""),
      tags: Array.isArray(structured.tags)
        ? structured.tags.map(String).slice(0, 8)
        : [],
      seoTitle: String(structured.seoTitle ?? ""),
      seoDescription: String(structured.seoDescription ?? ""),
      runId: result.data.runId,
      promptVersion: result.data.promptVersion,
      modelId: result.data.modelId,
      labeledAsAiGenerated: true,
      autoSaved: false,
      canAlterPrice: false,
      canAlterInventory: false,
      canPublish: false,
    },
  };
}
