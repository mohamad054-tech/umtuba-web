export type LearningTaxonomyNode = {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
};

export type LearningDepartment = LearningTaxonomyNode & {
  subcategories: readonly LearningTaxonomyNode[];
};

export const LEARNING_DEPARTMENTS: readonly LearningDepartment[] = [
  {
    id: "artificial_intelligence",
    slug: "artificial-intelligence",
    name_en: "Artificial Intelligence",
    name_ar: "الذكاء الاصطناعي",
    subcategories: [
      { id: "machine_learning", slug: "machine-learning", name_en: "Machine Learning", name_ar: "تعلم الآلة" },
      { id: "generative_ai", slug: "generative-ai", name_en: "Generative AI", name_ar: "الذكاء الاصطناعي التوليدي" },
      { id: "ai_ethics", slug: "ai-ethics", name_en: "AI Ethics", name_ar: "أخلاقيات الذكاء الاصطناعي" },
      { id: "computer_vision", slug: "computer-vision", name_en: "Computer Vision", name_ar: "الرؤية الحاسوبية" },
      { id: "nlp", slug: "nlp", name_en: "Natural Language Processing", name_ar: "معالجة اللغة الطبيعية" },
    ],
  },
  {
    id: "programming_development",
    slug: "programming-development",
    name_en: "Programming & Development",
    name_ar: "البرمجة والتطوير",
    subcategories: [
      { id: "web_development", slug: "web-development", name_en: "Web Development", name_ar: "تطوير الويب" },
      { id: "mobile_development", slug: "mobile-development", name_en: "Mobile Development", name_ar: "تطوير التطبيقات" },
      { id: "python_programming", slug: "python-programming", name_en: "Python", name_ar: "بايثون" },
      { id: "software_engineering", slug: "software-engineering", name_en: "Software Engineering", name_ar: "هندسة البرمجيات" },
      { id: "cloud_development", slug: "cloud-development", name_en: "Cloud", name_ar: "الحوسبة السحابية" },
    ],
  },
  {
    id: "data_science",
    slug: "data-science",
    name_en: "Data Science",
    name_ar: "علم البيانات",
    subcategories: [
      { id: "data_analysis", slug: "data-analysis", name_en: "Data Analysis", name_ar: "تحليل البيانات" },
      { id: "data_engineering", slug: "data-engineering", name_en: "Data Engineering", name_ar: "هندسة البيانات" },
      { id: "statistics", slug: "statistics", name_en: "Statistics", name_ar: "الإحصاء" },
      { id: "data_visualization", slug: "data-visualization", name_en: "Visualization", name_ar: "التصور البياني" },
    ],
  },
  {
    id: "cybersecurity",
    slug: "cybersecurity",
    name_en: "Cybersecurity",
    name_ar: "الأمن السيبراني",
    subcategories: [
      { id: "security_fundamentals", slug: "security-fundamentals", name_en: "Security Fundamentals", name_ar: "أساسيات الأمن" },
      { id: "network_security", slug: "network-security", name_en: "Network Security", name_ar: "أمن الشبكات" },
      { id: "ethical_hacking", slug: "ethical-hacking", name_en: "Ethical Hacking", name_ar: "الاختبار الأخلاقي" },
      { id: "cloud_security", slug: "cloud-security", name_en: "Cloud Security", name_ar: "أمن السحابة" },
    ],
  },
  {
    id: "business_management",
    slug: "business-management",
    name_en: "Business & Management",
    name_ar: "الأعمال والإدارة",
    subcategories: [
      { id: "project_management", slug: "project-management", name_en: "Project Management", name_ar: "إدارة المشاريع" },
      { id: "leadership", slug: "leadership", name_en: "Leadership", name_ar: "القيادة" },
      { id: "operations", slug: "operations", name_en: "Operations", name_ar: "العمليات" },
      { id: "strategy", slug: "strategy", name_en: "Strategy", name_ar: "الاستراتيجية" },
    ],
  },
  {
    id: "marketing",
    slug: "marketing",
    name_en: "Marketing",
    name_ar: "التسويق",
    subcategories: [
      { id: "digital_marketing", slug: "digital-marketing", name_en: "Digital Marketing", name_ar: "التسويق الرقمي" },
      { id: "content_marketing", slug: "content-marketing", name_en: "Content Marketing", name_ar: "تسويق المحتوى" },
      { id: "seo", slug: "seo", name_en: "SEO", name_ar: "تحسين محركات البحث" },
      { id: "social_media", slug: "social-media", name_en: "Social Media", name_ar: "وسائل التواصل" },
    ],
  },
  {
    id: "finance_investing",
    slug: "finance-investing",
    name_en: "Finance & Investing",
    name_ar: "المالية والاستثمار",
    subcategories: [
      { id: "personal_finance", slug: "personal-finance", name_en: "Personal Finance", name_ar: "المالية الشخصية" },
      { id: "investing", slug: "investing", name_en: "Investing", name_ar: "الاستثمار" },
      { id: "financial_markets", slug: "financial-markets", name_en: "Financial Markets", name_ar: "الأسواق المالية" },
      { id: "accounting", slug: "accounting", name_en: "Accounting", name_ar: "المحاسبة" },
    ],
  },
  {
    id: "design",
    slug: "design",
    name_en: "Design",
    name_ar: "التصميم",
    subcategories: [
      { id: "ux_ui", slug: "ux-ui", name_en: "UX / UI", name_ar: "تجربة وواجهة المستخدم" },
      { id: "graphic_design", slug: "graphic-design", name_en: "Graphic Design", name_ar: "التصميم الجرافيكي" },
      { id: "product_design", slug: "product-design", name_en: "Product Design", name_ar: "تصميم المنتج" },
    ],
  },
  {
    id: "photography_video",
    slug: "photography-video",
    name_en: "Photography & Video",
    name_ar: "التصوير والفيديو",
    subcategories: [
      { id: "photography", slug: "photography", name_en: "Photography", name_ar: "التصوير الفوتوغرافي" },
      { id: "video_editing", slug: "video-editing", name_en: "Video Editing", name_ar: "تحرير الفيديو" },
      { id: "cinematography", slug: "cinematography", name_en: "Cinematography", name_ar: "التصوير السينمائي" },
    ],
  },
  {
    id: "languages",
    slug: "languages",
    name_en: "Languages",
    name_ar: "اللغات",
    subcategories: [
      { id: "english", slug: "english", name_en: "English", name_ar: "الإنجليزية" },
      { id: "arabic", slug: "arabic", name_en: "Arabic", name_ar: "العربية" },
      { id: "spanish", slug: "spanish", name_en: "Spanish", name_ar: "الإسبانية" },
      { id: "language_teaching", slug: "language-teaching", name_en: "Language Teaching", name_ar: "تعليم اللغات" },
    ],
  },
  {
    id: "career_development",
    slug: "career-development",
    name_en: "Career Development",
    name_ar: "التطوير المهني",
    subcategories: [
      { id: "job_search", slug: "job-search", name_en: "Job Search", name_ar: "البحث عن عمل" },
      { id: "professional_skills", slug: "professional-skills", name_en: "Professional Skills", name_ar: "المهارات المهنية" },
      { id: "interviewing", slug: "interviewing", name_en: "Interviewing", name_ar: "المقابلات" },
    ],
  },
  {
    id: "personal_development",
    slug: "personal-development",
    name_en: "Personal Development",
    name_ar: "التطوير الشخصي",
    subcategories: [
      { id: "learning_skills", slug: "learning-skills", name_en: "Learning Skills", name_ar: "مهارات التعلم" },
      { id: "productivity", slug: "productivity", name_en: "Productivity", name_ar: "الإنتاجية" },
      { id: "mindfulness", slug: "mindfulness", name_en: "Mindfulness", name_ar: "اليقظة الذهنية" },
    ],
  },
  {
    id: "health_fitness",
    slug: "health-fitness",
    name_en: "Health & Fitness",
    name_ar: "الصحة واللياقة",
    subcategories: [
      { id: "wellness", slug: "wellness", name_en: "Wellness", name_ar: "العافية" },
      { id: "nutrition", slug: "nutrition", name_en: "Nutrition", name_ar: "التغذية" },
      { id: "mental_health", slug: "mental-health", name_en: "Mental Health", name_ar: "الصحة النفسية" },
    ],
  },
  {
    id: "school_university",
    slug: "school-university",
    name_en: "School & University",
    name_ar: "المدرسة والجامعة",
    subcategories: [
      { id: "cs_foundations", slug: "cs-foundations", name_en: "Computer Science Foundations", name_ar: "أساسيات علوم الحاسوب" },
      { id: "mathematics", slug: "mathematics", name_en: "Mathematics", name_ar: "الرياضيات" },
      { id: "academic_skills", slug: "academic-skills", name_en: "Academic Skills", name_ar: "المهارات الأكاديمية" },
    ],
  },
  {
    id: "teacher_development",
    slug: "teacher-development",
    name_en: "Teacher Development",
    name_ar: "تطوير المعلمين",
    subcategories: [
      { id: "pedagogy", slug: "pedagogy", name_en: "Pedagogy", name_ar: "طرائق التدريس" },
      { id: "classroom_practice", slug: "classroom-practice", name_en: "Classroom Practice", name_ar: "الممارسة الصفية" },
      { id: "edtech", slug: "edtech", name_en: "Education Technology", name_ar: "تقنية التعليم" },
    ],
  },
  {
    id: "entrepreneurship",
    slug: "entrepreneurship",
    name_en: "Entrepreneurship",
    name_ar: "ريادة الأعمال",
    subcategories: [
      { id: "startups", slug: "startups", name_en: "Startups", name_ar: "الشركات الناشئة" },
      { id: "business_planning", slug: "business-planning", name_en: "Business Planning", name_ar: "تخطيط الأعمال" },
      { id: "product", slug: "product", name_en: "Product", name_ar: "المنتج" },
    ],
  },
] as const;

