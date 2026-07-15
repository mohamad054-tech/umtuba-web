import { describe, expect, it } from "vitest";
import {
  categoryForNotificationType,
  notificationMatchesFilter,
  parseNotificationFilter,
} from "./notificationCategories";

describe("notificationCategories", () => {
  it("maps V1 social + live types", () => {
    expect(categoryForNotificationType("follow")).toBe("social");
    expect(categoryForNotificationType("post_like")).toBe("social");
    expect(categoryForNotificationType("direct_message")).toBe("social");
    expect(categoryForNotificationType("post_save")).toBe("social");
    expect(categoryForNotificationType("post_share")).toBe("social");
    expect(categoryForNotificationType("live_started")).toBe("live");
  });

  it("maps V2 journey / rewards / nearby / AI types", () => {
    expect(categoryForNotificationType("post_reached_country")).toBe(
      "journey"
    );
    expect(categoryForNotificationType("post_trending_country")).toBe(
      "journey"
    );
    expect(categoryForNotificationType("post_milestone")).toBe("journey");
    expect(categoryForNotificationType("post_journey_summary")).toBe(
      "journey"
    );
    expect(categoryForNotificationType("um_points_earned")).toBe("rewards");
    expect(categoryForNotificationType("reward_milestone")).toBe("rewards");
    expect(categoryForNotificationType("nearby_live_started")).toBe("live");
    expect(categoryForNotificationType("ai_creator_insight")).toBe("ai");
  });

  it("filters correctly for each category", () => {
    expect(notificationMatchesFilter("comment", "all")).toBe(true);
    expect(notificationMatchesFilter("comment", "social")).toBe(true);
    expect(notificationMatchesFilter("comment", "journey")).toBe(false);
    expect(notificationMatchesFilter("nearby_live_started", "live")).toBe(
      true
    );
    expect(notificationMatchesFilter("ai_creator_insight", "ai")).toBe(true);
    expect(notificationMatchesFilter("um_points_earned", "rewards")).toBe(
      true
    );
  });

  it("parses filter query values safely", () => {
    expect(parseNotificationFilter("Journey")).toBe("journey");
    expect(parseNotificationFilter("nope")).toBe("all");
    expect(parseNotificationFilter(null)).toBe("all");
  });
});
