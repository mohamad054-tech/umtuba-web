import { SANDBOX_COURSES } from "./courses";
import { SANDBOX_STUDENTS } from "./people";

export type StudentProgressRow = {
  studentId: string;
  studentName: string;
  courseSlug: string;
  courseTitle: string;
  percent: number;
  lessonsCompleted: number;
  lessonsTotal: number;
  certificate: "NONE" | "SANDBOX_PREVIEW";
};

const HOSTED = SANDBOX_COURSES.filter((course) => course.modules.length > 0);

export const SANDBOX_STUDENT_PROGRESS: readonly StudentProgressRow[] =
  SANDBOX_STUDENTS.flatMap((student, studentIndex) => {
    const course = HOSTED[studentIndex % HOSTED.length]!;
    const lessonsTotal = course.modules.reduce(
      (sum, module) => sum + module.lessons.length,
      0
    );
    const percent = ((studentIndex * 17) % 91) + 5;
    const lessonsCompleted = Math.min(
      lessonsTotal,
      Math.max(1, Math.round((percent / 100) * lessonsTotal))
    );
    return [
      {
        studentId: student.id,
        studentName: student.displayName,
        courseSlug: course.slug,
        courseTitle: course.title,
        percent,
        lessonsCompleted,
        lessonsTotal,
        certificate:
          percent >= 90 && course.kind === "UMTUBA_ORIGINAL"
            ? "SANDBOX_PREVIEW"
            : "NONE",
      },
    ];
  });

export const FOCUS_STUDENT_ID = "demo-student-01";

export function progressForStudent(studentId: string): StudentProgressRow[] {
  return SANDBOX_STUDENT_PROGRESS.filter((row) => row.studentId === studentId);
}
