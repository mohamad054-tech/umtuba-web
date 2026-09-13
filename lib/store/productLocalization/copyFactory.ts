import { departmentLabel, subcategoryLabel } from "./taxonomyLocale";
import type { LocalizedProductCopy } from "./types";
import type { StoreDepartment } from "../../services/cj/expansionTaxonomy";

export function buildLocalizedCopy(input: {
  department: StoreDepartment;
  subcategory: string;
  title_en_clean: string;
  title_ar: string;
  description_en_clean: string;
  description_ar: string;
  specifications_en: string[];
  specifications_ar: string[];
  search_keywords_en: string[];
  search_keywords_ar: string[];
}): LocalizedProductCopy {
  return {
    title_en_clean: input.title_en_clean,
    title_ar: input.title_ar,
    description_en_clean: input.description_en_clean,
    description_ar: input.description_ar,
    specifications_en: input.specifications_en,
    specifications_ar: input.specifications_ar,
    department_en: departmentLabel(input.department, "en"),
    department_ar: departmentLabel(input.department, "ar"),
    subcategory_en: subcategoryLabel(input.subcategory, "en"),
    subcategory_ar: subcategoryLabel(input.subcategory, "ar"),
    search_keywords_en: input.search_keywords_en,
    search_keywords_ar: input.search_keywords_ar,
  };
}

export function refreshLocalizedTaxonomy(
  copy: LocalizedProductCopy,
  department: StoreDepartment,
  subcategory: string
): LocalizedProductCopy {
  return {
    ...copy,
    department_en: departmentLabel(department, "en"),
    department_ar: departmentLabel(department, "ar"),
    subcategory_en: subcategoryLabel(subcategory, "en"),
    subcategory_ar: subcategoryLabel(subcategory, "ar"),
  };
}
