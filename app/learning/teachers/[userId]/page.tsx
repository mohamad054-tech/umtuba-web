import { notFound } from "next/navigation";
import { loadLearningTeacherProfileSurface } from "../../../../lib/learning/productization";
import TeacherProfileView from "../../../components/learning/visual/TeacherProfileView";

type PageProps = {
  params: Promise<{ userId: string }>;
};

export default async function PublicTeacherProfilePage({ params }: PageProps) {
  const { userId } = await params;
  const model = await loadLearningTeacherProfileSurface(userId);
  if (!model) {
    notFound();
  }
  return <TeacherProfileView model={model} />;
}
