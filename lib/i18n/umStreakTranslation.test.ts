import { describe, expect, it } from "vitest";
import { translate } from "./index";

describe("UM Streak localization", () => {
  it("keeps Arabic first-class for camera and streak states", () => {
    expect(translate("en", "umStreak.title")).toBe("UM Streak");
    expect(translate("ar", "umStreak.title")).toBe("UM Streak");
    expect(translate("ar", "umStreak.camera")).toBe("افتح الكاميرا");
    expect(translate("ar", "umStreak.waitingForFriend")).toBe("بانتظار صديقك");
    expect(translate("ar", "umStreak.youStillNeedToReply")).toBe("دورك اليوم");
    expect(translate("ar", "umStreak.atRisk")).toBe("أكمل اليوم لتستمر");
    expect(translate("ar", "umStreak.viewOnce")).toBe("عرض مرة واحدة");
    expect(translate("ar", "umStreak.opened")).not.toBe(
      translate("en", "umStreak.opened")
    );
    expect(translate("ar", "umStreak.camera")).not.toBe(
      translate("en", "umStreak.camera")
    );
  });
});
