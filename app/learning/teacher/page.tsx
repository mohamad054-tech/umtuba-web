import { redirect } from "next/navigation";
import { loadLearningTeacherCenterSurface } from "../../../lib/learning/productization";
import TeacherCenterView from "../../components/learning/visual/TeacherCenterView";

export default async function TeacherDashboardPage() {
  const loaded = await loadLearningTeacherCenterSurface();
  if (loaded.kind === "auth") {
    redirect(loaded.loginHref);
  }
  return (
    <TeacherCenterView
      model={loaded.surface}
      embedded={loaded.surface.source === "live"}
    />
  );
}
