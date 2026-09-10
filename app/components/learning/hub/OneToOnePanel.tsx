"use client";

import { useTranslation } from "../../i18n";
import {
  formatOneToOneRange,
  type OneToOneHubData,
} from "../../../../lib/learning/oneToOne";
import {
  cancelOneToOneAction,
  requestOneToOneAction,
  rescheduleOneToOneAction,
} from "../../../learning/oneToOneActions";

export function OneToOnePanel({ data }: { data: OneToOneHubData }) {
  const { t, locale } = useTranslation();
  const openSlots = data.availability.filter((row) => row.status === "open");
  const teachers = data.teachers;
  const selected = data.selectedTeacherId ?? teachers[0]?.id ?? "";

  return (
    <div className="space-y-8">
      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
        <h2 className="text-2xl font-black tracking-tight">
          {t("learning.oneToOne.title")}
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-white/65">
          {t("learning.oneToOne.body")}
        </p>
        <p className="mt-3 text-xs text-amber-100/80">
          {t("learning.oneToOne.paymentDisabled")}
        </p>
        {data.backend === "static" ? (
          <p className="mt-3 text-xs text-white/45">
            {t("learning.oneToOne.staticOnly")}
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
          {t("learning.oneToOne.findTeacher")}
        </h3>
        {teachers.length === 0 ? (
          <p className="text-sm text-white/55">{t("learning.oneToOne.noTimes")}</p>
        ) : (
          <form method="get" action="/learning" className="flex flex-wrap gap-3">
            <input type="hidden" name="hub" value="oneToOne" />
            <label className="block min-w-[16rem] flex-1 text-sm">
              <span className="mb-2 block text-white/60">
                {t("learning.oneToOne.pickTeacher")}
              </span>
              <select
                name="teacher"
                defaultValue={selected}
                className="watch-focus-ring w-full rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm"
              >
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="watch-focus-ring self-end rounded-full border border-white/15 px-4 py-2 text-sm font-bold"
            >
              {t("learning.oneToOne.pickTeacher")}
            </button>
          </form>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
          {t("learning.oneToOne.availableTimes")}
        </h3>
        {!data.viewerId ? (
          <p className="text-sm text-white/55">{t("learning.oneToOne.signIn")}</p>
        ) : openSlots.length === 0 ? (
          <p className="text-sm text-white/55">{t("learning.oneToOne.noTimes")}</p>
        ) : (
          <ul className="space-y-3">
            {openSlots.map((slot) => {
              const range = formatOneToOneRange(
                locale,
                slot.starts_at,
                slot.ends_at
              );
              return (
                <li
                  key={slot.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  <p className="text-sm font-bold">
                    {t("learning.oneToOne.range", {
                      values: { start: range.start, end: range.end },
                    })}
                  </p>
                  <form action={requestOneToOneAction}>
                    <input type="hidden" name="availabilityId" value={slot.id} />
                    <button
                      type="submit"
                      disabled={data.backend === "static"}
                      className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/50"
                    >
                      {t("learning.oneToOne.book")}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
          {t("learning.oneToOne.myBookings")}
        </h3>
        {data.bookings.length === 0 ? (
          <p className="text-sm text-white/55">{t("learning.oneToOne.empty")}</p>
        ) : (
          <ul className="space-y-3">
            {data.bookings.map((booking) => {
              const range = formatOneToOneRange(
                locale,
                booking.starts_at,
                booking.ends_at
              );
              const statusKey =
                booking.status === "requested"
                  ? "learning.oneToOne.status.requested"
                  : booking.status === "confirmed"
                    ? "learning.oneToOne.status.confirmed"
                    : booking.status === "cancelled"
                      ? "learning.oneToOne.status.cancelled"
                      : "learning.oneToOne.status.completed";
              return (
                <li
                  key={booking.id}
                  className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold">
                      {t("learning.oneToOne.range", {
                        values: { start: range.start, end: range.end },
                      })}
                    </p>
                    <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-bold">
                      {t(statusKey)}
                    </span>
                  </div>
                  {booking.status === "requested" ||
                  booking.status === "confirmed" ? (
                    <div className="flex flex-wrap gap-2">
                      {openSlots[0] ? (
                        <form action={rescheduleOneToOneAction}>
                          <input
                            type="hidden"
                            name="bookingId"
                            value={booking.id}
                          />
                          <label className="sr-only" htmlFor={`reschedule-${booking.id}`}>
                            {t("learning.oneToOne.selectSlot")}
                          </label>
                          <select
                            id={`reschedule-${booking.id}`}
                            name="availabilityId"
                            className="me-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs"
                          >
                            {openSlots.map((slot) => {
                              const option = formatOneToOneRange(
                                locale,
                                slot.starts_at,
                                slot.ends_at
                              );
                              return (
                                <option key={slot.id} value={slot.id}>
                                  {t("learning.oneToOne.range", {
                                    values: {
                                      start: option.start,
                                      end: option.end,
                                    },
                                  })}
                                </option>
                              );
                            })}
                          </select>
                          <button
                            type="submit"
                            disabled={data.backend === "static"}
                            className="watch-focus-ring rounded-full border border-white/15 px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:text-white/40"
                          >
                            {t("learning.oneToOne.reschedule")}
                          </button>
                        </form>
                      ) : null}
                      <form action={cancelOneToOneAction} className="flex flex-wrap gap-2">
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <label className="sr-only" htmlFor={`cancel-${booking.id}`}>
                          {t("learning.oneToOne.cancelReason")}
                        </label>
                        <input
                          id={`cancel-${booking.id}`}
                          name="reason"
                          className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs"
                        />
                        <button
                          type="submit"
                          disabled={data.backend === "static"}
                          className="watch-focus-ring rounded-full border border-white/15 px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:text-white/40"
                        >
                          {t("learning.oneToOne.cancel")}
                        </button>
                      </form>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