export function learningDepartmentCount(): number {
  return LEARNING_DEPARTMENTS.length;
}

export function learningSubcategoryCount(): number {
  return LEARNING_DEPARTMENTS.reduce(
    (sum, department) => sum + department.subcategories.length,
    0
  );
}

export function findLearningDepartment(id: string): LearningDepartment | null {
  return LEARNING_DEPARTMENTS.find((department) => department.id === id) ?? null;
}

export function findLearningSubcategory(
  departmentId: string,
  subcategoryId: string
): LearningTaxonomyNode | null {
  const department = findLearningDepartment(departmentId);
  if (!department) return null;
  return (
    department.subcategories.find((item) => item.id === subcategoryId) ?? null
  );
}

export function localizedDepartmentName(
  departmentId: string,
  locale: "en" | "ar"
): string {
  const department = findLearningDepartment(departmentId);
  if (!department) return departmentId;
  return locale === "ar" ? department.name_ar : department.name_en;
}

export function localizedSubcategoryName(
  departmentId: string,
  subcategoryId: string,
  locale: "en" | "ar"
): string {
  const subcategory = findLearningSubcategory(departmentId, subcategoryId);
  if (!subcategory) return subcategoryId;
  return locale === "ar" ? subcategory.name_ar : subcategory.name_en;
}
