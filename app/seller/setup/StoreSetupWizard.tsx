"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  saveStoreSetupDraftAction,
  submitStoreSetupAction,
} from "../../actions/storeSellerSetup";
import { APP_ROUTES } from "../../lib/nav";
import {
  STORE_SETUP_STEPS,
  STORE_TEMPLATE_META,
  STORE_TEMPLATES,
  applicationToSetupValues,
  buildStoreSetupChecklist,
  isStoreSetupComplete,
  type StoreSetupValues,
  type StoreTemplate,
} from "../../../lib/store/sellerSetup";
import type { SellerApplicationRow } from "../../../lib/store/sellerApplications";
import { slugify } from "../../../lib/store/validators";

type Props = {
  application: SellerApplicationRow | null;
  initialStep: number;
  flashError?: string;
  flashSaved?: boolean;
};

type FormState = {
  storeName: string;
  slug: string;
  tagline: string;
  description: string;
  countryCode: string;
  city: string;
  defaultCurrency: string;
  storeTemplate: StoreTemplate | "";
  publicContactEmail: string;
  publicContactPhone: string;
  publicContactUrl: string;
  returnPolicy: string;
  shippingPolicy: string;
  privacyPolicy: string;
};

function toFormState(application: SellerApplicationRow | null): FormState {
  const v = applicationToSetupValues(application);
  return {
    storeName: v.storeName ?? "",
    slug: v.slug ?? "",
    tagline: v.tagline ?? "",
    description: v.description ?? "",
    countryCode: v.countryCode ?? "",
    city: v.city ?? "",
    defaultCurrency: v.defaultCurrency ?? "USD",
    storeTemplate: (v.storeTemplate as StoreTemplate | null) ?? "",
    publicContactEmail: v.publicContactEmail ?? "",
    publicContactPhone: v.publicContactPhone ?? "",
    publicContactUrl: v.publicContactUrl ?? "",
    returnPolicy: v.returnPolicy ?? "",
    shippingPolicy: v.shippingPolicy ?? "",
    privacyPolicy: v.privacyPolicy ?? "",
  };
}

function toPartialValues(form: FormState): Partial<StoreSetupValues> {
  return {
    storeName: form.storeName,
    slug: form.slug,
    tagline: form.tagline || null,
    description: form.description || null,
    countryCode: form.countryCode || null,
    city: form.city || null,
    defaultCurrency: form.defaultCurrency || "USD",
    storeTemplate: form.storeTemplate || null,
    publicContactEmail: form.publicContactEmail || null,
    publicContactPhone: form.publicContactPhone || null,
    publicContactUrl: form.publicContactUrl || null,
    returnPolicy: form.returnPolicy || null,
    shippingPolicy: form.shippingPolicy || null,
    privacyPolicy: form.privacyPolicy || null,
  };
}

const fieldClass =
  "w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-sm outline-none focus-visible:border-blue-400/40 focus-visible:ring-2 focus-visible:ring-blue-400/30";
const labelClass =
  "text-xs font-bold uppercase tracking-[0.16em] text-white/45";

