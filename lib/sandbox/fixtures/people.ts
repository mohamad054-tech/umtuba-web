import type { SandboxPerson } from "./types";

const INSTRUCTOR_SPECIALTIES = [
  "AI",
  "Design",
  "Writing",
  "Safety",
  "Data",
  "Accessibility",
  "Product",
  "Operations",
] as const;

export const SANDBOX_INSTRUCTORS: readonly SandboxPerson[] =
  INSTRUCTOR_SPECIALTIES.map((specialty, index) => ({
    id: `demo-instructor-${String(index + 1).padStart(2, "0")}`,
    displayName: `Demo Instructor — ${specialty}`,
    role: "instructor" as const,
    specialty,
    onboarding: index < 5 ? ("ACTIVE" as const) : ("DRAFT" as const),
    synthetic: true as const,
  }));

export const SANDBOX_STUDENTS: readonly SandboxPerson[] = Array.from(
  { length: 24 },
  (_, index) => ({
    id: `demo-student-${String(index + 1).padStart(2, "0")}`,
    displayName: `Demo Student ${String(index + 1).padStart(2, "0")}`,
    role: "student" as const,
    synthetic: true as const,
  })
);

export function getSandboxPerson(id: string): SandboxPerson | undefined {
  return (
    SANDBOX_INSTRUCTORS.find((person) => person.id === id) ??
    SANDBOX_STUDENTS.find((person) => person.id === id)
  );
}
