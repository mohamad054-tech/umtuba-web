import { redirect } from "next/navigation";
import { createCreativeAction } from "../../../actions/ads";
import { CTA_TYPES, CREATIVE_TYPES } from "../../../../lib/ads/constants";
import { listCampaigns } from "../../../../lib/ads/campaigns";
import { resolvePrimaryAdvertiserAccount } from "../../../../lib/ads/queries";
import { APP_ROUTES } from "../../../lib/nav";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import AdvertiseShell from "../../AdvertiseShell";

export const metadata = {
  title: "New Creative | UMTUBA Ads",
};

type PageProps = {
  searchParams?:
 Promise<{ error?: string; campaignId?: string }>;
};

export default async function NewCreativePage({ searchParams }: PageProps) {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.advertiseCreativesNew)}`
    );
  }

  const params = (await searchParams) ?? {};
  const supabase = await createClient();
  const primary = await resolvePrimaryAdvertiserAccount(supabase, user.id);
  if (!primary.ok || !primary.account) {
    redirect(APP_ROUTES.advertiseApply);
  }

  const campaigns = await listCampaigns(supabase, primary.account.id);

  return (
    <AdvertiseShell title="New creative">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h1 className="text-2xl font-black tracking-tight">Upload a creative</h1>
        <p className="mt-2 text-sm text-white/50">
          Media stays in the private ad-creatives bucket. Use https destinations
          only. Approved creatives cannot be edited — create a new draft instead.
        </p>

        {params.error ? (
          <p
            role="alert"
            className="mt-4 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100"
          >
            {params.error}
          </p>
        ) : null}

        <form
          action={createCreativeAction}
          encType="multipart/form-data"
          className="mt-6 space-y-4"
        >
          <input
            type="hidden"
            name="advertiserAccountId"
            value={primary.account.id}
          />

          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
              Campaign
            </span>
            <select
              name="campaignId"
              required
              defaultValue={params.campaignId ?? ""}
              className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
            >
              <option value="" disabled>
                Select campaign
              </option>
              {campaigns.ok
                ? campaigns.campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))
                : null}
            </select>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Type
              </span>
              <select
                name="creativeType"
                defaultValue="image"
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
              >
                {CREATIVE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Call to action
              </span>
              <select
                name="callToAction"
                defaultValue="learn_more"
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
              >
                {CTA_TYPES.map((cta) => (
                  <option key={cta} value={cta}>
                    {cta.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
              Headline
            </span>
            <input
              name="headline"
              required
              maxLength={80}
              className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
              Body (optional)
            </span>
            <textarea
              name="bodyText"
              rows={3}
              maxLength={500}
              className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
              Destination URL
            </span>
            <input
              name="destinationUrl"
              type="url"
              required
              placeholder="https://"
              maxLength={500}
              className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
              Media (image or video)
            </span>
            <input
              name="media"
              type="file"
              required
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
              className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-black"
            />
          </label>

          <button
            type="submit"
            className="watch-focus-ring w-full rounded-2xl bg-white py-4 font-black text-black"
          >
            Save draft creative
          </button>
        </form>
      </section>
    </AdvertiseShell>
  );
}
