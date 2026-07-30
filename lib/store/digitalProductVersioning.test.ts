/**
 * Focused tests — Commerce Digital Product Versioning & Update Delivery V1.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { buildStoreDigitalProductAssetPath } from "./mediaConstants";
import {
  DIGITAL_PRODUCT_VERSIONING_ID,
  buildBackfillVersionFromLegacyAsset,
  interpretActivateRpcPayload,
  resolveActiveDigitalAssetVersion,
} from "./digitalProductVersioning";
import {
  activateSellerDigitalAssetVersion,
  finalizeSellerDigitalAssetAttach,
} from "./digitalAssetUpload";
import {
  mintBuyerDigitalAccessSignedUrl,
  resolveDigitalDeliveryAvailability,
} from "./digitalAccessDelivery";
import {
  evaluateDigitalProductPublishReadiness,
  loadDigitalAssetReadinessSnapshot,
} from "./digitalProductPublishReadiness";

const ROOT = join(__dirname, "../..");
const SELLER = "11111111-1111-4111-8111-111111111111";
const OTHER_STORE = "22222222-2222-4222-8222-222222222222";
const OTHER_PRODUCT = "33333333-3333-4333-8333-333333333333";
const VERSION_ACTIVE = "44444444-4444-4444-8444-444444444444";
const VERSION_DRAFT = "55555555-5555-4555-8555-555555555555";
const ENTITLEMENT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORDER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ORDER_ITEM = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const PRODUCT = "66666666-6666-4666-8666-666666666666";
const STORE = "77777777-7777-4777-8777-777777777777";
const BUYER = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const FILE = "88888888-8888-4888-8888-888888888888";
const DRAFT_FILE = "99999999-9999-4999-8999-999999999999";
const SAFE_PATH = buildStoreDigitalProductAssetPath(STORE, PRODUCT, FILE, "pdf");
const DRAFT_PATH = buildStoreDigitalProductAssetPath(
  STORE,
  PRODUCT,
  DRAFT_FILE,
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

function chainEq(final: () => Promise<unknown>) {
  const node: Record<string, unknown> = {};
  node.eq = () => node;
  node.order = () => node;
  node.limit = () => node;
  node.maybeSingle = final;
  node.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    final().then(resolve, reject);
  return node;
}

describe("Digital product versioning — contracts", () => {
  it("exposes capability id and local migration 20260880", () => {
    expect(DIGITAL_PRODUCT_VERSIONING_ID).toMatch(
      /product_versioning_update_delivery/
    );
    const migrations = readdirSync(join(ROOT, "supabase/migrations"));
    expect(migrations).toContain(
      "20260880_store_digital_product_versioning_update_delivery_v1.sql"
    );
    const sql = read(
      "supabase/migrations/20260880_store_digital_product_versioning_update_delivery_v1.sql"
    );
    expect(sql).toMatch(/store_digital_product_asset_versions/);
    expect(sql).toMatch(/active_version_id/);
    expect(sql).toMatch(/activate_store_digital_product_asset_version/);
    expect(sql).toMatch(/one_active_uidx|status = 'active'/);
    expect(sql).toMatch(/do NOT remote-apply|Local file only/i);
    expect(sql).not.toMatch(/db push|--include-all/i);
    expect(sql).not.toMatch(/asset_version_id/);
    expect(
      existsSync(
        join(
          ROOT,
          "docs/store/implementation/DIGITAL_PRODUCT_VERSIONING_UPDATE_DELIVERY_V1.md"
        )
      )
    ).toBe(true);
  });

  it("backfills legacy active asset as version 1 with active pointer", () => {
    const row = buildBackfillVersionFromLegacyAsset({
      storeId: STORE,
      productId: PRODUCT,
      storagePath: SAFE_PATH,
      status: "active",
      title: "Legacy pack",
    });
    expect(row.versionNumber).toBe(1);
    expect(row.status).toBe("active");
    expect(row.shouldSetActivePointer).toBe(true);
    expect(row.storagePath).toBe(SAFE_PATH);
  });

  it("backfills legacy inactive asset without active pointer", () => {
    const row = buildBackfillVersionFromLegacyAsset({
      storeId: STORE,
      productId: PRODUCT,
      storagePath: SAFE_PATH,
      status: "inactive",
      title: null,
    });
    expect(row.status).toBe("inactive");
    expect(row.shouldSetActivePointer).toBe(false);
  });
});

describe("Digital product versioning — upload draft preserves active", () => {
  it("finalize inserts draft version and does not overwrite active pointer", async () => {
    const versionInserts: Array<Record<string, unknown>> = [];
    const assetUpdates: Array<Record<string, unknown>> = [];

    const admin = {
      from: vi.fn((table: string) => {
        if (table === "store_digital_product_assets") {
          return {
            select: () =>
              chainEq(async () => ({
                data: {
                  id: "asset-1",
                  active_version_id: VERSION_ACTIVE,
                  status: "active",
                  store_id: STORE,
                  product_id: PRODUCT,
                },
                error: null,
              })),
            update: (payload: Record<string, unknown>) => {
              assetUpdates.push(payload);
              return chainEq(async () => ({ error: null }));
            },
          };
        }
        if (table === "store_digital_product_asset_versions") {
          return {
            select: () => {
              const node = chainEq(async () => ({
                data: {
                  id: VERSION_ACTIVE,
                  store_id: STORE,
                  product_id: PRODUCT,
                  storage_path: SAFE_PATH,
                  status: "active",
                  version_number: 1,
                  title: "live",
                },
                error: null,
              }));
              node.order = () => ({
                limit: () => ({
                  maybeSingle: async () => ({
                    data: { version_number: 1 },
                    error: null,
                  }),
                }),
                then: (
                  resolve: (v: unknown) => unknown,
                  reject?: (e: unknown) => unknown
                ) =>
                  Promise.resolve({
                    data: [
                      {
                        id: VERSION_DRAFT,
                        store_id: STORE,
                        product_id: PRODUCT,
                        storage_path: DRAFT_PATH,
                        status: "draft",
                        version_number: 2,
                        title: "draft",
                      },
                      {
                        id: VERSION_ACTIVE,
                        store_id: STORE,
                        product_id: PRODUCT,
                        storage_path: SAFE_PATH,
                        status: "active",
                        version_number: 1,
                        title: "live",
                      },
                    ],
                    error: null,
                  }).then(resolve, reject),
              });
              return node;
            },
            insert: (payload: Record<string, unknown>) => {
              versionInserts.push(payload);
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
      membershipClient("owner") as never,
      {
        productId: PRODUCT,
        userId: SELLER,
        storagePath: DRAFT_PATH,
        title: "draft",
      },
      { admin: admin as never }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.activePreserved).toBe(true);
    expect(result.draftVersionNumber).toBe(2);
    expect(versionInserts).toHaveLength(1);
    expect(versionInserts[0]?.status).toBe("draft");
    expect(versionInserts[0]?.storage_path).toBe(DRAFT_PATH);
    expect(versionInserts[0]?.version_number).toBe(2);
    expect(assetUpdates).toHaveLength(0);
    expect(result.summary.uiStatus).toBe("active");
  });
});

describe("Digital product versioning — activate", () => {
  it("activate rpc interprets success and mismatch payloads", () => {
    const ok = interpretActivateRpcPayload({
      ok: true,
      code: "activated",
      version_id: VERSION_DRAFT,
      version_number: 2,
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.versionNumber).toBe(2);
      expect(ok.alreadyActive).toBe(false);
    }

    const mismatch = interpretActivateRpcPayload({
      ok: false,
      code: "version_mismatch",
    });
    expect(mismatch.ok).toBe(false);
    if (!mismatch.ok) expect(mismatch.code).toBe("version_mismatch");
  });

  it("rejects activating a version from another store/product", async () => {
    const admin = {
      from: vi.fn((table: string) => {
        if (table === "store_digital_product_asset_versions") {
          return {
            select: () =>
              chainEq(async () => ({
                data: {
                  id: VERSION_DRAFT,
                  store_id: OTHER_STORE,
                  product_id: OTHER_PRODUCT,
                  storage_path: buildStoreDigitalProductAssetPath(
                    OTHER_STORE,
                    OTHER_PRODUCT,
                    FILE,
                    "pdf"
                  ),
                  status: "draft",
                  version_number: 1,
                  title: "foreign",
                },
                error: null,
              })),
          };
        }
        throw new Error(table);
      }),
      rpc: vi.fn(),
    };

    const result = await activateSellerDigitalAssetVersion(
      membershipClient("owner") as never,
      {
        productId: PRODUCT,
        versionId: VERSION_DRAFT,
        userId: SELLER,
      },
      { admin: admin as never }
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("version_mismatch");
    expect(admin.rpc).not.toHaveBeenCalled();
  });

  it("calls activate rpc for an owned draft version", async () => {
    const admin = {
      from: vi.fn((table: string) => {
        if (table === "store_digital_product_asset_versions") {
          return {
            select: () =>
              chainEq(async () => ({
                data: {
                  id: VERSION_DRAFT,
                  store_id: STORE,
                  product_id: PRODUCT,
                  storage_path: DRAFT_PATH,
                  status: "draft",
                  version_number: 2,
                  title: "draft",
                },
                error: null,
              })),
          };
        }
        throw new Error(table);
      }),
      rpc: vi.fn(async () => ({
        data: {
          ok: true,
          code: "activated",
          version_id: VERSION_DRAFT,
          version_number: 2,
          previous_version_id: VERSION_ACTIVE,
        },
        error: null,
      })),
    };

    const result = await activateSellerDigitalAssetVersion(
      membershipClient("manager") as never,
      {
        productId: PRODUCT,
        versionId: VERSION_DRAFT,
        userId: SELLER,
      },
      { admin: admin as never }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.versionId).toBe(VERSION_DRAFT);
    expect(admin.rpc).toHaveBeenCalledWith(
      "activate_store_digital_product_asset_version",
      {
        p_version_id: VERSION_DRAFT,
        p_product_id: PRODUCT,
        p_store_id: STORE,
      }
    );
  });
});

describe("Digital product versioning — delivery always-latest", () => {
  function activeAdmin(opts?: {
    active?: null | {
      id: string;
      storage_path: string;
      status: string;
      title?: string;
    };
  }) {
    const active =
      opts && "active" in opts
        ? opts.active
        : {
            id: VERSION_ACTIVE,
            storage_path: SAFE_PATH,
            status: "active",
            title: "live",
          };

    return {
      from: vi.fn((table: string) => {
        if (table === "store_products") {
          return {
            select: () =>
              chainEq(async () => ({
                data: {
                  id: PRODUCT,
                  store_id: STORE,
                  product_type: "digital",
                },
                error: null,
              })),
          };
        }
        if (table === "order_items") {
          return {
            select: () =>
              chainEq(async () => ({
                data: {
                  id: ORDER_ITEM,
                  order_id: ORDER,
                  product_id: PRODUCT,
                },
                error: null,
              })),
          };
        }
        if (table === "store_digital_product_assets") {
          return {
            select: () =>
              chainEq(async () => ({
                data: active
                  ? {
                      id: "asset-1",
                      store_id: STORE,
                      product_id: PRODUCT,
                      active_version_id: active.id,
                      status: "active",
                    }
                  : {
                      id: "asset-1",
                      store_id: STORE,
                      product_id: PRODUCT,
                      active_version_id: null,
                      status: "inactive",
                    },
                error: null,
              })),
          };
        }
        if (table === "store_digital_product_asset_versions") {
          return {
            select: () =>
              chainEq(async () => ({
                data: active
                  ? {
                      id: active.id,
                      store_id: STORE,
                      product_id: PRODUCT,
                      storage_path: active.storage_path,
                      status: active.status,
                      version_number: 1,
                      title: active.title ?? null,
                    }
                  : null,
                error: null,
              })),
          };
        }
        throw new Error(table);
      }),
      storage: {
        from: () => ({
          createSignedUrl: async (path: string) => {
            expect(path).toBe(SAFE_PATH);
            return {
              data: { signedUrl: "https://signed.example/v1" },
              error: null,
            };
          },
        }),
      },
    };
  }

  it("delivery resolves the active version only", async () => {
    const availability = await resolveDigitalDeliveryAvailability(
      activeAdmin() as never,
      {
        productId: PRODUCT,
        storeId: STORE,
        entitlementStatus: "active",
      }
    );
    expect(availability).toBe("available");

    const mint = await mintBuyerDigitalAccessSignedUrl(
      {
        from: vi.fn(() => ({
          select: () =>
            chainEq(async () => ({
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
            })),
        })),
      } as never,
      { entitlementId: ENTITLEMENT, userId: BUYER },
      { admin: activeAdmin() as never }
    );
    expect(mint.ok).toBe(true);
  });

  it("missing active version fails closed", async () => {
    const availability = await resolveDigitalDeliveryAvailability(
      activeAdmin({ active: null }) as never,
      {
        productId: PRODUCT,
        storeId: STORE,
        entitlementStatus: "active",
      }
    );
    expect(availability).toBe("unavailable");

    const mint = await mintBuyerDigitalAccessSignedUrl(
      {
        from: vi.fn(() => ({
          select: () =>
            chainEq(async () => ({
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
            })),
        })),
      } as never,
      { entitlementId: ENTITLEMENT, userId: BUYER },
      { admin: activeAdmin({ active: null }) as never }
    );
    expect(mint.ok).toBe(false);
    if (!mint.ok) expect(mint.code).toBe("asset_missing");
  });

  it("unowned or invalid active path fails closed", async () => {
    const active = await resolveActiveDigitalAssetVersion(
      activeAdmin({
        active: {
          id: VERSION_ACTIVE,
          storage_path: `stores/${STORE}/products/${PRODUCT}/evil.pdf`,
          status: "active",
        },
      }) as never,
      { productId: PRODUCT, storeId: STORE }
    );
    expect(active).toBeNull();
  });
});

describe("Digital product versioning — publish readiness", () => {
  it("depends on an active owned version", async () => {
    const ready = evaluateDigitalProductPublishReadiness({
      productType: "digital",
      storeId: STORE,
      productId: PRODUCT,
      asset: {
        storeId: STORE,
        productId: PRODUCT,
        status: "active",
        storagePath: SAFE_PATH,
      },
    });
    expect(ready.ready).toBe(true);

    const missing = evaluateDigitalProductPublishReadiness({
      productType: "digital",
      storeId: STORE,
      productId: PRODUCT,
      asset: null,
    });
    expect(missing.ready).toBe(false);
    expect(missing.code).toBe("asset_missing");

    const snapshot = await loadDigitalAssetReadinessSnapshot(
      {
        from: vi.fn((table: string) => {
          if (table === "store_digital_product_assets") {
            return {
              select: () =>
                chainEq(async () => ({
                  data: {
                    id: "asset-1",
                    store_id: STORE,
                    product_id: PRODUCT,
                    active_version_id: VERSION_ACTIVE,
                    status: "active",
                  },
                  error: null,
                })),
            };
          }
          if (table === "store_digital_product_asset_versions") {
            return {
              select: () =>
                chainEq(async () => ({
                  data: {
                    id: VERSION_ACTIVE,
                    store_id: STORE,
                    product_id: PRODUCT,
                    storage_path: SAFE_PATH,
                    status: "active",
                    version_number: 1,
                    title: "live",
                  },
                  error: null,
                })),
            };
          }
          throw new Error(table);
        }),
      } as never,
      { productId: PRODUCT, storeId: STORE }
    );
    expect(snapshot?.status).toBe("active");
    expect(snapshot?.storagePath).toBe(SAFE_PATH);
  });
});

describe("Digital product versioning — surface wiring", () => {
  it("wires activate action and seller panel without out-of-scope domains", () => {
    const actions = read("app/actions/storeDigitalAssets.ts");
    expect(actions).toMatch(/activateSellerDigitalAssetVersionAction/);
    expect(actions).not.toMatch(/payment_status|settlement|refund|payout/);

    const panel = read("app/components/store/SellerDigitalAssetPanel.tsx");
    expect(panel).toMatch(/Activate/);
    expect(panel).toMatch(/always-latest|active version/i);
    expect(panel).not.toMatch(/learning|ai.?tutor|creator space/i);

    const delivery = read("lib/store/digitalAccessDelivery.ts");
    expect(delivery).toMatch(/resolveActiveDigitalAssetVersion/);
    expect(delivery).not.toMatch(/asset_version_id/);

    const grant = read("lib/store/digitalEntitlementGrant.ts");
    expect(grant).not.toMatch(/asset_version_id|active_version_id/);
  });
});
