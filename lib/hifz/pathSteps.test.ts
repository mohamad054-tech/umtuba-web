import { describe, expect, it } from "vitest";
import {
  advancePath,
  displayAyah,
  initialPathState,
  isHideStep,
  isLinkStep,
  nextDisabled,
  PATH_STEP_LABELS_AR,
  showsNextButton,
  type PathStepId,
} from "./pathSteps";

const VERSE_FLOW: PathStepId[] = [
  "listen",
  "repeat",
  "hideFull",
  "hidePartial",
  "hideLetters",
  "hideAll",
  "reciteMemory",
  "rate",
];

function walkToRate(ayah: number) {
  let state = initialPathState(ayah);
  while (state.step !== "rate") {
    state = advancePath(state, { type: "next" });
  }
  return state;
}

describe("guided path steps", () => {
  it("exposes Arabic labels for every step in order", () => {
    expect(PATH_STEP_LABELS_AR.listen).toBe("استمع");
    expect(PATH_STEP_LABELS_AR.repeat).toBe("كرّر");
    expect(PATH_STEP_LABELS_AR.hideFull).toBe("الآية كاملة");
    expect(PATH_STEP_LABELS_AR.hidePartial).toBe("بعض الكلمات مخفية");
    expect(PATH_STEP_LABELS_AR.hideLetters).toBe("الحروف الأولى");
    expect(PATH_STEP_LABELS_AR.hideAll).toBe("مخفية بالكامل");
    expect(PATH_STEP_LABELS_AR.reciteMemory).toBe("من الذاكرة");
    expect(PATH_STEP_LABELS_AR.rate).toBe("كيف كان حفظك؟");
    expect(PATH_STEP_LABELS_AR.linkAlone).toBe("وصل — هذه الآية");
    expect(PATH_STEP_LABELS_AR.linkNextAlone).toBe("وصل — الآية التالية");
    expect(PATH_STEP_LABELS_AR.linkTogether).toBe("وصل — الآيتان معاً");
    expect(PATH_STEP_LABELS_AR.surahMemory).toBe("السورة من الصور");
  });

  it("walks listen → rate for one ayah", () => {
    let state = initialPathState(1);
    for (let i = 0; i < VERSE_FLOW.length; i++) {
      expect(state.step).toBe(VERSE_FLOW[i]);
      expect(PATH_STEP_LABELS_AR[state.step]).toBeTruthy();
      if (i < VERSE_FLOW.length - 1) {
        state = advancePath(state, { type: "next" });
      }
    }
    expect(showsNextButton("rate")).toBe(false);
    expect(advancePath(state, { type: "next" }).step).toBe("rate");
  });

  it("حفظتها opens chain link then next ayah", () => {
    let state = walkToRate(2);
    state = advancePath(state, { type: "rate", rating: "remembered" });
    expect(state.step).toBe("linkAlone");
    expect(isLinkStep(state.step)).toBe(true);
    expect(displayAyah(state)).toBe(2);
    state = advancePath(state, { type: "next" });
    expect(state.step).toBe("linkNextAlone");
    expect(displayAyah(state)).toBe(3);
    state = advancePath(state, { type: "next" });
    expect(state.step).toBe("linkTogether");
    state = advancePath(state, { type: "next" });
    expect(state).toEqual({ ayah: 3, step: "listen", surahCursor: 1 });
  });

  it("أعدها skips link and advances ayah", () => {
    let state = walkToRate(4);
    state = advancePath(state, { type: "rate", rating: "again" });
    expect(state).toEqual({ ayah: 5, step: "listen", surahCursor: 1 });
  });

  it("متردد skips link and advances ayah", () => {
    let state = walkToRate(7);
    state = advancePath(state, { type: "rate", rating: "unsure" });
    expect(state).toEqual({ ayah: 8, step: "listen", surahCursor: 1 });
  });

  it("last ayah حفظتها opens surah memory through 15", () => {
    let state = walkToRate(15);
    state = advancePath(state, { type: "rate", rating: "remembered" });
    expect(state.step).toBe("surahMemory");
    expect(displayAyah(state)).toBe(1);
    for (let i = 1; i < 15; i++) {
      state = advancePath(state, { type: "next" });
      expect(displayAyah(state)).toBe(i + 1);
    }
    expect(nextDisabled(state)).toBe(true);
    expect(advancePath(state, { type: "next" }).surahCursor).toBe(15);
  });

  it("last ayah أعدها also opens surah memory", () => {
    let state = walkToRate(15);
    state = advancePath(state, { type: "rate", rating: "again" });
    expect(state.step).toBe("surahMemory");
    expect(state.surahCursor).toBe(1);
  });

  it("openAyah restarts the path for a due review", () => {
    const state = advancePath(initialPathState(1), {
      type: "openAyah",
      ayah: 9,
    });
    expect(state).toEqual({ ayah: 9, step: "listen", surahCursor: 1 });
  });

  it("openSurahMemory jumps to image walk", () => {
    const state = advancePath(initialPathState(3), { type: "openSurahMemory" });
    expect(state).toEqual({ ayah: 15, step: "surahMemory", surahCursor: 1 });
  });

  it("marks hide steps and hides التالي only on rate", () => {
    expect(isHideStep("hideFull")).toBe(true);
    expect(isHideStep("hidePartial")).toBe(true);
    expect(isHideStep("hideLetters")).toBe(true);
    expect(isHideStep("hideAll")).toBe(true);
    expect(isHideStep("listen")).toBe(false);
    for (const step of VERSE_FLOW) {
      expect(showsNextButton(step)).toBe(step !== "rate");
    }
  });

  it("ignores rate events when not on the rate step", () => {
    const state = initialPathState(1);
    expect(
      advancePath(state, { type: "rate", rating: "remembered" }).step,
    ).toBe("listen");
  });
});