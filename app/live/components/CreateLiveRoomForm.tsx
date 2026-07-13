"use client";

import { useState, type FormEvent } from "react";
import type { LiveRoomVisibility } from "../types";

type CreateLiveRoomFormProps = {
  onCreate: (input: {
    title: string;
    visibility: LiveRoomVisibility;
    category: string;
    city: string;
    country: string;
  }) => Promise<void>;
  busy?: boolean;
};

export default function CreateLiveRoomForm({
  onCreate,
  busy = false,
}: CreateLiveRoomFormProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Travel");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [visibility, setVisibility] =
    useState<LiveRoomVisibility>("public");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Add a title for your live room.");
      return;
    }

    try {
      await onCreate({
        title: trimmed,
        visibility,
        category: category.trim() || "Live",
        city: city.trim(),
        country: country.trim(),
      });
      setTitle("");
      setCity("");
      setCountry("");
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create live room."
      );
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-white px-4 py-2 text-xs font-black text-black transition hover:bg-white/90"
      >
        Go live
      </button>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      className="w-full max-w-md space-y-3 rounded-[24px] border border-white/10 bg-[#080816]/90 p-4 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-black text-white">Create live room</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs font-bold text-white/45 hover:text-white"
        >
          Cancel
        </button>
      </div>

      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Room title"
        maxLength={120}
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/25"
      />

      <div className="grid grid-cols-2 gap-2">
        <input
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          placeholder="Category"
          className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/25"
        />
        <select
          value={visibility}
          onChange={(event) =>
            setVisibility(event.target.value as LiveRoomVisibility)
          }
          className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none"
        >
          <option value="public" className="bg-[#0b0b18]">
            Public
          </option>
          <option value="private" className="bg-[#0b0b18]">
            Private
          </option>
          <option value="group" className="bg-[#0b0b18]">
            Group
          </option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input
          value={city}
          onChange={(event) => setCity(event.target.value)}
          placeholder="City"
          className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/25"
        />
        <input
          value={country}
          onChange={(event) => setCountry(event.target.value)}
          placeholder="Country"
          className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/25"
        />
      </div>

      {error ? <p className="text-xs text-red-300">{error}</p> : null}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-2xl bg-red-500 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-400 disabled:opacity-50"
      >
        {busy ? "Starting…" : "Start live room"}
      </button>
    </form>
  );
}
