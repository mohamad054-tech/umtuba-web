import { describe, expect, it } from "vitest";
import {
  collaborationMemberRoleE2eOwnerCredentialsPresent,
  collaborationMemberRoleE2eFixtureIds,
  COLLABORATION_MEMBER_ROLE_E2E_TESTIDS,
} from "./memberRoleUpdateE2eProvisioning";

describe("memberRoleUpdateE2eProvisioning", () => {
  it("exposes stable testids", () => {
    expect(COLLABORATION_MEMBER_ROLE_E2E_TESTIDS.membersPanel).toBe(
      "collaboration-members-panel"
    );
  });

  it("fails closed without env gate", () => {
    expect(
      collaborationMemberRoleE2eOwnerCredentialsPresent({} as NodeJS.ProcessEnv)
    ).toBe(false);
  });

  it("passes when required env present", () => {
    expect(
      collaborationMemberRoleE2eOwnerCredentialsPresent({
        COLLABORATION_E2E: "1",
        PLAYWRIGHT_BASE_URL: "http://127.0.0.1:3000",
        COLLABORATION_E2E_OWNER_EMAIL: "owner@example.com",
        COLLABORATION_E2E_OWNER_PASSWORD: "x",
        COLLABORATION_E2E_WORKSPACE_ID: "ws-1",
      } as NodeJS.ProcessEnv)
    ).toBe(true);
  });

  it("reads fixture ids", () => {
    const f = collaborationMemberRoleE2eFixtureIds({
      COLLABORATION_E2E_WORKSPACE_ID: " ws-9 ",
      COLLABORATION_E2E_MEMBER_USER_ID: " u-2 ",
    } as NodeJS.ProcessEnv);
    expect(f.workspaceId).toBe("ws-9");
    expect(f.memberUserId).toBe("u-2");
  });
});
