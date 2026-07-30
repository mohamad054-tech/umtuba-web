/**
 * Focused tests — Commerce Seller Digital Product Asset Upload V1.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  MAX_STORE_DIGITAL_PRODUCT_ASSET_BYTES,
  STORE_PRODUCT_MEDIA_BUCKET,
  buildStoreDigitalProductAssetPath,
  isOwnedStoreDigitalProductAssetPath,
} from "./mediaConstants";
import { validateStoreDigitalAssetFile } from "./mediaValidation";
import {
  SELLER_DIGITAL_ASSET_UPLOAD_ID,
  finalizeSellerDigitalAssetAttach,
  prepareSellerDigitalAssetUpload,
} from "./digitalAssetUpload";
import {
  mintBuyerDigitalAccessSignedUrl,
  resolveDigitalDeliveryAvailability,
} from "./digitalAccessDelivery";

const ROOT = join(__dirname, "../..");
const SELLER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const PRODUCT = "66666666-6666-4666-8666-666666666666";
const STORE = "77777777-7777-4777-8777-777777777777";
const FILE = "88888888-8888-4888-8888-888888888888";
const OLD_FILE = "99999999-9999-4999-8999-999999999999";
const ENTITLEMENT = "33333333-3333-4333-8333-333333333333";
const ORDER = "44444444-4444-4444-8444-444444444444";
const ORDER_ITEM = "55555555-5555-4555-8555-555555555555";
const BUYER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const SAFE_PATH = buildStoreDigitalProductAssetPath(STORE, PRODUCT, FILE, "pdf");
const OLD_PATH = buildStoreDigitalProductAssetPath(
  STORE,
  PRODUCT,
  OLD_FILE,
  "pdf"
);

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function membershipClient(role: string | null) {
  return {
    from: vi.fn((table: string) => {
      if (table === "store_products") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: PRODUCT,
                  store_id: STORE,
                  product_type: "digital",
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "store_members") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: role ? { role, status: "active" } : null,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    }),
  };
}

function physicalProductClient() {
  return {
    from: vi.fn((table: string) => {
      if (table === "store_products") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: PRODUCT,
                  store_id: STORE,
                  product_type: "physical",
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "store_members") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: { role: "owner", status: "active" },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    }),
  };
}

describe("Seller digital asset upload — contracts", () => {
  it("exposes capability id and keeps private bucket constant", () => {
    expect(SELLER_DIGITAL_ASSET_UPLOAD_ID).toMatch(
      /seller_product_asset_upload/
    );
    expect(STORE_PRODUCT_MEDIA_BUCKET).toBe("store-product-media");
    expect(MAX_STORE_DIGITAL_PRODUCT_ASSET_BYTES).toBe(10 * 1024 * 1024);
  });

  it("adds additive bucket MIME migration without public bucket", () => {
    const migrations = readdirSync(join(ROOT, "supabase/migrations"));
    expect(
      migrations.some((f) =>
        f.includes("20260879_store_seller_digital_product_asset_upload")
      )
    ).toBe(true);
    const sql = read(
      "supabase/migrations/20260879_store_seller_digital_product_asset_upload_v1.sql"
    );
    expect(sql).toMatch(/allowed_mime_types/);
    expect(sql).toMatch(/application\/pdf/);
    expect(sql).toMatch(/public = false/);
    expect(sql).not.toMatch(/payout|carrier|warehouse|refund/i);
    expect(sql).not.toMatch(/drop table/i);
  });

  it("rejects unsafe names, unsupported types, and oversized files", () => {
    expect(
      validateStoreDigitalAssetFile({
        fileName: "../evil.pdf",
        mimeType: "application/pdf",
        byteSize: 100,
      }).ok
    ).toBe(false);
    expect(
      validateStoreDigitalAssetFile({
        fileName: "notes.exe",
        mimeType: "application/octet-stream",
        byteSize: 100,
      }).ok
    ).toBe(false);
    expect(
      validateStoreDigitalAssetFile({
        fileName: "notes.pdf",
        mimeType: "application/pdf",
        byteSize: MAX_STORE_DIGITAL_PRODUCT_ASSET_BYTES + 1,
      }).ok
    ).toBe(false);
    const ok = validateStoreDigitalAssetFile({
      fileName: "guide.pdf",
      mimeType: "application/pdf",
      byteSize: 2048,
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.extension).toBe("pdf");
      expect(ok.mimeType).toBe("application/pdf");
    }
  });

  it("rejects path traversal and forged owned-path claims", () => {
    expect(
      isOwnedStoreDigitalProductAssetPath(
        STORE,
        PRODUCT,
        `stores/${STORE}/products/${PRODUCT}/digital/../secret.pdf`
      )
    ).toBe(false);
    expect(
      isOwnedStoreDigitalProductAssetPath(
        STORE,
        PRODUCT,
        `stores/${OTHER}/products/${PRODUCT}/digital/${FILE}.pdf`
      )
    ).toBe(false);
    expect(isOwnedStoreDigitalProductAssetPath(STORE, PRODUCT, SAFE_PATH)).toBe(
      true
    );
  });
});

describe("Seller digital asset upload — prepare", () => {
  it("authorized seller receives a server-generated owned path", async () => {
    const result = await prepareSellerDigitalAssetUpload(
      membershipClient("catalog_editor") as never,
      {
        productId: PRODUCT,
        userId: SELLER,
        fileName: "pack.pdf",
        mimeType: "application/pdf",
        byteSize: 4096,
      }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      isOwnedStoreDigitalProductAssetPath(STORE, PRODUCT, result.storagePath)
    ).toBe(true);
    expect(result.contentType).toBe("application/pdf");
    expect(result.storagePath).toContain(`/digital/`);
    expect(result.storagePath).not.toMatch(/\.\./);
  });

  it("unauthenticated and unauthorized sellers fail closed", async () => {
    const anon = await prepareSellerDigitalAssetUpload(
      membershipClient("owner") as never,
      {
        productId: PRODUCT,
        userId: null,
        fileName: "pack.pdf",
        mimeType: "application/pdf",
        byteSize: 100,
      }
    );
    expect(anon.ok).toBe(false);
    if (!anon.ok) expect(anon.code).toBe("unauthenticated");

    const forbidden = await prepareSellerDigitalAssetUpload(
      membershipClient("viewer") as never,
      {
        productId: PRODUCT,
        userId: SELLER,
        fileName: "pack.pdf",
        mimeType: "application/pdf",
        byteSize: 100,
      }
    );
    expect(forbidden.ok).toBe(false);
    if (!forbidden.ok) expect(forbidden.code).toBe("forbidden");
  });

  it("physical products fail closed", async () => {
    const result = await prepareSellerDigitalAssetUpload(
      physicalProductClient() as never,
      {
        productId: PRODUCT,
        userId: SELLER,
        fileName: "pack.pdf",
        mimeType: "application/pdf",
        byteSize: 100,
      }
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("physical_product");
  });
});

describe("Seller digital asset upload — finalize / replacement safety", () => {
  it("failed object verification does not activate and preserves previous", async () => {
    const updates: unknown[] = [];
    const inserts: unknown[] = [];
    const admin = {
      from: vi.fn((table: string) => {
        if (table === "store_digital_product_assets") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: "asset-1",
                      storage_path: OLD_PATH,
                      status: "active",
                      title: "old",
                    },
                    error: null,
                  }),
                }),
              }),
            }),
            update: (payload: unknown) => {
              updates.push(payload);
              return {
                eq: () => ({
                  eq: () => ({
                    eq: async () => ({ error: null }),
                  }),
                }),
              };
            },
            insert: (payload: unknown) => {
              inserts.push(payload);
              return Promise.resolve({ error: null });
            },
          };
        }
        throw new Error(table);
      }),
      storage: {
        from: () => ({
          createSignedUrl: async () => ({
            data: null,
            error: { message: "missing" },
          }),
        }),
      },
    };

    const result = await finalizeSellerDigitalAssetAttach(
      membershipClient("owner") as never,
      {
        productId: PRODUCT,
        userId: SELLER,
        storagePath: SAFE_PATH,
        title: "new",
      },
      { admin: admin as never }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("object_missing");
      expect(result.previousPreserved).toBe(true);
    }
    expect(updates).toHaveLength(0);
    expect(inserts).toHaveLength(0);
  });

  it("forged path fails closed without DB write", async () => {
    let wrote = false;
    const admin = {
      from: vi.fn(() => {
        wrote = true;
        return {};
      }),
      storage: {
        from: () => ({
          createSignedUrl: async () => ({
            data: { signedUrl: "https://example.test/x" },
            error: null,
          }),
        }),
      },
    };

    const result = await finalizeSellerDigitalAssetAttach(
      membershipClient("owner") as never,
      {
        productId: PRODUCT,
        userId: SELLER,
        storagePath: `stores/${OTHER}/products/${PRODUCT}/digital/${FILE}.pdf`,
      },
      { admin: admin as never }
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("unsafe_path");
      expect(result.previousPreserved).toBe(true);
    }
    expect(wrote).toBe(false);
  });

  it("failed attach after verified upload preserves previous active asset", async () => {
    const admin = {
      from: vi.fn((table: string) => {
        if (table === "store_digital_product_assets") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: "asset-1",
                      storage_path: OLD_PATH,
                      status: "active",
                      title: "old",
                    },
                    error: null,
                  }),
                }),
              }),
            }),
            update: () => ({
              eq: () => ({
                eq: () => ({
                  eq: async () => ({ error: { message: "db" } }),
                }),
              }),
            }),
          };
        }
        throw new Error(table);
      }),
      storage: {
        from: () => ({
          createSignedUrl: async () => ({
            data: { signedUrl: "https://example.test/signed" },
            error: null,
          }),
        }),
      },
    };

    const result = await finalizeSellerDigitalAssetAttach(
      membershipClient("manager") as never,
      {
        productId: PRODUCT,
        userId: SELLER,
        storagePath: SAFE_PATH,
        title: "replacement",
      },
      { admin: admin as never }
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("attach_failed");
      expect(result.previousPreserved).toBe(true);
    }
  });

  it("successful replacement switches the active asset safely", async () => {
    const updates: Array<Record<string, unknown>> = [];
    const admin = {
      from: vi.fn((table: string) => {
        if (table === "store_digital_product_assets") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: "asset-1",
                      storage_path: OLD_PATH,
                      status: "active",
                      title: "old",
                    },
                    error: null,
                  }),
                }),
              }),
            }),
            update: (payload: Record<string, unknown>) => {
              updates.push(payload);
              return {
                eq: () => ({
                  eq: () => ({
                    eq: async () => ({ error: null }),
                  }),
                }),
              };
            },
          };
        }
        throw new Error(table);
      }),
      storage: {
        from: () => ({
          createSignedUrl: async () => ({
            data: { signedUrl: "https://example.test/signed" },
            error: null,
          }),
        }),
      },
    };

    const result = await finalizeSellerDigitalAssetAttach(
      membershipClient("owner") as never,
      {
        productId: PRODUCT,
        userId: SELLER,
        storagePath: SAFE_PATH,
        title: "new-pack",
      },
      { admin: admin as never }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.replaced).toBe(true);
    expect(result.summary.uiStatus).toBe("active");
    expect(result.summary.fileExtension).toBe("pdf");
    expect(updates[0]?.storage_path).toBe(SAFE_PATH);
    expect(updates[0]?.status).toBe("active");
    expect(JSON.stringify(result)).not.toMatch(/SERVICE_ROLE|eyJ/);
    expect(JSON.stringify(result.summary)).not.toContain(SAFE_PATH);
  });

  it("first attach inserts a single active pointer", async () => {
    const inserts: Array<Record<string, unknown>> = [];
    const admin = {
      from: vi.fn((table: string) => {
        if (table === "store_digital_product_assets") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            }),
            insert: (payload: Record<string, unknown>) => {
              inserts.push(payload);
              return Promise.resolve({ error: null });
            },
          };
        }
        throw new Error(table);
      }),
      storage: {
        from: () => ({
          createSignedUrl: async () => ({
            data: { signedUrl: "https://example.test/signed" },
            error: null,
          }),
        }),
      },
    };

    const result = await finalizeSellerDigitalAssetAttach(
      membershipClient("catalog_editor") as never,
      {
        productId: PRODUCT,
        userId: SELLER,
        storagePath: SAFE_PATH,
        title: "pack",
      },
      { admin: admin as never }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.replaced).toBe(false);
    expect(inserts).toHaveLength(1);
    expect(inserts[0]?.status).toBe("active");
    expect(inserts[0]?.storage_path).toBe(SAFE_PATH);
  });
});

describe("Seller digital asset upload — buyer delivery continuity", () => {
  it("buyer delivery resolves the newly active asset path", async () => {
    const availability = await resolveDigitalDeliveryAvailability(
      {
        from: vi.fn((table: string) => {
          if (table === "store_products") {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: PRODUCT,
                      store_id: STORE,
                      product_type: "digital",
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "store_digital_product_assets") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: { storage_path: SAFE_PATH, status: "active" },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          throw new Error(table);
        }),
      } as never,
      {
        productId: PRODUCT,
        storeId: STORE,
        entitlementStatus: "active",
      }
    );
    expect(availability).toBe("available");

    const mint = await mintBuyerDigitalAccessSignedUrl(
      {
        from: vi.fn((table: string) => {
          if (table === "store_digital_entitlements") {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: ENTITLEMENT,
                      buyer_id: BUYER,
                      order_id: ORDER,
                      order_item_id: ORDER_ITEM,
                      product_id: PRODUCT,
                      store_id: STORE,
                      status: "active",
                      title_snapshot: "Pack",
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }
          throw new Error(table);
        }),
      } as never,
      { entitlementId: ENTITLEMENT, userId: BUYER },
      {
        admin: {
          from: vi.fn((table: string) => {
            if (table === "store_products") {
              return {
                select: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: {
                        id: PRODUCT,
                        store_id: STORE,
                        product_type: "digital",
                      },
                      error: null,
                    }),
                  }),
                }),
              };
            }
            if (table === "order_items") {
              return {
                select: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: {
                        id: ORDER_ITEM,
                        order_id: ORDER,
                        product_id: PRODUCT,
                      },
                      error: null,
                    }),
                  }),
                }),
              };
            }
            if (table === "store_digital_product_assets") {
              return {
                select: () => ({
                  eq: () => ({
                    eq: () => ({
                      maybeSingle: async () => ({
                        data: {
                          storage_path: SAFE_PATH,
                          status: "active",
                          title: "new-pack",
                        },
                        error: null,
                      }),
                    }),
                  }),
                }),
              };
            }
            throw new Error(table);
          }),
          storage: {
            from: (bucket: string) => {
              expect(bucket).toBe(STORE_PRODUCT_MEDIA_BUCKET);
              return {
                createSignedUrl: async (path: string, ttl: number) => {
                  expect(path).toBe(SAFE_PATH);
                  expect(ttl).toBeLessThanOrEqual(15 * 60);
                  return {
                    data: {
                      signedUrl: "https://example.test/signed-download",
                    },
                    error: null,
                  };
                },
              };
            },
          },
        } as never,
      }
    );

    expect(mint.ok).toBe(true);
    if (!mint.ok) return;
    expect(mint.signedUrl).toContain("https://");
    expect(mint.signedUrl).not.toMatch(/\/storage\/v1\/object\/public\//);
    expect(JSON.stringify(mint)).not.toContain(SAFE_PATH);
    expect(JSON.stringify(mint)).not.toMatch(/SERVICE_ROLE|eyJhbGci/);
  });
});

describe("Seller digital asset upload — surface wiring", () => {
  it("wires seller panel + actions without touching out-of-scope domains", () => {
    expect(
      existsSync(join(ROOT, "app/components/store/SellerDigitalAssetPanel.tsx"))
    ).toBe(true);
    expect(
      existsSync(join(ROOT, "app/actions/storeDigitalAssets.ts"))
    ).toBe(true);
    expect(
      existsSync(join(ROOT, "lib/store/digitalAssetUpload.ts"))
    ).toBe(true);
    const editPage = read(
      "app/seller/store/products/[productId]/edit/page.tsx"
    );
    expect(editPage).toMatch(/SellerDigitalAssetPanel/);
    expect(editPage).toMatch(/Digital deliverable/);
    expect(editPage).not.toMatch(/learning|ai.?tutor|creator space/i);

    const actions = read("app/actions/storeDigitalAssets.ts");
    expect(actions).toMatch(/prepareSellerDigitalAssetUploadAction/);
    expect(actions).toMatch(/finalizeSellerDigitalAssetAttachAction/);
    expect(actions).not.toMatch(/payment_status|settlement|entitlement/);
  });

  it("documents the seller upload lifecycle", () => {
    const doc = read(
      "docs/store/implementation/SELLER_DIGITAL_PRODUCT_ASSET_UPLOAD_V1.md"
    );
    expect(doc).toMatch(/prepare/i);
    expect(doc).toMatch(/attach/i);
    expect(doc).toMatch(/replace/i);
    expect(doc).toMatch(/previous active asset preserved/i);
    expect(doc).toMatch(/Out of scope/);
  });
});
