import type { ProfileView } from "../types";

type ProfileAboutProps = {
  profile: ProfileView;
};

export default function ProfileAbout({ profile }: ProfileAboutProps) {
  const location = [profile.city, profile.country].filter(Boolean).join(", ");

  return (
    <div className="space-y-5 rounded-[24px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm sm:p-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-300/80">
          About
        </p>
        <p className="mt-3 text-sm leading-6 text-white/70">
          {profile.bio || "No bio yet."}
        </p>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        {location ? (
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">
              Location
            </dt>
            <dd className="mt-1 text-sm text-white/80">{location}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">
            Joined
          </dt>
          <dd className="mt-1 text-sm text-white/80">
            {profile.about.joinedLabel}
          </dd>
        </div>
        {profile.about.website ? (
          <div className="sm:col-span-2">
            <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">
              Website
            </dt>
            <dd className="mt-1 text-sm text-blue-200">{profile.about.website}</dd>
          </div>
        ) : null}
      </dl>

      {profile.about.interests.length > 0 ? (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">
            Interests
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {profile.about.interests.map((interest) => (
              <li
                key={interest}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/70"
              >
                {interest}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
