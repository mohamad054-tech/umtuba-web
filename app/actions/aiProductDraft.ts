"use server";

import { revalidatePath } from "next/cache";
import { createClient, getServerUser } from "../../lib/supabase/server";
import { runProductDraftAssistant } from "../../lib/ai/productDraftAssistant";

export type ProductDraftAssistantActionState = {
  ok: boolean;
  message?: string;
  suggestion?: {
    title: string;
    description: string;
    tags: string[];
    seoTitle: string;
    seoDescription: string;
    runId: string;
    promptVersion: string;
    modelId: string;
  };
};

export async function suggestProductDraftAction(
  _prev: ProductDraftAssistantActionState,
  formData: FormData
): Promise<ProductDraftAssistantActionState> {
  const user = await getServerUser();
  if (!user) {
    return { ok: false, message: "Authentication required." };
  }

  const productId = String(formData.get("productId") ?? "").trim();
  const sellerNotes = String(formData.get("sellerNotes") ?? "").trim();
  if (!productId) {
    return { ok: false, message: "Product id is required." };
  }

  const supabase = await createClient();
  const result = await runProductDraftAssistant({
    supabase,
    userId: user.id,
    productId,
    sellerNotes: sellerNotes || undefined,
  });

  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  // Explicitly do not write product fields. Seller must apply manually.
  revalidatePath(`/seller/store/products/${productId}/edit`);
  return {
    ok: true,
    suggestion: {
      title: result.data.title,
      description: result.data.description,
      tags: result.data.tags,
      seoTitle: result.data.seoTitle,
      seoDescription: result.data.seoDescription,
      runId: result.data.runId,
      promptVersion: result.data.promptVersion,
      modelId: result.data.modelId,
    },
  };
}
