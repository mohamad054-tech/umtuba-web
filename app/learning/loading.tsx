import LearningRouteLoading from "../components/learning/visual/LearningRouteLoading";

/** Sync fallback — no locale or auth I/O, so the navy shell can paint immediately. */
export default function LearningLoading() {
  return <LearningRouteLoading />;
}
