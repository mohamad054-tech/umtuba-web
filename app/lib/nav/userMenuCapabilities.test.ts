import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  USER_MENU_CAPABILITIES_SIGNED_IN_BASE,
  resolveUserMenuCapabilities,
} from "./userMenuCapabilities";

vi.mock("../../../lib/ads/adminAuth", () => ({
  assertPlatformAdminDb: vi.fn(),
}));
vi.mock("../../../lib/learning/instructorAuthoring", () => ({
  listInstructorAuthorableCourses: vi.fn(),
}));
vi.mock("../../../lib/store/sellerStore", () => ({
  getOwnedOrMemberStore: vi.fn(),
}));
vi.mock("../../../lib/store/sellerApplications", () => ({
  getLatestSellerApplication: vi.fn(),
}));

import { assertPlatformAdminDb } from "../../../lib/ads/adminAuth";
import { listInstructorAuthorableCourses } from "../../../lib/learning/instructorAuthoring";
import { getOwnedOrMemberStore } from "../../../lib/store/sellerStore";
import { getLatestSellerApplication } from "../../../lib/store/sellerApplications";

const mockedAdmin = vi.mocked(assertPlatformAdminDb);
const mockedInstructor = vi.mocked(listInstructorAuthorableCourses);
const mockedMembership = vi.mocked(getOwnedOrMemberStore);
const mockedApplication = vi.mocked(getLatestSellerApplication);

describe("resolveUserMenuCapabilities", () => {
  const user = { id: "11111111-1111-4111-8111-111111111111" } as User;
  const supabase = {} as SupabaseClient;

  it("maps existing helper results without inventing roles", async () => {
    mockedInstructor.mockResolvedValue({ ok: true, data: [{ id: "c1" }] });
    mockedAdmin.mockResolvedValue(true);
    mockedMembership.mockResolvedValue({
      store: { id: "s1" } as never,
      role: "owner",
    });
    mockedApplication.mockResolvedValue(null);

    await expect(
      resolveUserMenuCapabilities(supabase, user)
    ).resolves.toEqual({
      showCreate: true,
      showInstructor: true,
      showAdmin: true,
      showSeller: true,
      showAdvertise: true,
    });
  });

  it("hides Instructor Admin Seller when helpers report no eligibility", async () => {
    mockedInstructor.mockResolvedValue({ ok: true, data: [] });
    mockedAdmin.mockResolvedValue(false);
    mockedMembership.mockResolvedValue(null);
    mockedApplication.mockResolvedValue(null);

    await expect(
      resolveUserMenuCapabilities(supabase, user)
    ).resolves.toEqual(USER_MENU_CAPABILITIES_SIGNED_IN_BASE);
  });

  it("treats seller application alone as Seller eligibility", async () => {
    mockedInstructor.mockResolvedValue({ ok: false, message: "nope" });
    mockedAdmin.mockResolvedValue(false);
    mockedMembership.mockResolvedValue(null);
    mockedApplication.mockResolvedValue({ id: "app1" } as never);

    await expect(
      resolveUserMenuCapabilities(supabase, user)
    ).resolves.toMatchObject({
      showInstructor: false,
      showSeller: true,
      showAdvertise: true,
    });
  });
});
