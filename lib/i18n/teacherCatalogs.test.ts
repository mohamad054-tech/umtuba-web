import { describe, expect, it } from "vitest";
import { translate } from "./translate";
import { teacherArMessages, teacherEnMessages } from "./messages/teacherCatalogs";

describe("teacher catalogs", () => {
  it("covers Teacher Center and Become a Teacher in English and Arabic", () => {
    expect(teacherEnMessages["teacher.center.title"]).toBe("Teacher Center");
    expect(teacherArMessages["teacher.center.title"]).toBe("مركز المعلم");
    expect(teacherArMessages["teacher.become.title"]).toBe("كن معلماً");
    expect(translate("en", "teacher.become.cta")).toBe("Become a Teacher");
    expect(translate("ar", "teacher.become.cta")).toBe("كن معلماً");
    expect(translate("ar", "teacher.earnings.commissionUnset")).not.toBe(
      translate("en", "teacher.earnings.commissionUnset")
    );
  });
});
