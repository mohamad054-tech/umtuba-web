import { redirect } from "next/navigation";
import TeacherCenterShell from "../../components/learning/teacher/TeacherCenterShell";
import { LEARNING_TEACHER_ROUTES } from "../../../lib/learning/teacherPlatform";
import { shouldPreferLiveLearningData } from "../../../lib/learning/productization";

export const dynamic = "force-dynamic";

export default async function TeacherCenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!shouldPreferLiveLearningData()) {
    return <>{children}</>;
  }
  const { getServerUser } = await import("../../../lib/supabase/server");
  const user = await getServerUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(LEARNING_TEACHER_ROUTES.center)}`);
  }
  return <TeacherCenterShell>{children}</TeacherCenterShell>;
}
