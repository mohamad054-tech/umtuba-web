import type { LearningSearchFilters } from "./search";

export function learningPartnerHref(input: {
  slug?: string;
  compare?: string;
  filters?: LearningSearchFilters;
  rtl?: boolean;
}): string {
  if (input.slug) {
    const qs = new URLSearchParams();
    if (input.rtl) qs.set("dir", "rtl");
    const suffix = qs.toString();
    return suffix
      ? `/sandbox/learning/partners/${input.slug}?${suffix}`
      : `/sandbox/learning/partners/${input.slug}`;
  }
  if (input.compare) {
    const qs = new URLSearchParams();
    qs.set("topic", input.compare);
    if (input.rtl) qs.set("dir", "rtl");
    return `/sandbox/learning/partners/compare?${qs.toString()}`;
  }

  const qs = new URLSearchParams();
  const filters = input.filters ?? {};
  if (filters.query) qs.set("q", filters.query);
  if (filters.provider && filters.provider !== "ALL") qs.set("provider", filters.provider);
  if (filters.department && filters.department !== "ALL") qs.set("dept", filters.department);
  if (filters.subcategory) qs.set("sub", filters.subcategory);
  if (filters.level && filters.level !== "ALL") qs.set("level", filters.level);
  if (filters.language && filters.language !== "ALL") qs.set("lang", filters.language);
  if (filters.price && filters.price !== "ALL") qs.set("price", filters.price);
  if (filters.certificate) qs.set("cert", "1");
  if (filters.professionalCertificate) qs.set("pro", "1");
  if (filters.universityProvider) qs.set("uni", "1");
  if (filters.academicCredit) qs.set("credit", "1");
  if (filters.recommendation && filters.recommendation !== "ALL") {
    qs.set("rec", filters.recommendation);
  }
  if (input.rtl) qs.set("dir", "rtl");
  const suffix = qs.toString();
  return suffix ? `/sandbox/learning/partners?${suffix}` : "/sandbox/learning/partners";
}
