import { learningEnMessages } from "./en";
import type { LearningMessages } from "./types";

/** FR/ES/DE/PT inherit English until dedicated Learning localization passes. */
export const learningFrMessages: LearningMessages = { ...learningEnMessages };
export const learningEsMessages: LearningMessages = { ...learningEnMessages };
export const learningDeMessages: LearningMessages = { ...learningEnMessages };
export const learningPtMessages: LearningMessages = { ...learningEnMessages };
