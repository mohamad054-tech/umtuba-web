"use client";

import { useState } from "react";
import { useTranslation } from "../components/i18n";
import type { TranslationKey } from "../../lib/i18n";
import {
  PROFILE_EDUCATION_TYPES,
  PROFILE_MILESTONE_CATEGORIES,
  PROFILE_PLACE_KINDS,
  PROFILE_TAG_KINDS,
  PROFILE_VISIBILITY,
  PROFILE_WORK_KINDS,
  type ProfileEducationType,
  type ProfileMilestoneCategory,
  type ProfilePlaceKind,
  type ProfileTagKind,
  type ProfileVisibility,
  type ProfileWorkKind,
} from "../../lib/profile/richProfileContract";
import {
  createProfileEducation,
  createProfileLink,
  createProfileMilestone,
  createProfilePlace,
  createProfileTag,
  createProfileWork,
  deleteProfileEducation,
  deleteProfileLink,
  deleteProfileMilestone,
  deleteProfilePlace,
  deleteProfileTag,
  deleteProfileWork,
  reorderProfilePlace,
  reorderProfileTag,
  type ProfileEducationRow,
  type ProfileLinkRow,
  type ProfileMilestoneRow,
  type ProfilePlaceRow,
  type ProfileTagRow,
  type ProfileWorkRow,
  type RichProfileBundle,
  updateProfileEducation,
  updateProfileLink,
  updateProfileMilestone,
  updateProfilePlace,
  updateProfileWork,
} from "../../lib/supabase/richProfile";

type RichProfileEditorProps = {
  initial: RichProfileBundle;
};

function VisibilitySelect({
  value,
  onChange,
  disabled,
}: {
  value: ProfileVisibility;
  onChange: (value: ProfileVisibility) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <label className="block space-y-1">
      <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
        {t("settings.visibility")}
      </span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value as ProfileVisibility)
        }
        className="w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-blue-400/40 disabled:opacity-60"
      >
        {PROFILE_VISIBILITY.map((item) => (
          <option key={item} value={item}>
            {t(`settings.visibility.${item === "only_me" ? "onlyMe" : item}` as TranslationKey)}
          </option>
        ))}
      </select>
      {value === "connections" ? (
        <span className="text-[11px] leading-4 text-white/40">
          {t("settings.visibility.connectionsHint")}
        </span>
      ) : null}
    </label>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-blue-400/40 disabled:opacity-60";

