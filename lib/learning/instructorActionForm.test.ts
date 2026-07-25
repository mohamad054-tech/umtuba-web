import { describe, expect, it, vi } from "vitest";
import { resetInstructorActionForm } from "./instructorActionForm";

describe("resetInstructorActionForm", () => {
  it("does not throw when form is null or undefined", () => {
    expect(() => resetInstructorActionForm(null)).not.toThrow();
    expect(() => resetInstructorActionForm(undefined)).not.toThrow();
  });

  it("calls reset on a captured form element", () => {
    const reset = vi.fn();
    const form = { reset } as unknown as HTMLFormElement;
    resetInstructorActionForm(form);
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
