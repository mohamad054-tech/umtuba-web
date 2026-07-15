import { describe, expect, it } from "vitest";
import { parseNotificationForTest } from "../../../lib/supabase/notifications";

describe("parseNotification V1 + V2", () => {
  it("still parses classic V1 notifications", () => {
    const n = parseNotificationForTest({
      id: "11111111-1111-4111-8111-111111111111",
      type: "follow",
      title: "Alex started following you",
      body: null,
      entityType: "profile",
      entityId: "user-1",
      href: "/profile/alex",
      metadata: { followerId: "user-1" },
      createdAt: "2026-07-15T12:00:00.000Z",
      readAt: null,
      actorId: "user-1",
      actor: null,
    });
    expect(n?.type).toBe("follow");
    expect(n?.unread).toBe(true);
  });

  it("parses V2 journey and rewards types with metadata", () => {
    const journey = parseNotificationForTest({
      id: "22222222-2222-4222-8222-222222222222",
      type: "post_reached_country",
      title: "Your post has reached Turkey.",
      createdAt: "2026-07-15T12:00:00.000Z",
      metadata: {
        postId: 9,
        countryCode: "TR",
        countryName: "Turkey",
      },
      dedupeKey: "post_reached_country:9:TR",
      href: "/post-journey?postId=9",
    });
    expect(journey?.type).toBe("post_reached_country");
    expect(journey?.dedupeKey).toBe("post_reached_country:9:TR");
    expect(journey?.metadata.countryCode).toBe("TR");

    const points = parseNotificationForTest({
      id: "33333333-3333-4333-8333-333333333333",
      type: "um_points_earned",
      title: "You earned 50 UM Points for meaningful engagement.",
      createdAt: "2026-07-15T12:00:00.000Z",
      metadata: { points: 50, reason: "meaningful engagement" },
    });
    expect(points?.type).toBe("um_points_earned");
    expect(points?.metadata.points).toBe(50);
  });

  it("rejects unknown types", () => {
    expect(
      parseNotificationForTest({
        id: "44444444-4444-4444-8444-444444444444",
        type: "not_a_real_type",
        title: "x",
        createdAt: "2026-07-15T12:00:00.000Z",
      })
    ).toBeNull();
  });
});