export default function RichProfileEditor({ initial }: RichProfileEditorProps) {
  const { t } = useTranslation();
  const [places, setPlaces] = useState(initial.places);
  const [education, setEducation] = useState(initial.education);
  const [work, setWork] = useState(initial.work);
  const [tags, setTags] = useState(initial.tags);
  const [milestones, setMilestones] = useState(initial.milestones);
  const [links, setLinks] = useState(initial.links);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function note(ok: string) {
    setError("");
    setMessage(ok);
  }

  function fail(caught: unknown) {
    setMessage("");
    setError(caught instanceof Error ? caught.message : t("status.error"));
  }

  async function run(task: () => Promise<void>) {
    setBusy(true);
    try {
      await task();
    } catch (caught) {
      fail(caught);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8 pt-4">
      <p className="text-xs leading-5 text-white/40">
        {t("settings.profileOptionalHint")}
      </p>
      {message ? (
        <p className="text-sm text-emerald-200">{message}</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <PlacesCard
        items={places}
        busy={busy}
        onChange={setPlaces}
        run={run}
        note={note}
      />
      <EducationCard
        items={education}
        busy={busy}
        onChange={setEducation}
        run={run}
        note={note}
      />
      <WorkCard
        items={work}
        busy={busy}
        onChange={setWork}
        run={run}
        note={note}
      />
      <TagsCard
        items={tags}
        busy={busy}
        onChange={setTags}
        run={run}
        note={note}
      />
      <MilestonesCard
        items={milestones}
        busy={busy}
        onChange={setMilestones}
        run={run}
        note={note}
      />
      <LinksCard
        items={links}
        busy={busy}
        onChange={setLinks}
        run={run}
        note={note}
      />
    </div>
  );
}

function PlacesCard({
  items,
  busy,
  onChange,
  run,
  note,
}: {
  items: ProfilePlaceRow[];
  busy: boolean;
  onChange: (rows: ProfilePlaceRow[]) => void;
  run: (task: () => Promise<void>) => Promise<void>;
  note: (ok: string) => void;
}) {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [kind, setKind] = useState<ProfilePlaceKind>("hometown");
  const [label, setLabel] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [visibility, setVisibility] = useState<ProfileVisibility>("public");

  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
      <h3 className="text-sm font-black tracking-tight text-white/80">
        {t("settings.profilePlacesHeading")}
      </h3>
      <p className="text-xs text-white/40">{t("settings.noStreetHint")}</p>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-bold" dir="auto">
                {item.label}
              </p>
              <p className="text-xs text-white/45" dir="auto">
                {[item.city, item.region, item.country].filter(Boolean).join(", ")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || index === 0}
                className="text-xs text-white/60 disabled:opacity-40"
                onClick={() =>
                  void run(async () => {
                    const prev = items[index - 1];
                    if (!prev) return;
                    const updated = await reorderProfilePlace(item.id, prev.sort_order);
                    const neighbor = await reorderProfilePlace(prev.id, item.sort_order);
                    onChange(
                      items.map((row) =>
                        row.id === updated.id
                          ? updated
                          : row.id === neighbor.id
                            ? neighbor
                            : row
                      )
                    );
                  })
                }
              >
                {t("settings.moveUp")}
              </button>
              <button
                type="button"
                disabled={busy}
                className="text-xs text-white/70"
                onClick={() => {
                  setEditingId(item.id);
                  setKind(item.place_kind);
                  setLabel(item.label);
                  setCity(item.city ?? "");
                  setRegion(item.region ?? "");
                  setCountry(item.country ?? "");
                  setVisibility(item.visibility);
                }}
              >
                {t("actions.edit")}
              </button>
              <button
                type="button"
                disabled={busy}
                className="text-xs text-red-200"
                onClick={() =>
                  void run(async () => {
                    await deleteProfilePlace(item.id);
                    onChange(items.filter((row) => row.id !== item.id));
                    note(t("settings.recordRemoved"));
                  })
                }
              >
                {t("settings.remove")}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("settings.placeLabel")}>
          <select
            className={inputClass}
            value={kind}
            disabled={busy}
            onChange={(event) => setKind(event.target.value as ProfilePlaceKind)}
          >
            {PROFILE_PLACE_KINDS.map((item) => (
              <option key={item} value={item}>
                {t(`settings.placeKind.${item}` as TranslationKey)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("settings.placeLabel")}>
          <input
            className={inputClass}
            dir="auto"
            value={label}
            disabled={busy}
            onChange={(event) => setLabel(event.target.value)}
          />
        </Field>
        <Field label={t("settings.city")}>
          <input
            className={inputClass}
            dir="auto"
            autoComplete="address-level2"
            value={city}
            disabled={busy}
            onChange={(event) => setCity(event.target.value)}
          />
        </Field>
        <Field label={t("settings.region")}>
          <input
            className={inputClass}
            dir="auto"
            autoComplete="address-level1"
            value={region}
            disabled={busy}
            onChange={(event) => setRegion(event.target.value)}
          />
        </Field>
        <Field label={t("settings.country")}>
          <input
            className={inputClass}
            dir="auto"
            autoComplete="country-name"
            value={country}
            disabled={busy}
            onChange={(event) => setCountry(event.target.value)}
          />
        </Field>
        <VisibilitySelect
          value={visibility}
          onChange={setVisibility}
          disabled={busy}
        />
      </div>
      <button
        type="button"
        disabled={busy}
        className="watch-focus-ring rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold"
        onClick={() =>
          void run(async () => {
            const draft = {
              placeKind: kind,
              label: label || t(`settings.placeKind.${kind}` as TranslationKey),
              city,
              region,
              country,
              visibility,
              sortOrder: items.length,
            };
            if (editingId) {
              const updated = await updateProfilePlace(editingId, draft);
              onChange(
                items.map((row) => (row.id === updated.id ? updated : row))
              );
              setEditingId(null);
            } else {
              const created = await createProfilePlace(draft);
              onChange([...items, created]);
            }
            setLabel("");
            setCity("");
            setRegion("");
            setCountry("");
            note(t("settings.recordSaved"));
          })
        }
      >
        {t("settings.add")}
      </button>
    </section>
  );
}

function EducationCard({
  items,
  busy,
  onChange,
  run,
  note,
}: {
  items: ProfileEducationRow[];
  busy: boolean;
  onChange: (rows: ProfileEducationRow[]) => void;
  run: (task: () => Promise<void>) => Promise<void>;
  note: (ok: string) => void;
}) {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [institution, setInstitution] = useState("");
  const [educationType, setEducationType] =
    useState<ProfileEducationType>("other");
  const [fieldOfStudy, setFieldOfStudy] = useState("");
  const [credential, setCredential] = useState("");
  const [visibility, setVisibility] = useState<ProfileVisibility>("public");

  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
      <h3 className="text-sm font-black tracking-tight text-white/80">
        {t("settings.educationHeading")}
      </h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-bold" dir="auto">
                {item.institution}
              </p>
              <p className="text-xs text-white/45" dir="auto">
                {[item.credential, item.field_of_study].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                className="text-xs text-white/70"
                onClick={() => {
                  setEditingId(item.id);
                  setInstitution(item.institution);
                  setEducationType(item.education_type);
                  setFieldOfStudy(item.field_of_study ?? "");
                  setCredential(item.credential ?? "");
                  setVisibility(item.visibility);
                }}
              >
                {t("actions.edit")}
              </button>
            <button
              type="button"
              disabled={busy}
              className="text-xs text-red-200"
              onClick={() =>
                void run(async () => {
                  await deleteProfileEducation(item.id);
                  onChange(items.filter((row) => row.id !== item.id));
                  note(t("settings.recordRemoved"));
                })
              }
            >
              {t("settings.remove")}
            </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("settings.institution")}>
          <input
            className={inputClass}
            dir="auto"
            value={institution}
            disabled={busy}
            onChange={(event) => setInstitution(event.target.value)}
          />
        </Field>
        <Field label={t("settings.educationType")}>
          <select
            className={inputClass}
            value={educationType}
            disabled={busy}
            onChange={(event) =>
              setEducationType(event.target.value as ProfileEducationType)
            }
          >
            {PROFILE_EDUCATION_TYPES.map((item) => (
              <option key={item} value={item}>
                {t(`settings.educationType.${item}` as TranslationKey)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("settings.fieldOfStudy")}>
          <input
            className={inputClass}
            dir="auto"
            value={fieldOfStudy}
            disabled={busy}
            onChange={(event) => setFieldOfStudy(event.target.value)}
          />
        </Field>
        <Field label={t("settings.credential")}>
          <input
            className={inputClass}
            dir="auto"
            value={credential}
            disabled={busy}
            onChange={(event) => setCredential(event.target.value)}
          />
        </Field>
        <VisibilitySelect
          value={visibility}
          onChange={setVisibility}
          disabled={busy}
        />
      </div>
      <button
        type="button"
        disabled={busy}
        className="watch-focus-ring rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold"
        onClick={() =>
          void run(async () => {
            const draft = {
              institution,
              educationType,
              fieldOfStudy,
              credential,
              visibility,
              sortOrder: items.length,
            };
            if (editingId) {
              const updated = await updateProfileEducation(editingId, draft);
              onChange(
                items.map((row) => (row.id === updated.id ? updated : row))
              );
              setEditingId(null);
            } else {
              const created = await createProfileEducation(draft);
              onChange([...items, created]);
            }
            setInstitution("");
            setFieldOfStudy("");
            setCredential("");
            note(t("settings.recordSaved"));
          })
        }
      >
        {t("settings.add")}
      </button>
    </section>
  );
}

function WorkCard({
  items,
  busy,
  onChange,
  run,
  note,
}: {
  items: ProfileWorkRow[];
  busy: boolean;
  onChange: (rows: ProfileWorkRow[]) => void;
  run: (task: () => Promise<void>) => Promise<void>;
  note: (ok: string) => void;
}) {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [workKind, setWorkKind] = useState<ProfileWorkKind>("independent");
  const [isCurrent, setIsCurrent] = useState(true);
  const [visibility, setVisibility] = useState<ProfileVisibility>("public");

  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
      <h3 className="text-sm font-black tracking-tight text-white/80">
        {t("settings.workHeading")}
      </h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-bold" dir="auto">
                {item.title}
              </p>
              {item.organization ? (
                <p className="text-xs text-white/45" dir="auto">
                  {item.organization}
                </p>
              ) : null}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                className="text-xs text-white/70"
                onClick={() => {
                  setEditingId(item.id);
                  setTitle(item.title);
                  setOrganization(item.organization ?? "");
                  setWorkKind(item.work_kind);
                  setIsCurrent(item.is_current);
                  setVisibility(item.visibility);
                }}
              >
                {t("actions.edit")}
              </button>
            <button
              type="button"
              disabled={busy}
              className="text-xs text-red-200"
              onClick={() =>
                void run(async () => {
                  await deleteProfileWork(item.id);
                  onChange(items.filter((row) => row.id !== item.id));
                  note(t("settings.recordRemoved"));
                })
              }
            >
              {t("settings.remove")}
            </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("settings.profession")}>
          <input
            className={inputClass}
            dir="auto"
            value={title}
            disabled={busy}
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>
        <Field label={t("settings.organization")}>
          <input
            className={inputClass}
            dir="auto"
            value={organization}
            disabled={busy}
            onChange={(event) => setOrganization(event.target.value)}
          />
        </Field>
        <Field label={t("settings.workHeading")}>
          <select
            className={inputClass}
            value={workKind}
            disabled={busy}
            onChange={(event) =>
              setWorkKind(event.target.value as ProfileWorkKind)
            }
          >
            {PROFILE_WORK_KINDS.map((item) => (
              <option key={item} value={item}>
                {t(`settings.workKind.${item}` as TranslationKey)}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={isCurrent}
            disabled={busy}
            onChange={(event) => setIsCurrent(event.target.checked)}
          />
          {t("settings.currentlyActive")}
        </label>
        <VisibilitySelect
          value={visibility}
          onChange={setVisibility}
          disabled={busy}
        />
      </div>
      <button
        type="button"
        disabled={busy}
        className="watch-focus-ring rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold"
        onClick={() =>
          void run(async () => {
            const draft = {
              title,
              organization,
              workKind,
              isCurrent,
              visibility,
              sortOrder: items.length,
            };
            if (editingId) {
              const updated = await updateProfileWork(editingId, draft);
              onChange(
                items.map((row) => (row.id === updated.id ? updated : row))
              );
              setEditingId(null);
            } else {
              const created = await createProfileWork(draft);
              onChange([...items, created]);
            }
            setTitle("");
            setOrganization("");
            note(t("settings.recordSaved"));
          })
        }
      >
        {t("settings.add")}
      </button>
    </section>
  );
}

function TagsCard({
  items,
  busy,
  onChange,
  run,
  note,
}: {
  items: ProfileTagRow[];
  busy: boolean;
  onChange: (rows: ProfileTagRow[]) => void;
  run: (task: () => Promise<void>) => Promise<void>;
  note: (ok: string) => void;
}) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<ProfileTagKind>("interest");
  const [label, setLabel] = useState("");
  const [visibility, setVisibility] = useState<ProfileVisibility>("public");

  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
      <h3 className="text-sm font-black tracking-tight text-white/80">
        {t("settings.tagsHeading")}
      </h3>
      <ul className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <li
            key={item.id}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs"
          >
            <span dir="auto">{item.label}</span>
            <button
              type="button"
              disabled={busy || index === 0}
              className="text-white/50 disabled:opacity-30"
              onClick={() =>
                void run(async () => {
                  const prev = items[index - 1];
                  if (!prev) return;
                  const updated = await reorderProfileTag(item.id, prev.sort_order);
                  const neighbor = await reorderProfileTag(prev.id, item.sort_order);
                  onChange(
                    items.map((row) =>
                      row.id === updated.id
                        ? updated
                        : row.id === neighbor.id
                          ? neighbor
                          : row
                    )
                  );
                })
              }
            >
              {t("settings.moveUp")}
            </button>
            <button
              type="button"
              disabled={busy}
              className="text-red-200"
              onClick={() =>
                void run(async () => {
                  await deleteProfileTag(item.id);
                  onChange(items.filter((row) => row.id !== item.id));
                  note(t("settings.recordRemoved"));
                })
              }
            >
              {t("settings.remove")}
            </button>
          </li>
        ))}
      </ul>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t("settings.tagsHeading")}>
          <select
            className={inputClass}
            value={kind}
            disabled={busy}
            onChange={(event) => setKind(event.target.value as ProfileTagKind)}
          >
            {PROFILE_TAG_KINDS.map((item) => (
              <option key={item} value={item}>
                {t(`settings.tagKind.${item}` as TranslationKey)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("settings.tagLabel")}>
          <input
            className={inputClass}
            dir="auto"
            value={label}
            disabled={busy}
            onChange={(event) => setLabel(event.target.value)}
          />
        </Field>
        <VisibilitySelect
          value={visibility}
          onChange={setVisibility}
          disabled={busy}
        />
      </div>
      <button
        type="button"
        disabled={busy}
        className="watch-focus-ring rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold"
        onClick={() =>
          void run(async () => {
            const created = await createProfileTag({
              kind,
              label,
              visibility,
              sortOrder: items.length,
            });
            onChange([...items, created]);
            setLabel("");
            note(t("settings.recordSaved"));
          })
        }
      >
        {t("settings.add")}
      </button>
    </section>
  );
}

function MilestonesCard({
  items,
  busy,
  onChange,
  run,
  note,
}: {
  items: ProfileMilestoneRow[];
  busy: boolean;
  onChange: (rows: ProfileMilestoneRow[]) => void;
  run: (task: () => Promise<void>) => Promise<void>;
  note: (ok: string) => void;
}) {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [category, setCategory] =
    useState<ProfileMilestoneCategory>("achievement");
  const [title, setTitle] = useState("");
  const [occurredYear, setOccurredYear] = useState("");
  const [visibility, setVisibility] = useState<ProfileVisibility>("public");

  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
      <h3 className="text-sm font-black tracking-tight text-white/80">
        {t("settings.milestonesHeading")}
      </h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-bold" dir="auto">
                {item.title}
              </p>
              <p className="text-xs text-white/45">
                {t(`settings.milestoneCategory.${item.category}` as TranslationKey)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                className="text-xs text-white/70"
                onClick={() => {
                  setEditingId(item.id);
                  setCategory(item.category);
                  setTitle(item.title);
                  setOccurredYear(item.occurred_year ? String(item.occurred_year) : "");
                  setVisibility(item.visibility);
                }}
              >
                {t("actions.edit")}
              </button>
            <button
              type="button"
              disabled={busy}
              className="text-xs text-red-200"
              onClick={() =>
                void run(async () => {
                  await deleteProfileMilestone(item.id);
                  onChange(items.filter((row) => row.id !== item.id));
                  note(t("settings.recordRemoved"));
                })
              }
            >
              {t("settings.remove")}
            </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("settings.milestoneTitle")}>
          <input
            className={inputClass}
            dir="auto"
            value={title}
            disabled={busy}
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>
        <Field label={t("settings.milestonesHeading")}>
          <select
            className={inputClass}
            value={category}
            disabled={busy}
            onChange={(event) =>
              setCategory(event.target.value as ProfileMilestoneCategory)
            }
          >
            {PROFILE_MILESTONE_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {t(`settings.milestoneCategory.${item}` as TranslationKey)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("settings.occurredYear")}>
          <input
            className={inputClass}
            inputMode="numeric"
            value={occurredYear}
            disabled={busy}
            onChange={(event) => setOccurredYear(event.target.value)}
          />
        </Field>
        <VisibilitySelect
          value={visibility}
          onChange={setVisibility}
          disabled={busy}
        />
      </div>
      <button
        type="button"
        disabled={busy}
        className="watch-focus-ring rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold"
        onClick={() =>
          void run(async () => {
            const draft = {
              category,
              title,
              occurredYear,
              visibility,
              sortOrder: items.length,
            };
            if (editingId) {
              const updated = await updateProfileMilestone(editingId, draft);
              onChange(
                items.map((row) => (row.id === updated.id ? updated : row))
              );
              setEditingId(null);
            } else {
              const created = await createProfileMilestone(draft);
              onChange([...items, created]);
            }
            setTitle("");
            setOccurredYear("");
            note(t("settings.recordSaved"));
          })
        }
      >
        {t("settings.add")}
      </button>
    </section>
  );
}

function LinksCard({
  items,
  busy,
  onChange,
  run,
  note,
}: {
  items: ProfileLinkRow[];
  busy: boolean;
  onChange: (rows: ProfileLinkRow[]) => void;
  run: (task: () => Promise<void>) => Promise<void>;
  note: (ok: string) => void;
}) {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [visibility, setVisibility] = useState<ProfileVisibility>("public");

  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
      <h3 className="text-sm font-black tracking-tight text-white/80">
        {t("settings.linksHeading")}
      </h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2"
          >
            <p className="min-w-0 truncate text-sm font-bold" dir="auto">
              {item.label}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                className="text-xs text-white/70"
                onClick={() => {
                  setEditingId(item.id);
                  setLabel(item.label);
                  setUrl(item.url);
                  setVisibility(item.visibility);
                }}
              >
                {t("actions.edit")}
              </button>
            <button
              type="button"
              disabled={busy}
              className="text-xs text-red-200"
              onClick={() =>
                void run(async () => {
                  await deleteProfileLink(item.id);
                  onChange(items.filter((row) => row.id !== item.id));
                  note(t("settings.recordRemoved"));
                })
              }
            >
              {t("settings.remove")}
            </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("settings.linkLabel")}>
          <input
            className={inputClass}
            dir="auto"
            value={label}
            disabled={busy}
            onChange={(event) => setLabel(event.target.value)}
          />
        </Field>
        <Field label={t("settings.linkUrl")}>
          <input
            className={inputClass}
            dir="ltr"
            value={url}
            disabled={busy}
            placeholder="https://"
            onChange={(event) => setUrl(event.target.value)}
          />
        </Field>
        <VisibilitySelect
          value={visibility}
          onChange={setVisibility}
          disabled={busy}
        />
      </div>
      <button
        type="button"
        disabled={busy}
        className="watch-focus-ring rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold"
        onClick={() =>
          void run(async () => {
            const draft = {
              label,
              url,
              visibility,
              sortOrder: items.length,
            };
            if (editingId) {
              const updated = await updateProfileLink(editingId, draft);
              onChange(
                items.map((row) => (row.id === updated.id ? updated : row))
              );
              setEditingId(null);
            } else {
              const created = await createProfileLink(draft);
              onChange([...items, created]);
            }
            setLabel("");
            setUrl("");
            note(t("settings.recordSaved"));
          })
        }
      >
        {t("settings.add")}
      </button>
    </section>
  );
}
