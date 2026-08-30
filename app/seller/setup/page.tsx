import { redirect } from "next/navigation";
import AppTopNav from "../../components/AppTopNav";
import { APP_ROUTES, MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../../lib/nav";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import { getOwnedOrMemberStore } from "../../../lib/store/sellerStore";
import { getLatestSellerApplication } from "../../../lib/store/sellerApplications";
import StoreSetupWizard from "./StoreSetupWizard";

export const metadata = {
  title: "Store Setup | UMTUBA",
};

type SetupPageProps = {
  searchParams?:
 Promise<{
        step?: string;
        error?: string;
        saved?: string;
      }>;
};

export default async function SellerSetupPage({ searchParams }: SetupPageProps) {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.sellerSetup)}`
    );
  }

  const params = (await searchParams) ?? {};
  const supabase = await createClient();
  const membership = await getOwnedOrMemberStore(supabase, user.id);
  if (membership) {
    redirect(APP_ROUTES.sellerStore);
  }

  const application = await getLatestSellerApplication(supabase, user.id);

  if (application?.status === "pending") {
    redirect(`${APP_ROUTES.seller}?submitted=1`);
  }
  if (application?.status === "approved") {
    redirect(APP_ROUTES.seller);
  }
  if (application?.status === "suspended") {
    redirect(APP_ROUTES.seller);
  }

  // Rejected applications can start a new draft in the wizard.
  const resumable =
    application?.status === "draft"
      ? application
      : application?.status === "rejected"
        ? null
        : application;

  const stepParam = Number.parseInt(params.step ?? "", 10);
  const initialStep = Number.isFinite(stepParam)
    ? stepParam
    : resumable?.wizard_step ?? 1;

  return (
    <main
      className={`min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
        <AppTopNav
          title="Store setup"
          subtitle={
            application?.status === "rejected"
              ? "Revise and resubmit"
              : "Seller self-service"
          }
        />

        {application?.status === "rejected" && application.review_note ? (
          <p
            role="status"
            className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/60"
          >
            Previous reviewer note: {application.review_note}
          </p>
        ) : null}

        <StoreSetupWizard
          application={
            resumable ??
            (application?.status === "rejected" ? application : null)
          }
          initialStep={initialStep}
          flashError={params.error}
          flashSaved={params.saved === "1"}
        />
      </div>
    </main>
  );
}
