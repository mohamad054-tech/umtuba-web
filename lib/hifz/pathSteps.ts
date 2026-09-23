/**
 * Pure guided-path step machine for Surah ash-Shams memorization.
 * One verse at a time; one clear next action.
 */

export const AYAH_COUNT = 15;

export type PathStepId =
  | "listen"
  | "repeat"
  | "hideFull"
  | "hidePartial"
  | "hideLetters"
  | "hideAll"
  | "reciteMemory"
  | "rate"
  | "linkAlone"
  | "linkNextAlone"
  | "linkTogether"
  | "surahMemory";

export type PathState = {
  ayah: number;
  step: PathStepId;
  /** Cursor inside surahMemory (1–15). */
  surahCursor: number;
};

export type PathEvent =
  | { type: "next" }
  | { type: "rate"; rating: "again" | "unsure" | "remembered" }
  | { type: "openAyah"; ayah: number }
  | { type: "openSurahMemory" };

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

export const PATH_STEP_LABELS_AR: Record<PathStepId, string> = {
  listen: "استمع",
  repeat: "كرّر",
  hideFull: "الآية كاملة",
  hidePartial: "بعض الكلمات مخفية",
  hideLetters: "الحروف الأولى",
  hideAll: "مخفية بالكامل",
  reciteMemory: "من الذاكرة",
  rate: "كيف كان حفظك؟",
  linkAlone: "وصل — هذه الآية",
  linkNextAlone: "وصل — الآية التالية",
  linkTogether: "وصل — الآيتان معاً",
  surahMemory: "السورة من الصور",
};

export function initialPathState(ayah = 1): PathState {
  return {
    ayah: clampAyah(ayah),
    step: "listen",
    surahCursor: 1,
  };
}

export function clampAyah(n: number): number {
  return Math.min(AYAH_COUNT, Math.max(1, Math.floor(n)));
}

function nextAfterRate(
  state: PathState,
  rating: "again" | "unsure" | "remembered",
): PathState {
  if (rating === "remembered") {
    if (state.ayah >= AYAH_COUNT) {
      return { ayah: state.ayah, step: "surahMemory", surahCursor: 1 };
    }
    return { ayah: state.ayah, step: "linkAlone", surahCursor: state.surahCursor };
  }
  if (state.ayah >= AYAH_COUNT) {
    return { ayah: state.ayah, step: "surahMemory", surahCursor: 1 };
  }
  return { ayah: state.ayah + 1, step: "listen", surahCursor: 1 };
}

function advanceFromVerseFlow(state: PathState): PathState {
  const idx = VERSE_FLOW.indexOf(state.step);
  if (idx < 0 || idx >= VERSE_FLOW.length - 1) {
    return state;
  }
  return { ...state, step: VERSE_FLOW[idx + 1] };
}

export function advancePath(state: PathState, event: PathEvent): PathState {
  if (event.type === "openAyah") {
    return initialPathState(event.ayah);
  }
  if (event.type === "openSurahMemory") {
    return { ayah: AYAH_COUNT, step: "surahMemory", surahCursor: 1 };
  }

  if (event.type === "rate") {
    if (state.step !== "rate") return state;
    return nextAfterRate(state, event.rating);
  }

  switch (state.step) {
    case "listen":
    case "repeat":
    case "hideFull":
    case "hidePartial":
    case "hideLetters":
    case "hideAll":
    case "reciteMemory":
      return advanceFromVerseFlow(state);
    case "rate":
      return state;
    case "linkAlone":
      return { ...state, step: "linkNextAlone" };
    case "linkNextAlone":
      return { ...state, step: "linkTogether" };
    case "linkTogether":
      return {
        ayah: clampAyah(state.ayah + 1),
        step: "listen",
        surahCursor: 1,
      };
    case "surahMemory": {
      if (state.surahCursor >= AYAH_COUNT) {
        return state;
      }
      return { ...state, surahCursor: state.surahCursor + 1 };
    }
    default:
      return state;
  }
}

export function showsNextButton(step: PathStepId): boolean {
  return step !== "rate";
}

export function nextDisabled(state: PathState): boolean {
  return state.step === "surahMemory" && state.surahCursor >= AYAH_COUNT;
}

export function displayAyah(state: PathState): number {
  if (state.step === "surahMemory") return state.surahCursor;
  if (state.step === "linkNextAlone") return clampAyah(state.ayah + 1);
  return state.ayah;
}

export function isHideStep(step: PathStepId): boolean {
  return (
    step === "hideFull" ||
    step === "hidePartial" ||
    step === "hideLetters" ||
    step === "hideAll"
  );
}

export function isLinkStep(step: PathStepId): boolean {
  return (
    step === "linkAlone" ||
    step === "linkNextAlone" ||
    step === "linkTogether"
  );
}
