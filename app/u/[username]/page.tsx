import Link from "next/link";
import { notFound } from "next/navigation";
import StartDirectMessageButton from "../../components/messaging/StartDirectMessageButton";
import { I18nProvider } from "../../components/i18n";
import { resolveRequestLocale } from "../../../lib/i18n/server";
import { translate } from "../../../lib/i18n";
import { isValidUsername, normalizeUsername } from "../../../lib/supabase/validation";
import { getProfileByUsernameFromDb } from "../../../lib/supabase/profiles";
import { getServerUser } from "../../../lib/supabase/server";
import {
  APP_ROUTES,
  buildCreatorProfileHref,
  isUuid,
} from "../../lib/nav";
import { buildPersonalContactUrl } from "../../../lib/comms/contactLink";
import PersonalQrCard from "../../messages/components/PersonalQrCard";
import { initialsFromName, peerGradientFromId } from "../../messages/types";

export const dynamic = "force-dynamic";

type ContactPageProps = {
  params: Promise<{ username: string }>;
};

export default async function PersonalContactPage({ params }: ContactPageProps) {
  const { username: raw } = await params;
  const username = normalizeUsername(raw);
  if (!isValidUsername(username)) {
    notFound();
  }

  const [profile, viewer, requestLocale] = await Promise.all([
    getProfileByUsernameFromDb(username),
    getServerUser().catch(() => null),
    resolveRequestLocale(),
  ]);
  const locale = requestLocale.locale;

  if (!profile) {
    return (
      <I18nProvider locale={locale}>
        <main className="flex min-h-screen items-center justify-center bg-[#050510] px-6 text-white">
          <div className="max-w-md text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-300">
              {translate(locale, "contact.eyebrow")}
            </p>
            <h1 className="mt-3 text-2xl font-black">
              {translate(locale, "contact.notFoundTitle")}
            </h1>
            <p className="mt-2 text-sm text-white/50">
              {translate(locale, "contact.notFoundBody")}
            </p>
          </div>
        </main>
      </I18nProvider>
    );
  }

  const displayName =
    profile.display_name?.trim() ||
    profile.full_name?.trim() ||
    profile.username;
  const isOwner = viewer?.id === profile.id;
  const canMessage = !isOwner && isUuid(profile.id);
  const contactUrl = buildPersonalContactUrl(profile.username);
  const profileHref = buildCreatorProfileHref({ username: profile.username });

  return (
    <I18nProvider locale={locale}>
      <main className="flex min-h-screen items-center justify-center bg-[#050510] px-6 py-16 text-white">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-300">
            {translate(locale, "contact.eyebrow")}
          </p>
          <div className="mt-5 flex items-center gap-4">
            <div
              className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${peerGradientFromId(profile.id)} text-lg font-black`}
            >
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                initialsFromName(displayName)
              )}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-black" dir="auto">
                {displayName}
              </h1>
              <p className="text-sm text-white/50" dir="ltr">
                @{profile.username}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <StartDirectMessageButton
              peerUserId={profile.id}
              peerName={displayName}
              label={translate(locale, "contact.messageCta")}
              hidden={!canMessage}
            />
            <Link
              href={profileHref}
              className="watch-focus-ring rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white/85"
            >
              {translate(locale, "contact.openProfile")}
            </Link>
            {isOwner ? (
              <Link
                href={`${APP_ROUTES.settings}?section=communications`}
                className="watch-focus-ring rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white/85"
              >
                {translate(locale, "settings.communications")}
              </Link>
            ) : null}
          </div>

          {contactUrl ? (
            <div className="mt-8">
              <p className="mb-3 break-all text-xs text-white/45" dir="ltr">
                {contactUrl}
              </p>
              <PersonalQrCard
                url={contactUrl}
                label={translate(locale, "comms.yourQr")}
              />
            </div>
          ) : null}
        </div>
      </main>
    </I18nProvider>
  );
}
