import type { AiHubRecommendationItem } from "../../../lib/ai/hub/types";

type Props = {
  recommendations: AiHubRecommendationItem[];
};

export default function AiRecommendationsSection({
  recommendations,
}: Props) {
  return (
    <section aria-labelledby="ai-recs-heading" className="mt-8">
      <h2 id="ai-recs-heading" className="font-serif text-xl text-[#f3faf5]">
        Recommendations
      </h2>
      <p className="mt-1 text-sm text-emerald-100/65">
        From Personalization Foundation interests — not live ranking execution.
      </p>
      {recommendations.length === 0 ? (
        <p className="mt-3 text-sm text-emerald-100/50">No recommendations yet.</p>
      ) : (
        <ul className="mt-4 grid gap-2">
          {recommendations.map((rec) => (
            <li
              key={rec.recommendationId}
              className="rounded-md border border-emerald-900/50 bg-[#101a16] px-3 py-2"
            >
              <p className="text-sm font-semibold text-emerald-50">{rec.title}</p>
              <p className="mt-1 text-xs text-emerald-100/55">
                {rec.moduleId} · score {rec.score.toFixed(2)} ·{" "}
                {rec.reasons.join(", ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
