import type { StudioLanguageCode, TerminologyEntry } from "../types";

/** Official Learning terminology for Studio (all configured locales). */
export function seedLearningTerminology(): TerminologyEntry[] {
  const approved = "approved" as const;
  const rows: Array<{
    id: string;
    term: string;
    definition: string;
    translations: Partial<Record<StudioLanguageCode, string>>;
  }> = [
    {
      id: "term_learning_program",
      term: "Program",
      definition: "Learning program container.",
      translations: {
        en: "Program",
        ar: "برنامج",
        fr: "Programme",
        es: "Programa",
        de: "Programm",
        pt: "Programa",
      },
    },
    {
      id: "term_learning_course",
      term: "Course",
      definition: "Learning course container.",
      translations: {
        en: "Course",
        ar: "دورة",
        fr: "Cours",
        es: "Curso",
        de: "Kurs",
        pt: "Curso",
      },
    },
    {
      id: "term_learning_section",
      term: "Section",
      definition: "Course section grouping lessons.",
      translations: {
        en: "Section",
        ar: "قسم",
        fr: "Section",
        es: "Sección",
        de: "Abschnitt",
        pt: "Seção",
      },
    },
    {
      id: "term_learning_lesson",
      term: "Lesson",
      definition: "Learning lesson unit.",
      translations: {
        en: "Lesson",
        ar: "درس",
        fr: "Leçon",
        es: "Lección",
        de: "Lektion",
        pt: "Aula",
      },
    },
    {
      id: "term_learning_activity",
      term: "Activity",
      definition: "Learner activity unit.",
      translations: {
        en: "Activity",
        ar: "نشاط",
        fr: "Activité",
        es: "Actividad",
        de: "Aktivität",
        pt: "Atividade",
      },
    },
    {
      id: "term_learning_quiz",
      term: "Quiz",
      definition: "Short assessment.",
      translations: {
        en: "Quiz",
        ar: "اختبار قصير",
        fr: "Quiz",
        es: "Cuestionario",
        de: "Quiz",
        pt: "Quiz",
      },
    },
    {
      id: "term_learning_assessment",
      term: "Assessment",
      definition: "Graded assessment.",
      translations: {
        en: "Assessment",
        ar: "تقييم",
        fr: "Évaluation",
        es: "Evaluación",
        de: "Bewertung",
        pt: "Avaliação",
      },
    },
    {
      id: "term_learning_assignment",
      term: "Assignment",
      definition: "Course assignment.",
      translations: {
        en: "Assignment",
        ar: "واجب",
        fr: "Devoir",
        es: "Tarea",
        de: "Aufgabe",
        pt: "Tarefa",
      },
    },
    {
      id: "term_learning_certificate",
      term: "Certificate",
      definition: "Completion certificate.",
      translations: {
        en: "Certificate",
        ar: "شهادة",
        fr: "Certificat",
        es: "Certificado",
        de: "Zertifikat",
        pt: "Certificado",
      },
    },
    {
      id: "term_learning_transcript",
      term: "Transcript",
      definition: "Learner academic transcript.",
      translations: {
        en: "Transcript",
        ar: "السجل الأكاديمي",
        fr: "Relevé",
        es: "Expediente",
        de: "Zeugnis",
        pt: "Histórico",
      },
    },
    {
      id: "term_learning_instructor",
      term: "Instructor",
      definition: "Course instructor role.",
      translations: {
        en: "Instructor",
        ar: "مدرب",
        fr: "Formateur",
        es: "Instructor",
        de: "Dozent",
        pt: "Instrutor",
      },
    },
    {
      id: "term_learning_learner",
      term: "Learner",
      definition: "Learner role.",
      translations: {
        en: "Learner",
        ar: "متعلّم",
        fr: "Apprenant",
        es: "Estudiante",
        de: "Lernender",
        pt: "Aluno",
      },
    },
    {
      id: "term_learning_continue",
      term: "Continue Learning",
      definition: "Primary learner CTA.",
      translations: {
        en: "Continue Learning",
        ar: "متابعة التعلّم",
        fr: "Continuer l'apprentissage",
        es: "Continuar aprendiendo",
        de: "Weiterlernen",
        pt: "Continuar aprendendo",
      },
    },
    {
      id: "term_learning_resume",
      term: "Resume",
      definition: "Resume in-progress learning.",
      translations: {
        en: "Resume",
        ar: "استئناف",
        fr: "Reprendre",
        es: "Reanudar",
        de: "Fortsetzen",
        pt: "Retomar",
      },
    },
    {
      id: "term_learning_progress",
      term: "Progress",
      definition: "Learner progress.",
      translations: {
        en: "Progress",
        ar: "التقدّم",
        fr: "Progression",
        es: "Progreso",
        de: "Fortschritt",
        pt: "Progresso",
      },
    },
    {
      id: "term_learning_completed",
      term: "Completed",
      definition: "Completion status.",
      translations: {
        en: "Completed",
        ar: "مكتمل",
        fr: "Terminé",
        es: "Completado",
        de: "Abgeschlossen",
        pt: "Concluído",
      },
    },
    {
      id: "term_learning_locked",
      term: "Locked",
      definition: "Locked content state.",
      translations: {
        en: "Locked",
        ar: "مقفل",
        fr: "Verrouillé",
        es: "Bloqueado",
        de: "Gesperrt",
        pt: "Bloqueado",
      },
    },
    {
      id: "term_learning_unlock",
      term: "Unlock",
      definition: "Unlock action.",
      translations: {
        en: "Unlock",
        ar: "فتح القفل",
        fr: "Déverrouiller",
        es: "Desbloquear",
        de: "Entsperren",
        pt: "Desbloquear",
      },
    },
    {
      id: "term_learning_grade",
      term: "Grade",
      definition: "Assessment grade.",
      translations: {
        en: "Grade",
        ar: "الدرجة",
        fr: "Note",
        es: "Calificación",
        de: "Note",
        pt: "Nota",
      },
    },
    {
      id: "term_learning_submission",
      term: "Submission",
      definition: "Assignment submission.",
      translations: {
        en: "Submission",
        ar: "التسليم",
        fr: "Soumission",
        es: "Entrega",
        de: "Abgabe",
        pt: "Envio",
      },
    },
    {
      id: "term_learning_discussion",
      term: "Discussion",
      definition: "Course discussion.",
      translations: {
        en: "Discussion",
        ar: "نقاش",
        fr: "Discussion",
        es: "Discusión",
        de: "Diskussion",
        pt: "Discussão",
      },
    },
    {
      id: "term_learning_attendance",
      term: "Attendance",
      definition: "Live session attendance.",
      translations: {
        en: "Attendance",
        ar: "الحضور",
        fr: "Présence",
        es: "Asistencia",
        de: "Anwesenheit",
        pt: "Presença",
      },
    },
    {
      id: "term_learning_live_session",
      term: "Live Session",
      definition: "Scheduled live session.",
      translations: {
        en: "Live Session",
        ar: "جلسة مباشرة",
        fr: "Session en direct",
        es: "Sesión en vivo",
        de: "Live-Sitzung",
        pt: "Sessão ao vivo",
      },
    },
    {
      id: "term_learning_calendar",
      term: "Calendar",
      definition: "Learning calendar.",
      translations: {
        en: "Calendar",
        ar: "التقويم",
        fr: "Calendrier",
        es: "Calendario",
        de: "Kalender",
        pt: "Calendário",
      },
    },
    {
      id: "term_learning_practice",
      term: "Practice",
      definition: "Practice activity.",
      translations: {
        en: "Practice",
        ar: "تدريب",
        fr: "Pratique",
        es: "Práctica",
        de: "Übung",
        pt: "Prática",
      },
    },
    {
      id: "term_learning_review",
      term: "Review",
      definition: "Review action / instructor review.",
      translations: {
        en: "Review",
        ar: "مراجعة",
        fr: "Révision",
        es: "Revisión",
        de: "Überprüfung",
        pt: "Revisão",
      },
    },
  ];

  return rows.map((row) => ({
    id: row.id,
    term: row.term,
    definition: row.definition,
    status: approved,
    translations: row.translations,
  }));
}

export function mergeLearningTerminology(
  existing: TerminologyEntry[]
): TerminologyEntry[] {
  const byId = new Map(existing.map((e) => [e.id, e]));
  for (const term of seedLearningTerminology()) {
    if (!byId.has(term.id)) byId.set(term.id, term);
  }
  // Prefer Learning-specific Course/Lesson ids if older generic ones exist.
  return [...byId.values()];
}