export default function StoreSetupWizard({
  application,
  initialStep,
  flashError,
  flashSaved,
}: Props) {
  const [step, setStep] = useState(() => {
    const fromApp = application?.wizard_step ?? initialStep;
    return Math.min(6, Math.max(1, initialStep || fromApp || 1));
  });
  const [form, setForm] = useState<FormState>(() => toFormState(application));
  const [slugTouched, setSlugTouched] = useState(Boolean(application?.proposed_store_slug));

  const checklist = useMemo(
    () => buildStoreSetupChecklist(toPartialValues(form)),
    [form]
  );
  const complete = useMemo(() => isStoreSetupComplete(toPartialValues(form)), [form]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "storeName" && !slugTouched) {
        next.slug = slugify(String(value));
      }
      return next;
    });
  }

  function goTo(next: number) {
    setStep(Math.min(6, Math.max(1, next)));
  }

  const hiddenFields = (
    <>
      <input type="hidden" name="storeName" value={form.storeName} />
      <input type="hidden" name="slug" value={form.slug} />
      <input type="hidden" name="tagline" value={form.tagline} />
      <input type="hidden" name="description" value={form.description} />
      <input type="hidden" name="countryCode" value={form.countryCode} />
      <input type="hidden" name="city" value={form.city} />
      <input type="hidden" name="defaultCurrency" value={form.defaultCurrency} />
      <input type="hidden" name="storeTemplate" value={form.storeTemplate} />
      <input
        type="hidden"
        name="publicContactEmail"
        value={form.publicContactEmail}
      />
      <input
        type="hidden"
        name="publicContactPhone"
        value={form.publicContactPhone}
      />
      <input
        type="hidden"
        name="publicContactUrl"
        value={form.publicContactUrl}
      />
      <input type="hidden" name="returnPolicy" value={form.returnPolicy} />
      <input type="hidden" name="shippingPolicy" value={form.shippingPolicy} />
      <input type="hidden" name="privacyPolicy" value={form.privacyPolicy} />
      <input type="hidden" name="wizardStep" value={String(step)} />
    </>
  );

  return (
    <div className="mt-6 space-y-5">
      <nav aria-label="Store setup steps">
        <ol className="flex flex-wrap gap-2">
          {STORE_SETUP_STEPS.map((item) => {
            const current = item.id === step;
            const done = checklist.find((c) => c.key === item.key)?.complete;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => goTo(item.id)}
                  aria-current={current ? "step" : undefined}
                  className={`watch-focus-ring rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                    current
                      ? "border-white/40 bg-white text-black"
                      : done
                        ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                        : "border-white/10 bg-white/[0.03] text-white/60 hover:text-white"
                  }`}
                >
                  <span className="sr-only">Step {item.id}: </span>
                  {item.label}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {flashError ? (
        <p
          role="alert"
          className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100"
        >
          {flashError}
        </p>
      ) : null}
      {flashSaved ? (
        <p
          role="status"
          className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
        >
          Draft saved. You can leave and resume this setup anytime.
        </p>
      ) : null}

      <section
        className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 backdrop-blur-xl md:p-7"
        aria-labelledby="setup-step-title"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
          Step {step} of {STORE_SETUP_STEPS.length}
        </p>
        <h1
          id="setup-step-title"
          className="mt-1 text-2xl font-black tracking-tight md:text-3xl"
        >
          {STORE_SETUP_STEPS[step - 1]?.label}
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Configure your storefront, save a draft anytime, then submit for
          operator approval. Checkout is not available in this phase.
        </p>

        <div className="mt-6 space-y-4">
          {step === 1 ? (
            <fieldset className="space-y-4">
              <legend className="sr-only">Store identity</legend>
              <label className="block space-y-2">
                <span className={labelClass}>Store name</span>
                <input
                  value={form.storeName}
                  onChange={(e) => update("storeName", e.target.value)}
                  required
                  minLength={2}
                  maxLength={80}
                  autoComplete="organization"
                  className={fieldClass}
                />
              </label>
              <label className="block space-y-2">
                <span className={labelClass}>Public slug</span>
                <input
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    update("slug", e.target.value.toLowerCase());
                  }}
                  placeholder="my-store"
                  pattern="[a-z0-9][a-z0-9-]{1,62}[a-z0-9]"
                  className={fieldClass}
                  aria-describedby="slug-help"
                />
                <span id="slug-help" className="block text-xs text-white/40">
                  Used in your public store URL: /store/{form.slug || "slug"}
                </span>
              </label>
            </fieldset>
          ) : null}

          {step === 2 ? (
            <fieldset className="space-y-4">
              <legend className="sr-only">Store information</legend>
              <label className="block space-y-2">
                <span className={labelClass}>Tagline</span>
                <input
                  value={form.tagline}
                  onChange={(e) => update("tagline", e.target.value)}
                  maxLength={160}
                  className={fieldClass}
                />
              </label>
              <label className="block space-y-2">
                <span className={labelClass}>Description</span>
                <textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  rows={5}
                  maxLength={2000}
                  className={fieldClass}
                  aria-describedby="desc-help"
                />
                <span id="desc-help" className="block text-xs text-white/40">
                  At least 20 characters required before submission.
                </span>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className={labelClass}>City</span>
                  <input
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    maxLength={80}
                    className={fieldClass}
                  />
                </label>
                <label className="block space-y-2">
                  <span className={labelClass}>Country code</span>
                  <input
                    value={form.countryCode}
                    onChange={(e) =>
                      update("countryCode", e.target.value.toUpperCase())
                    }
                    placeholder="US"
                    maxLength={2}
                    className={fieldClass}
                  />
                </label>
              </div>
              <label className="block space-y-2">
                <span className={labelClass}>Default currency</span>
                <input
                  value={form.defaultCurrency}
                  onChange={(e) =>
                    update("defaultCurrency", e.target.value.toUpperCase())
                  }
                  maxLength={3}
                  className={fieldClass}
                />
              </label>
            </fieldset>
          ) : null}

          {step === 3 ? (
            <fieldset>
              <legend className="sr-only">Store template</legend>
              <div
                className="grid gap-3 sm:grid-cols-2"
                role="radiogroup"
                aria-label="Store template"
              >
                {STORE_TEMPLATES.map((template) => {
                  const meta = STORE_TEMPLATE_META[template];
                  const selected = form.storeTemplate === template;
                  return (
                    <label
                      key={template}
                      className={`watch-focus-ring cursor-pointer rounded-2xl border p-4 transition ${
                        selected
                          ? "border-white/40 bg-white/[0.08]"
                          : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="templateChoice"
                        value={template}
                        checked={selected}
                        onChange={() => update("storeTemplate", template)}
                        className="sr-only"
                      />
                      <span className="block text-sm font-black text-white">
                        {meta.label}
                      </span>
                      <span className="mt-1 block text-xs text-white/50">
                        {meta.description}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ) : null}

          {step === 4 ? (
            <fieldset className="space-y-4">
              <legend className="sr-only">Contact information</legend>
              <label className="block space-y-2">
                <span className={labelClass}>Public contact email</span>
                <input
                  type="email"
                  value={form.publicContactEmail}
                  onChange={(e) => update("publicContactEmail", e.target.value)}
                  maxLength={160}
                  autoComplete="email"
                  className={fieldClass}
                />
              </label>
              <label className="block space-y-2">
                <span className={labelClass}>Public contact phone</span>
                <input
                  type="tel"
                  value={form.publicContactPhone}
                  onChange={(e) => update("publicContactPhone", e.target.value)}
                  maxLength={40}
                  autoComplete="tel"
                  className={fieldClass}
                />
              </label>
              <label className="block space-y-2">
                <span className={labelClass}>Public contact link</span>
                <input
                  type="url"
                  value={form.publicContactUrl}
                  onChange={(e) => update("publicContactUrl", e.target.value)}
                  maxLength={300}
                  placeholder="https://"
                  className={fieldClass}
                />
              </label>
              <p className="text-xs text-white/40">
                Email or phone is required before submission.
              </p>
            </fieldset>
          ) : null}

          {step === 5 ? (
            <fieldset className="space-y-4">
              <legend className="sr-only">Store policies</legend>
              <label className="block space-y-2">
                <span className={labelClass}>Return policy</span>
                <textarea
                  value={form.returnPolicy}
                  onChange={(e) => update("returnPolicy", e.target.value)}
                  rows={4}
                  maxLength={5000}
                  className={fieldClass}
                />
              </label>
              <label className="block space-y-2">
                <span className={labelClass}>Shipping policy</span>
                <textarea
                  value={form.shippingPolicy}
                  onChange={(e) => update("shippingPolicy", e.target.value)}
                  rows={4}
                  maxLength={5000}
                  className={fieldClass}
                />
              </label>
              <label className="block space-y-2">
                <span className={labelClass}>Privacy policy (optional)</span>
                <textarea
                  value={form.privacyPolicy}
                  onChange={(e) => update("privacyPolicy", e.target.value)}
                  rows={4}
                  maxLength={5000}
                  className={fieldClass}
                />
              </label>
            </fieldset>
          ) : null}

          {step === 6 ? (
            <div className="space-y-4">
              <h2 className="text-sm font-black uppercase tracking-[0.16em] text-white/50">
                Completion checklist
              </h2>
              <ul className="space-y-2" aria-label="Setup checklist">
                {checklist.map((item) => (
                  <li
                    key={item.key}
                    className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${
                        item.complete
                          ? "bg-emerald-400 text-black"
                          : "bg-white/10 text-white/50"
                      }`}
                    >
                      {item.complete ? "✓" : "·"}
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-white">
                        {item.label}
                        <span className="sr-only">
                          {item.complete ? " — complete" : " — incomplete"}
                        </span>
                      </span>
                      <span className="block text-xs text-white/45">
                        {item.detail}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <dl className="grid gap-2 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-white/40">Store</dt>
                  <dd className="font-bold">
                    {form.storeName || "—"}{" "}
                    <span className="text-white/40">
                      @{form.slug || "slug"}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-white/40">Template</dt>
                  <dd className="font-bold">
                    {form.storeTemplate
                      ? STORE_TEMPLATE_META[form.storeTemplate].label
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-white/40">Location</dt>
                  <dd className="font-bold">
                    {[form.city, form.countryCode].filter(Boolean).join(", ") ||
                      "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-white/40">Contact</dt>
                  <dd className="font-bold break-all">
                    {form.publicContactEmail ||
                      form.publicContactPhone ||
                      "—"}
                  </dd>
                </div>
              </dl>
              {!complete ? (
                <p role="status" className="text-sm text-amber-100/90">
                  Finish every checklist item before submitting for approval.
                </p>
              ) : (
                <p role="status" className="text-sm text-emerald-100/90">
                  Ready to submit. An operator will review your store setup.
                </p>
              )}
            </div>
          ) : null}
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => goTo(step - 1)}
              disabled={step <= 1}
              className="watch-focus-ring rounded-full border border-white/15 px-4 py-2.5 text-sm font-bold text-white/70 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Back
            </button>
            {step < 6 ? (
              <button
                type="button"
                onClick={() => goTo(step + 1)}
                className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-white"
              >
                Continue
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <form action={saveStoreSetupDraftAction}>
              {hiddenFields}
              <button
                type="submit"
                className="watch-focus-ring rounded-full border border-white/15 px-4 py-2.5 text-sm font-bold text-white/80"
              >
                Save draft
              </button>
            </form>
            {step === 6 ? (
              <form action={submitStoreSetupAction}>
                {hiddenFields}
                <button
                  type="submit"
                  disabled={!complete}
                  className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Submit for approval
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </section>

      <Link
        href={APP_ROUTES.seller}
        className="inline-block text-sm font-bold text-white/50 hover:text-white/80"
      >
        ← Back to seller
      </Link>
    </div>
  );
}
