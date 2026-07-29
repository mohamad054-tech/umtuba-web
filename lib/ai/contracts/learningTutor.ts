/**
 * Public Learning Tutor contracts for Laptop consumption via aiService.
 */

export type LearningTutorGroundingStatus =
  | "grounded"
  | "partial"
  | "outside_material";

export type LearningTutorSourceReference = {
  type: string;
  id: string;
  label: string;
};

export type LearningTutorExplainResult = {
  title: string;
  explanation: string;
  keyPoints: string[];
  examples: string[];
  sourceReferences: LearningTutorSourceReference[];
  groundingStatus: LearningTutorGroundingStatus;
  limitations: string[];
  labeledAiGenerated: true;
  officialCourseContent: false;
};

export type LearningTutorSummarizeResult = {
  keyIdeas: string[];
  definitions: string[];
  mainExamples: string[];
  reviewPoints: string[];
  suggestedNextStep: string;
  sourceReferences: LearningTutorSourceReference[];
  groundingStatus: LearningTutorGroundingStatus;
  limitations: string[];
  labeledAiGenerated: true;
  officialCourseContent: false;
};

export type LearningTutorAnswerResult = {
  answer: string;
  groundingStatus: LearningTutorGroundingStatus;
  sourceReferences: LearningTutorSourceReference[];
  limitations: string[];
  confidence: "high" | "medium" | "low" | string;
  labeledAiGenerated: true;
  officialCourseContent: false;
};

export type LearningTutorPracticeResult = {
  items: Array<Record<string, unknown>>;
  labeledAiGenerated: true;
  sourceReferences: LearningTutorSourceReference[];
  groundingStatus: LearningTutorGroundingStatus;
  limitations: string[];
  officialAssessment: false;
  mutatesGrades: false;
};

export type LearningTutorExplainWrongAnswerResult = {
  explanation: string;
  misconception: string;
  betterApproach: string;
  practiceHint: string;
  sourceReferences: LearningTutorSourceReference[];
  groundingStatus: LearningTutorGroundingStatus;
  limitations: string[];
  labeledAiGenerated: true;
  officialCourseContent: false;
  revealsAnswerKey: false;
  mutatesProgress: false;
  mutatesGrades: false;
};

/**
 * Scaffolding hint for a learner focus (maps to Learning OS message kind `hint`).
 * Never a full graded answer or answer key.
 */
export type LearningTutorGiveHintResult = {
  hint: string;
  hintLevel: "gentle" | "moderate" | "strong" | string;
  focusRestated: string;
  nextStep: string;
  sourceReferences: LearningTutorSourceReference[];
  groundingStatus: LearningTutorGroundingStatus;
  limitations: string[];
  labeledAiGenerated: true;
  officialCourseContent: false;
  revealsAnswerKey: false;
  mutatesProgress: false;
  mutatesGrades: false;
};

/**
 * Simpler/alternate re-teach of published lesson material
 * (maps to Learning OS message kind `explain_again`).
 * Distinct from explain_lesson (first full explanation) and give_hint (scaffolding only).
 *
 * Note: `revealsAnswerKey: false` cross-capability flag parity with give_hint /
 * explain_wrong_answer is deferred; leakage is still fail-closed via field bans.
 */
export type LearningTutorExplainAgainResult = {
  title: string;
  simplerExplanation: string;
  keyPoints: string[];
  analogy?: string;
  checkUnderstanding: string[];
  sourceReferences: LearningTutorSourceReference[];
  groundingStatus: LearningTutorGroundingStatus;
  limitations: string[];
  labeledAiGenerated: true;
  officialCourseContent: false;
  mutatesProgress: false;
  mutatesGrades: false;
};
