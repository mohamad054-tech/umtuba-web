import { editorialApproved59CopyFor } from "./editorialApproved59";
import { frozenGoldCopy } from "./goldStandard";
import { composeLocalCopy } from "./localComposer";
import { stripSupplierSpam, titleCaseClean } from "./titleCleanup";
import { departmentLabel, placeProductInTaxonomy, subcategoryLabel } from "./taxonomyLocale";
import type { LocalizedProductCopy, LocalizationSourceProduct, ProductLocalizationProvider } from "./types";

function ruleBasedCopy(product: LocalizationSourceProduct): LocalizedProductCopy {
  const cleaned = titleCaseClean(stripSupplierSpam(product.source_title));
  const title_en_clean = cleaned || "Store product";
  const placement = placeProductInTaxonomy({
    sourceTitle: product.source_title,
    sourceDepartment: product.department,
    sourceSubcategory: product.subcategory,
  });
  const department_en = departmentLabel(placement.department, "en");
  const department_ar = departmentLabel(placement.department, "ar");
  const subcategory_en = subcategoryLabel(placement.subcategory, "en");
  const subcategory_ar = subcategoryLabel(placement.subcategory, "ar");

  return {
    title_en_clean,
    title_ar: title_en_clean,
    description_en_clean: `${title_en_clean}. ${department_en} / ${subcategory_en}. Facts are limited to the supplier title; no extra specifications were added.`,
    description_ar: `${title_en_clean}. ${department_ar} / ${subcategory_ar}.`,
    specifications_en: [`Department: ${department_en}`, `Subcategory: ${subcategory_en}`],
    specifications_ar: [`القسم: ${department_ar}`, `الفئة: ${subcategory_ar}`],
    department_en,
    department_ar,
    subcategory_en,
    subcategory_ar,
    search_keywords_en: [title_en_clean],
    search_keywords_ar: [title_en_clean],
  };
}

export function createLocalProductLocalizationProvider(): ProductLocalizationProvider {
  return {
    id: "local",
    localize(product) {
      return (
        frozenGoldCopy(product.cj_product_id) ??
        editorialApproved59CopyFor(product.cj_product_id) ??
        composeLocalCopy(product).copy ??
        ruleBasedCopy(product)
      );
    },
  };
}
