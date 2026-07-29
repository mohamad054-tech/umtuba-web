import type { ReactNode } from "react";
import type { ProfileView } from "../types";
import {
  getAboutLocationLabel,
  getVisibleAboutSections,
} from "../lib/profileAboutLiveStructure";

type ProfileAboutProps = {
  profile: ProfileView;
};

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">
      {children}
    </p>
  );
}

function ChipList({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {items.map((item) => (
        <li
          key={item}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/70"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

/**
 * About tab — structured sections (Creator Space Experience V1 §9).
 * Empty sections omit entirely. No owner "Add …" placeholders in this phase.
 */
export default function ProfileAbout({ profile }: ProfileAboutProps) {
  const location = getAboutLocationLabel(profile);
  const sections = getVisibleAboutSections({
    bio: profile.bio,
    location,
    about: profile.about,
  });

  if (sections.length === 0) {
    return (
      <div className="space-y-2 rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-10 text-center">
        <p className="text-sm text-white/50">No About details yet.</p>
        <p className="text-xs text-white/35">
          Bio, experience, and links will appear here when available.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-[24px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm sm:p-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-300/80">
          About
        </p>
      </div>

      {sections.includes("bio") ? (
        <section className="space-y-3">
          <SectionHeading>Bio</SectionHeading>
          {profile.bio ? (
            <p className="text-sm leading-6 text-white/70">{profile.bio}</p>
          ) : null}
          {location ? (
            <p className="text-sm text-white/55">{location}</p>
          ) : null}
        </section>
      ) : null}

      {sections.includes("roles") ? (
        <section>
          <SectionHeading>Roles</SectionHeading>
          <ChipList items={profile.about.roles ?? []} />
        </section>
      ) : null}

      {sections.includes("experience") ? (
        <section>
          <SectionHeading>Experience</SectionHeading>
          <ul className="mt-3 space-y-3">
            {(profile.about.experience ?? []).map((item) => (
              <li key={`${item.title}-${item.detail ?? ""}`}>
                <p className="text-sm font-bold text-white/85">{item.title}</p>
                {item.detail ? (
                  <p className="mt-1 text-sm leading-6 text-white/55">
                    {item.detail}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {sections.includes("education") ? (
        <section>
          <SectionHeading>Education</SectionHeading>
          <ul className="mt-3 space-y-3">
            {(profile.about.education ?? []).map((item) => (
              <li key={`${item.title}-${item.detail ?? ""}`}>
                <p className="text-sm font-bold text-white/85">{item.title}</p>
                {item.detail ? (
                  <p className="mt-1 text-sm leading-6 text-white/55">
                    {item.detail}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {sections.includes("specialtiesInterests") ? (
        <section className="space-y-4">
          <SectionHeading>Specialties &amp; interests</SectionHeading>
          {(profile.about.specialties?.length ?? 0) > 0 ? (
            <div>
              <p className="text-xs font-semibold text-white/45">Specialties</p>
              <ChipList items={profile.about.specialties ?? []} />
            </div>
          ) : null}
          {(profile.about.interests?.length ?? 0) > 0 ? (
            <div>
              <p className="text-xs font-semibold text-white/45">Interests</p>
              <ChipList items={profile.about.interests} />
            </div>
          ) : null}
        </section>
      ) : null}

      {sections.includes("achievements") ? (
        <section>
          <SectionHeading>Achievements</SectionHeading>
          <ChipList items={profile.about.achievements ?? []} />
        </section>
      ) : null}

      {sections.includes("links") ? (
        <section>
          <SectionHeading>Links</SectionHeading>
          <ul className="mt-3 space-y-2">
            {profile.about.website ? (
              <li>
                <a
                  href={
                    /^https?:\/\//i.test(profile.about.website)
                      ? profile.about.website
                      : `https://${profile.about.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-bold text-sky-300 underline-offset-2 hover:underline"
                >
                  {profile.about.website.replace(/^https?:\/\//i, "")}
                </a>
              </li>
            ) : null}
            {(profile.about.links ?? []).map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-bold text-sky-300 underline-offset-2 hover:underline"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {sections.includes("joined") ? (
        <section>
          <SectionHeading>Joined</SectionHeading>
          <p className="mt-2 text-sm text-white/80">
            {profile.about.joinedLabel}
          </p>
        </section>
      ) : null}
    </div>
  );
}
