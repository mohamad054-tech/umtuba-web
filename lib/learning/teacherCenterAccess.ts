import type { SupabaseClient } from "@supabase/supabase-js";
import {
  loadInstructorDashboard,
  type InstructorDashboardView,
} from "./instructorExperience";
import {
  canTeacherUseCenter,
  loadMyTeacherProfile,
  type LearningTeacherProfile,
} from "./teacherPlatform";

export type TeacherCenterContext = {
  profile: LearningTeacherProfile | null;
  dashboard: InstructorDashboardView | null;
  approved: boolean;
  canOperate: boolean;
  hasLegacyCourses: boolean;
};

export async function loadTeacherCenterContext(
  supabase: SupabaseClient
): Promise<TeacherCenterContext> {
  const profile = await loadMyTeacherProfile(supabase);
  const dashboard = await loadInstructorDashboard(supabase);
  const approved = profile.ok && canTeacherUseCenter(profile.data?.status);
  const hasLegacyCourses = dashboard.ok && dashboard.data.courses.length > 0;
  return {
    profile: profile.ok ? profile.data : null,
    dashboard: dashboard.ok ? dashboard.data : null,
    approved: Boolean(approved),
    canOperate: Boolean(approved || hasLegacyCourses),
    hasLegacyCourses: Boolean(hasLegacyCourses),
  };
}
