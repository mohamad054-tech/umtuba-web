import type { AiHubFavoriteItem } from "../../../lib/ai/hub/types";

type Props = {
  favorites: AiHubFavoriteItem[];
};

export default function AiFavoritesSection({ favorites }: Props) {
  return (
    <section aria-labelledby="ai-favorites-heading" className="mt-8">
      <h2
        id="ai-favorites-heading"
        className="font-serif text-xl text-[#f3faf5]"
      >
        Favorites
      </h2>
      <p className="mt-1 text-sm text-emerald-100/65">
        From AI Hub favorites contracts (foundation store).
      </p>
      {favorites.length === 0 ? (
        <p className="mt-3 text-sm text-emerald-100/50">No favorites yet.</p>
      ) : (
        <ul className="mt-4 grid gap-2">
          {favorites.map((fav) => (
            <li
              key={fav.favoriteId}
              className="rounded-md border border-emerald-900/50 bg-[#101a16] px-3 py-2"
            >
              <p className="text-sm font-semibold text-emerald-50">
                {fav.targetType}: {fav.targetId}
              </p>
              <p className="mt-1 text-xs text-emerald-100/55">
                {new Date(fav.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
