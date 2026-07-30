import type { StudioLanguageCode, TerminologyEntry } from "./types";

export type TerminologyStore = {
  list(): TerminologyEntry[];
  lookupTerm(term: string): TerminologyEntry | null;
  lookupApprovedTranslation(input: {
    term: string;
    language: StudioLanguageCode;
  }): string | null;
  findInSourceText(sourceText: string): TerminologyEntry[];
};

function normalizeTerm(term: string): string {
  return term.trim().toLowerCase();
}

export function createTerminologyStore(
  initial: TerminologyEntry[] = []
): TerminologyStore {
  const entries = [...initial];

  return {
    list() {
      return [...entries];
    },

    lookupTerm(term) {
      const needle = normalizeTerm(term);
      return (
        entries.find((e) => normalizeTerm(e.term) === needle) ?? null
      );
    },

    lookupApprovedTranslation({ term, language }) {
      const entry = this.lookupTerm(term);
      if (!entry || entry.status !== "approved") return null;
      return entry.translations[language] ?? null;
    },

    findInSourceText(sourceText) {
      const haystack = sourceText.toLowerCase();
      return entries.filter((entry) => {
        if (entry.status === "deprecated") return false;
        const term = entry.term.toLowerCase();
        if (!term) return false;
        // Word-boundary-ish match for multi-word terms.
        return (
          haystack === term ||
          haystack.includes(` ${term} `) ||
          haystack.startsWith(`${term} `) ||
          haystack.endsWith(` ${term}`) ||
          haystack.includes(term)
        );
      });
    },
  };
}

/** Seed terminology — common UMTUBA product terms. */
export function seedUmtubaTerminology(): TerminologyEntry[] {
  const nowApproved = "approved" as const;
  return [
    {
      id: "term_home",
      term: "Home",
      definition: "Primary app home / feed destination.",
      notes: "Nav label",
      status: nowApproved,
      translations: {
        en: "Home",
        ar: "الرئيسية",
        fr: "Accueil",
        es: "Inicio",
        de: "Start",
        pt: "Início",
      },
    },
    {
      id: "term_learning",
      term: "Learning",
      definition: "UMTUBA Learning product surface.",
      status: nowApproved,
      translations: {
        en: "Learning",
        ar: "التعلّم",
        fr: "Apprentissage",
        es: "Aprendizaje",
        de: "Lernen",
        pt: "Aprendizado",
      },
    },
    {
      id: "term_creator",
      term: "Creator",
      definition: "Content creator identity and Creator Space.",
      status: nowApproved,
      translations: {
        en: "Creator",
        ar: "المنشئ",
        fr: "Créateur",
        es: "Creador",
        de: "Creator",
        pt: "Criador",
      },
    },
    {
      id: "term_wallet",
      term: "Wallet",
      definition: "User wallet / balances surface.",
      status: nowApproved,
      translations: {
        en: "Wallet",
        ar: "المحفظة",
        fr: "Portefeuille",
        es: "Cartera",
        de: "Wallet",
        pt: "Carteira",
      },
    },
    {
      id: "term_marketplace",
      term: "Marketplace",
      definition: "Commerce marketplace / store discovery.",
      status: nowApproved,
      translations: {
        en: "Marketplace",
        ar: "السوق",
        fr: "Marketplace",
        es: "Marketplace",
        de: "Marktplatz",
        pt: "Marketplace",
      },
    },
    {
      id: "term_course",
      term: "Course",
      definition: "Learning course container.",
      status: nowApproved,
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
      id: "term_lesson",
      term: "Lesson",
      definition: "Learning lesson unit.",
      status: nowApproved,
      translations: {
        en: "Lesson",
        ar: "درس",
        fr: "Leçon",
        es: "Lección",
        de: "Lektion",
        pt: "Lição",
      },
    },
    {
      id: "term_profile",
      term: "Profile",
      definition: "Public or own creator/user profile.",
      status: nowApproved,
      translations: {
        en: "Profile",
        ar: "الملف",
        fr: "Profil",
        es: "Perfil",
        de: "Profil",
        pt: "Perfil",
      },
    },
    {
      id: "term_live",
      term: "Live",
      definition: "Live streaming product surface.",
      status: nowApproved,
      translations: {
        en: "Live",
        ar: "مباشر",
        fr: "Live",
        es: "En vivo",
        de: "Live",
        pt: "Ao vivo",
      },
    },
    {
      id: "term_world",
      term: "World",
      definition: "World discovery map / places surface.",
      status: nowApproved,
      translations: {
        en: "World",
        ar: "العالم",
        fr: "Monde",
        es: "Mundo",
        de: "Welt",
        pt: "Mundo",
      },
    },
    {
      id: "term_games",
      term: "Games",
      definition: "Games platform surface.",
      status: nowApproved,
      translations: {
        en: "Games",
        ar: "الألعاب",
        fr: "Jeux",
        es: "Juegos",
        de: "Spiele",
        pt: "Jogos",
      },
    },
    {
      id: "term_store",
      term: "Store",
      definition: "Commerce storefront surface.",
      status: nowApproved,
      translations: {
        en: "Store",
        ar: "المتجر",
        fr: "Boutique",
        es: "Tienda",
        de: "Shop",
        pt: "Loja",
      },
    },
    {
      id: "term_watch",
      term: "Watch",
      definition: "Video watch experience.",
      status: nowApproved,
      translations: {
        en: "Watch",
        ar: "المشاهدة",
        fr: "Regarder",
        es: "Ver",
        de: "Ansehen",
        pt: "Assistir",
      },
    },
    {
      id: "term_continue",
      term: "Continue",
      definition: "Generic continue action.",
      status: nowApproved,
      translations: {
        en: "Continue",
        ar: "متابعة",
        fr: "Continuer",
        es: "Continuar",
        de: "Weiter",
        pt: "Continuar",
      },
    },
    {
      id: "term_save",
      term: "Save",
      definition: "Generic save action.",
      status: nowApproved,
      translations: {
        en: "Save",
        ar: "حفظ",
        fr: "Enregistrer",
        es: "Guardar",
        de: "Speichern",
        pt: "Salvar",
      },
    },
    {
      id: "term_cancel",
      term: "Cancel",
      definition: "Generic cancel action.",
      status: nowApproved,
      translations: {
        en: "Cancel",
        ar: "إلغاء",
        fr: "Annuler",
        es: "Cancelar",
        de: "Abbrechen",
        pt: "Cancelar",
      },
    },
  ];
}
