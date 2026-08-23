import { redirect } from "next/navigation";
import TeacherCenterShell from "../../components/learning/teacher/TeacherCenterShell";
import { getServerUser } from "../../../lib/supabase/server";
import { LEARNING_TEACHER_ROUTES } from "../../../lib/learning/teacherPlatform";

export const dynamic = "force-dynamic";

export default async function TeacherCenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(LEARNING_TEACHER_ROUTES.center)}`);
  }
  return <TeacherCenterShell>{children}</TeacherCenterShell>;
}
