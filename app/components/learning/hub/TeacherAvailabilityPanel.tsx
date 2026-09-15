"use client";

import { useTranslation } from "../../i18n";
import {
  formatOneToOneRange,
  type OneToOneHubData,
} from "../../../../lib/learning/oneToOne";
import {
  confirmOneToOneAction,
  completeOneToOneAction,
  upsertOneToOneAvailabilityAction,
} from "../../../learning/oneToOneActions";

export function TeacherAvailabilityPanel({
  data,
  visible,
}: {
  data: OneToOneHubData;
  visible: boolean;
}) {
  const { t, locale } = useTranslation();
  if (!visible) return null;

  const requests = data.bookings.filter(
    (row) => row.status === "requested" || row.status === "confirmed"
  );

  return (
    <div className="mt-8 space-y-8">
      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
        <h3 className="text-xl font-black">{t("learning.oneToOne.manageAvailability")}</h3>
        <p className="mt-2 text-sm text-white/60">
          {t("learning.oneToOne.availability")}
        </p>
        <form
          action={upsertOneToOneAvailabilityAction}
          className="mt-4 grid gap-3 md:grid-cols-2"
        >
          <label className="text-sm">
            <span className="mb-2 block text-white/60">
              {t("learning.oneToOne.startsAt")}
            </span>
            <input
              type="datetime-local"
              name="startsAt"
              required
              className="watch-focus-ring w-full rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="mb-2 block text-white/60">
              {t("learning.oneToOne.endsAt")}
            </span>
            <input
              type="datetime-local"
              name="endsAt"
              required
              className="watch-focus-ring w-full rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm"
            />
          </label>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <button
              type="submit"
              name="status"
              value="open"
              disabled={data.backend === "static"}
              className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/50"
            >
              {t("learning.oneToOne.openWindow")}
            </button>
            <button
              type="submit"
              name="status"
              value="blocked"
              disabled={data.backend === "static"}
              className="watch-focus-ring rounded-full border border-white/15 px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:text-white/40"
            >
              {t("learning.oneToOne.blockWindow")}
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
          {t("learning.oneToOne.requestsTitle")}
        </h3>
        {requests.length === 0 ? (
          <p className="text-sm text-white/55">{t("learning.oneToOne.empty")}</p>
        ) : (
          <ul className="space-y-3">
            {requests.map((booking) => {
              const range = formatOneToOneRange(
                locale,
                booking.starts_at,
                booking.ends_at
              );
              return (
                <li
                  key={booking.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  <p className="text-sm font-bold">
                    {t("learning.oneToOne.range", {
                      values: { start: range.start, end: range.end },
                    })}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {booking.status === "requested" ? (
                      <form action={confirmOneToOneAction}>
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <button
                          type="submit"
                          disabled={data.backend === "static"}
                          className="watch-focus-ring rounded-full bg-white px-3 py-2 text-xs font-black text-black disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/50"
                        >
                          {t("learning.oneToOne.confirm")}
                        </button>
                      </form>
                    ) : (
                      <form action={completeOneToOneAction}>
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <button
                          type="submit"
                          disabled={data.backend === "static"}
                          className="watch-focus-ring rounded-full border border-white/15 px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:text-white/40"
                        >
                          {t("learning.oneToOne.complete")}
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
