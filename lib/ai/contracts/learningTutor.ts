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
