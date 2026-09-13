import type {
  QuizQuestion,
  SandboxLesson,
  SandboxLessonExercise,
  SandboxModule,
} from "./types";

export function quizQuestion(
  id: string,
  prompt: string,
  choices: readonly [string, string, string, string],
  correctIndex: 0 | 1 | 2 | 3,
  explanation: string
): QuizQuestion {
  const letters = ["a", "b", "c", "d"] as const;
  return {
    id,
    prompt,
    choices: choices.map((text, index) => ({
      id: letters[index],
      text,
    })),
    correctChoiceId: letters[correctIndex],
    explanation,
  };
}

export function lesson(input: {
  id: string;
  title: string;
  kind: SandboxLesson["kind"];
  minutes: number;
  body: string;
  objective?: string;
  examples?: string[];
  keyTakeaways?: string[];
  exercise?: SandboxLessonExercise;
  quiz?: QuizQuestion[];
  aiTutorContext?: string;
}): SandboxLesson {
  return {
    id: input.id,
    title: input.title,
    kind: input.kind,
    estimatedMinutes: input.minutes,
    body: input.body,
    quiz: input.quiz ?? [],
    objective: input.objective,
    examples: input.examples,
    keyTakeaways: input.keyTakeaways,
    exercise: input.exercise,
    aiTutorContext: input.aiTutorContext,
  };
}

export function moduleOf(
  id: string,
  title: string,
  summary: string,
  lessons: SandboxLesson[]
): SandboxModule {
  return { id, title, summary, lessons };
}

export const ORIGINALS_CERTIFICATE_DISCLAIMER =
  "This certificate records completion of an UMTUBA Originals course. It is not a degree, license, accreditation, professional qualification, or third-party certification.";

export const ORIGINALS_COMPLETION_RELATIONSHIP =
  "Maps to one published learning_activity with learning_activity_settings.completion_mode='score'. Finalize (learning_completion_try_finalize_course) requires learning_course_progress.status='completed' AND learning_completion_assessment_gate_ok: every published score-mode activity in the course has a learning_attempt_progress_applications row. passing_score is points compared with score_earned and must be <= max_score. max_attempts null means a new attempt may start until a live cap is set. Retry is a new attempt, not reopening a submitted one. Certificate issue is a side effect of finalize, not a separate publish step.";
