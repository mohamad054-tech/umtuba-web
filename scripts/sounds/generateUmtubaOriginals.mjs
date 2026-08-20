#!/usr/bin/env node
/**
 * Generate UMTUBA-owned original short clips (no third-party samples).
 * Synthetic oscillators / filtered noise only. LICENSE = UMTUBA_OWNED_ORIGINAL.
 *
 * Usage:
 *   node scripts/sounds/generateUmtubaOriginals.mjs
 *   node scripts/sounds/generateUmtubaOriginals.mjs --phase=1
 *   node scripts/sounds/generateUmtubaOriginals.mjs --ffmpeg=D:/tools/ffmpeg/ffmpeg.exe
 *
 * Writes gitignored audio under tmp-sound-catalog-v1/ and a provenance registry.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  copyFileSync,
  readdirSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { titleForSlug } from "./uniqueTitles.v1.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT_DIR = join(ROOT, "tmp-sound-catalog-v1");
const REGISTRY_MD = join(ROOT, "docs/sounds/UMTUBA_SOUND_LIBRARY_V1_PROVENANCE.md");
const MANIFEST_JSON = join(ROOT, "scripts/sounds/catalog.v1.json");
const GENERATED_AT = "2026-08-20";
const LICENSE_TYPE = "UMTUBA_OWNED_ORIGINAL";
const CONFIRMATION =
  "UMTUBA_OWNED_ORIGINAL synthetic clip generated 2026-08-20 on WIN-MJRKAKK2MEH. No third-party samples. Commercial use and UGC sync on UMTUBA are permitted. Attribution not required.";

const PHASES = {
  1: [0, 20],
  2: [20, 50],
  3: [50, 100],
  all: [0, 100],
};

function argValue(name, fallback = "") {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function uuidFromSlug(slug) {
  const hex = createHash("sha1").update(`umtuba-sound-v1:${slug}`).digest("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `5${hex.slice(13, 16)}`,
    `8${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join("-");
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function buildCatalog() {
  /** @type {{slug:string,title:string,category:string,prefix:string,kind:string,durationMs:number,seed:number,phase:1|2|3}[]} */
  const rows = [];
  const add = (category, prefix, kind, durationMs, count, startPhase) => {
    for (let i = 1; i <= count; i += 1) {
      const idx = rows.length;
      const phase = idx < 20 ? 1 : idx < 50 ? 2 : 3;
      const num = pad2(i);
      const slug = `umtuba-${prefix}-${num}`;
      rows.push({
        slug,
        title: titleForSlug(slug),
        category,
        prefix,
        kind,
        durationMs,
        seed: 1000 + idx * 17 + i * 3,
        phase: startPhase ?? phase,
      });
    }
  };

  // PHASE-balanced: first 20 cover many categories, then fill to 100.
  add("UMTUBA Originals", "originals", "motif", 6000, 8);
  add("Beats", "beats", "beat", 8000, 8);
  add("Cinematic", "cinematic", "cinematic", 7000, 8);
  add("Ambient", "ambient", "ambient", 8000, 8);
  add("Transitions", "transitions", "transition", 1600, 7);
  add("Whoosh", "whoosh", "whoosh", 900, 7);
  add("Hits/Impacts", "hits", "hit", 700, 7);
  add("UI/Clicks", "ui", "click", 400, 6);
  add("Funny", "funny", "funny", 1800, 6);
  add("Nature", "nature", "nature", 7000, 6);
  add("Technology", "technology", "tech", 1500, 6);
  add("Sports", "sports", "sports", 2000, 6);
  add("Celebration", "celebration", "celebration", 2500, 6);
  add("Calm", "calm", "calm", 8000, 6);
  add("Short Loops", "loops", "loop", 4000, 5);

  if (rows.length !== 100) {
    throw new Error(`Catalog must be 100 rows, got ${rows.length}`);
  }
  return rows.map((row, index) => ({
    ...row,
    id: uuidFromSlug(row.slug),
    index: index + 1,
    phase: index < 20 ? 1 : index < 50 ? 2 : 3,
    storagePath: `sounds/${row.prefix}/${row.slug}.m4a`,
    fallbackStoragePath: `sounds/${row.prefix}/${row.slug}.wav`,
    licenseType: LICENSE_TYPE,
    commercialUseAllowed: true,
    ugcSyncAllowed: true,
    attributionRequired: false,
    rightsOwner: "UMTUBA",
    source: "synthetic_generated_on_host",
    licenseEvidenceLocation: "docs/sounds/UMTUBA_SOUND_LIBRARY_V1_PROVENANCE.md",
    takedownStatus: "active",
    disablePath: "rights_status=blocked|takedown via block_social_sound_reuse",
  }));
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lowpass(samples, cutoff, sampleRate) {
  const rc = 1 / (2 * Math.PI * cutoff);
  const dt = 1 / sampleRate;
  const a = dt / (rc + dt);
  const out = new Float64Array(samples.length);
  let prev = 0;
  for (let i = 0; i < samples.length; i += 1) {
    prev += a * (samples[i] - prev);
    out[i] = prev;
  }
  return out;
}

function highpass(samples, cutoff, sampleRate) {
  const rc = 1 / (2 * Math.PI * cutoff);
  const dt = 1 / sampleRate;
  const a = rc / (rc + dt);
  const out = new Float64Array(samples.length);
  let prevY = 0;
  let prevX = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const x = samples[i];
    const y = a * (prevY + x - prevX);
    out[i] = y;
    prevY = y;
    prevX = x;
  }
  return out;
}

function applyFade(samples, sampleRate, attackMs, releaseMs) {
  const attack = Math.max(1, Math.round((attackMs / 1000) * sampleRate));
  const release = Math.max(1, Math.round((releaseMs / 1000) * sampleRate));
  for (let i = 0; i < samples.length; i += 1) {
    let env = 1;
    if (i < attack) env *= i / attack;
    if (i > samples.length - release) {
      env *= (samples.length - 1 - i) / release;
    }
    samples[i] *= env;
  }
}

function normalize(samples, peakDb = -1.5) {
  let peak = 0;
  for (const s of samples) peak = Math.max(peak, Math.abs(s));
  if (peak < 1e-9) return samples;
  const target = 10 ** (peakDb / 20);
  const g = target / peak;
  for (let i = 0; i < samples.length; i += 1) {
    samples[i] = clamp(samples[i] * g, -0.98, 0.98);
  }
  return samples;
}

function measureLevels(samples) {
  let peak = 0;
  let sumSq = 0;
  for (const s of samples) {
    peak = Math.max(peak, Math.abs(s));
    sumSq += s * s;
  }
  const rms = Math.sqrt(sumSq / Math.max(1, samples.length));
  const win = Math.min(samples.length, 2205);
  let windowRms = 0;
  const hop = Math.max(1, Math.floor(win / 2));
  for (let i = 0; i < samples.length; i += hop) {
    let acc = 0;
    const end = Math.min(samples.length, i + win);
    for (let j = i; j < end; j += 1) acc += samples[j] * samples[j];
    windowRms = Math.max(windowRms, Math.sqrt(acc / Math.max(1, end - i)));
  }
  return { peak, rms, windowRms };
}

function render(kind, durationMs, seed, sampleRate) {
  const n = Math.round((durationMs / 1000) * sampleRate);
  const samples = new Float64Array(n);
  const rnd = mulberry32(seed);
  const tAt = (i) => i / sampleRate;
  const variant = seed % 7;

  const writeSine = (freq, amp, start, end, decay = 0) => {
    const a0 = Math.max(0, Math.round(start * sampleRate));
    const a1 = Math.min(n, Math.round(end * sampleRate));
    for (let i = a0; i < a1; i += 1) {
      const local = (i - a0) / sampleRate;
      const env = decay > 0 ? Math.exp(-local * decay) : 1;
      samples[i] += Math.sin(2 * Math.PI * freq * tAt(i)) * amp * env;
    }
  };

  const writeNoise = (amp, start, end, decay = 0) => {
    const a0 = Math.max(0, Math.round(start * sampleRate));
    const a1 = Math.min(n, Math.round(end * sampleRate));
    for (let i = a0; i < a1; i += 1) {
      const local = (i - a0) / sampleRate;
      const env = decay > 0 ? Math.exp(-local * decay) : 1;
      samples[i] += (rnd() * 2 - 1) * amp * env;
    }
  };

  switch (kind) {
    case "click": {
      const f = 1800 + variant * 220;
      writeSine(f, 0.7, 0, 0.04, 90);
      writeSine(f * 2.2, 0.25, 0, 0.02, 140);
      writeNoise(0.15, 0, 0.012, 220);
      applyFade(samples, sampleRate, 2, 40);
      break;
    }
    case "whoosh": {
      writeNoise(0.9, 0, durationMs / 1000, 0);
      const swept = highpass(samples, 400 + variant * 80, sampleRate);
      const shaped = lowpass(swept, 1800 + variant * 200, sampleRate);
      for (let i = 0; i < n; i += 1) {
        const x = i / (n - 1);
        const env = Math.sin(Math.PI * x) ** 1.4;
        samples[i] = shaped[i] * env;
      }
      applyFade(samples, sampleRate, 20, 40);
      break;
    }
    case "hit": {
      writeSine(70 + variant * 8, 0.95, 0, 0.35, 14);
      writeSine(140 + variant * 10, 0.4, 0, 0.18, 22);
      writeNoise(0.7, 0, 0.08, 40);
      const body = lowpass(samples, 900, sampleRate);
      samples.set(body);
      applyFade(samples, sampleRate, 2, 80);
      break;
    }
    case "beat": {
      const bpm = 96 + variant * 4;
      const step = 60 / bpm / 2;
      const bars = durationMs / 1000;
      for (let t = 0; t < bars; t += step) {
        const beat = Math.round(t / step) % 8;
        if (beat % 2 === 0) {
          writeSine(72 + (beat === 0 ? 8 : 0), 0.95, t, t + 0.2, 12);
          writeSine(144, 0.35, t, t + 0.12, 18);
          writeNoise(0.4, t, t + 0.04, 60);
        }
        if (beat === 2 || beat === 6) {
          writeSine(220, 0.35, t, t + 0.1, 22);
          writeNoise(0.28, t, t + 0.05, 50);
        }
        writeSine(1800 + variant * 80, 0.12, t, t + 0.03, 80);
        writeSine(6500 + variant * 200, 0.08, t, t + 0.015, 160);
      }
      const mixed = lowpass(samples, 5200, sampleRate);
      samples.set(mixed);
      applyFade(samples, sampleRate, 8, 60);
      break;
    }
    case "cinematic": {
      writeSine(55 + variant, 0.45, 0, durationMs / 1000, 0.05);
      writeSine(110 + variant * 0.5, 0.38, 0.2, durationMs / 1000, 0.04);
      writeSine(220, 0.28, 0.5, durationMs / 1000, 0.06);
      writeSine(330 + variant * 2, 0.18, 1.0, durationMs / 1000, 0.08);
      writeSine(440, 0.1, 1.6, durationMs / 1000, 0.1);
      writeNoise(0.08, 0, durationMs / 1000, 0);
      const pad = lowpass(samples, 2400, sampleRate);
      for (let i = 0; i < n; i += 1) {
        const x = i / (n - 1);
        const swell = 0.35 + 0.65 * Math.sin(Math.PI * x);
        samples[i] = pad[i] * swell;
      }
      applyFade(samples, sampleRate, 140, 200);
      break;
    }
    case "ambient": {
      const base = 196 + variant * 7;
      writeSine(base, 0.42, 0, durationMs / 1000);
      writeSine(base * 1.5, 0.28, 0, durationMs / 1000);
      writeSine(base * 2, 0.16, 0, durationMs / 1000);
      writeSine(base * 2.5, 0.08, 0, durationMs / 1000);
      writeNoise(0.05, 0, durationMs / 1000);
      samples.set(lowpass(samples, 2800, sampleRate));
      applyFade(samples, sampleRate, 180, 220);
      break;
    }
    case "transition": {
      const up = variant % 2 === 0;
      writeNoise(0.7, 0, durationMs / 1000);
      const filtered = lowpass(highpass(samples, 200, sampleRate), 3200, sampleRate);
      for (let i = 0; i < n; i += 1) {
        const x = i / (n - 1);
        const env = up ? x ** 1.6 : (1 - x) ** 1.4;
        const tone = Math.sin(2 * Math.PI * (220 + (up ? 700 : -160) * x) * tAt(i));
        samples[i] = filtered[i] * 0.55 * env + tone * 0.22 * env;
      }
      applyFade(samples, sampleRate, 15, 30);
      break;
    }
    case "funny": {
      for (let i = 0; i < n; i += 1) {
        const t = tAt(i);
        const wobble = 380 + 220 * Math.sin(2 * Math.PI * (3 + variant) * t);
        samples[i] =
          0.62 * Math.sin(2 * Math.PI * wobble * t) +
          0.22 * Math.sin(2 * Math.PI * wobble * 1.5 * t);
      }
      applyFade(samples, sampleRate, 12, 60);
      break;
    }
    case "nature": {
      writeNoise(0.95, 0, durationMs / 1000);
      const wind = lowpass(samples, 1400 + variant * 80, sampleRate);
      for (let i = 0; i < n; i += 1) {
        const t = tAt(i);
        const drip =
          Math.sin(2 * Math.PI * (0.55 + variant * 0.08) * t) > 0.82
            ? 0.35 * Math.sin(2 * Math.PI * (1400 + variant * 90) * t) *
              Math.exp(-((t * 7) % 1) * 10)
            : 0;
        const birds =
          0.08 * Math.sin(2 * Math.PI * (880 + variant * 40) * t) *
          (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.35 * t));
        samples[i] =
          wind[i] * (0.7 + 0.25 * Math.sin(2 * Math.PI * 0.14 * t)) + drip + birds;
      }
      applyFade(samples, sampleRate, 160, 200);
      break;
    }
    case "tech": {
      const hops = [440, 660, 880, 1320];
      const hop = hops[variant % hops.length];
      writeSine(hop, 0.7, 0, 0.16, 14);
      writeSine(hop * 1.5, 0.35, 0.14, 0.3, 14);
      writeSine(hop * 0.75, 0.4, 0.28, 0.62, 10);
      writeNoise(0.12, 0, 0.05, 50);
      applyFade(samples, sampleRate, 3, 30);
      break;
    }
    case "sports": {
      writeSine(1760 + variant * 40, 0.7, 0.04, 0.7, 1.8);
      writeSine(1980 + variant * 30, 0.35, 0.04, 0.7, 1.8);
      writeNoise(0.35, 0.55, durationMs / 1000, 1.2);
      samples.set(lowpass(samples, 4500, sampleRate));
      applyFade(samples, sampleRate, 8, 60);
      break;
    }
    case "celebration": {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const start = 0.08 * i;
        writeSine(freq, 0.48, start, start + 0.8, 2.6);
        writeSine(freq * 2, 0.16, start, start + 0.4, 5);
      });
      applyFade(samples, sampleRate, 10, 90);
      break;
    }
    case "calm": {
      const base = 220 + variant * 6;
      writeSine(base, 0.4, 0, durationMs / 1000);
      writeSine(base * 1.25, 0.26, 0, durationMs / 1000);
      writeSine(base * 1.5, 0.16, 0, durationMs / 1000);
      writeSine(base * 2, 0.08, 0, durationMs / 1000);
      writeNoise(0.03, 0, durationMs / 1000);
      samples.set(lowpass(samples, 2600, sampleRate));
      applyFade(samples, sampleRate, 220, 260);
      break;
    }
    case "loop": {
      const bpm = 100;
      const step = 60 / bpm;
      for (let t = 0; t < durationMs / 1000; t += step) {
        writeSine(110, 0.45, t, t + 0.22, 8);
        writeSine(220, 0.22, t + step * 0.5, t + step * 0.5 + 0.14, 12);
        writeSine(440 + variant * 8, 0.14, t + step * 0.75, t + step * 0.75 + 0.08, 22);
      }
      // Cross-match ends for a short loop.
      applyFade(samples, sampleRate, 8, 8);
      const fade = Math.round(0.01 * sampleRate);
      for (let i = 0; i < fade; i += 1) {
        const w = i / fade;
        const a = samples[i];
        const b = samples[n - fade + i];
        samples[i] = a * w + b * (1 - w);
        samples[n - fade + i] = b * (1 - w) + a * w;
      }
      break;
    }
    case "motif": {
      const scale = [261.63, 293.66, 329.63, 392.0, 440.0];
      const pattern = [0, 2, 4, 2, 3, 1, 0, 4].map((x) => (x + variant) % scale.length);
      const noteDur = 0.28;
      pattern.forEach((idx, i) => {
        const start = 0.2 + i * noteDur;
        writeSine(scale[idx], 0.55, start, start + 0.46, 2.6);
        writeSine(scale[idx] * 2, 0.12, start, start + 0.3, 5);
        writeSine(scale[idx] / 2, 0.22, start, start + 0.52, 1.8);
      });
      writeSine(98 + variant, 0.22, 0, durationMs / 1000, 0.06);
      samples.set(lowpass(samples, 4200, sampleRate));
      applyFade(samples, sampleRate, 40, 120);
      break;
    }
    default:
      writeSine(220, 0.3, 0, durationMs / 1000, 1);
      applyFade(samples, sampleRate, 20, 40);
  }

  return normalize(samples, -1.0);
}

function encodeWav(samples, sampleRate) {
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i += 1) {
    const s = clamp(samples[i], -1, 1);
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  return buf;
}

function findFfmpeg(explicit) {
  if (explicit && existsSync(explicit)) return explicit;
  const toolsRoot = join("D:", "umtuba-central", "tools", "ffmpeg");
  const candidates = [
    join(toolsRoot, "ffmpeg.exe"),
    join(toolsRoot, "bin", "ffmpeg.exe"),
    "ffmpeg",
  ];
  if (existsSync(toolsRoot)) {
    for (const entry of readdirSync(toolsRoot, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        candidates.push(join(toolsRoot, entry.name, "bin", "ffmpeg.exe"));
        candidates.push(join(toolsRoot, entry.name, "ffmpeg.exe"));
      }
    }
  }
  for (const c of candidates) {
    try {
      if (c !== "ffmpeg" && !existsSync(c)) continue;
      execFileSync(c, ["-version"], { stdio: "ignore" });
      return c;
    } catch {
      // try next
    }
  }
  return "";
}

function writeRegistry(rows, codec) {
  const lines = [
    "# UMTUBA Sound Library V1 — provenance registry",
    "",
    "All rows are **UMTUBA-owned original** synthetic clips generated on WIN-MJRKAKK2MEH.",
    "No TikTok / YouTube / Spotify / Instagram / Apple Music / third-party scrapes.",
    "No commercial-song impersonation. Titles are unique human-readable names.",
    "",
    "- LICENSE_TYPE = UMTUBA_OWNED_ORIGINAL",
    "- COMMERCIAL_USE_ALLOWED = YES",
    "- UGC_SYNC_ALLOWED = YES",
    "- ATTRIBUTION_REQUIRED = NO",
    "- UNKNOWN_LICENSE = 0 (do not publish unknown)",
    "- Disable without app update: `block_social_sound_reuse(id)` or `rights_status` blocked/takedown",
    `- Generated = ${GENERATED_AT}`,
    `- Codec = ${codec}`,
    `- Count = ${rows.length}`,
    "",
    "| # | id | title | category | duration_ms | storage_path | license | evidence | takedown |",
    "| --- | --- | --- | --- | ---: | --- | --- | --- | --- |",
  ];
  for (const row of rows) {
    lines.push(
      `| ${row.index} | \`${row.id}\` | ${row.title} | ${row.category} | ${row.durationMs} | \`${row.storagePath}\` | ${LICENSE_TYPE} | this registry + generator script | active |`
    );
  }
  lines.push(
    "",
    "## Per-file provenance",
    "",
    "- rights owner: UMTUBA",
    "- source: original synthesis (sine / filtered noise / envelopes) in `scripts/sounds/generateUmtubaOriginals.mjs`",
    "- license: UMTUBA_OWNED_ORIGINAL; platform_licensed catalog rows",
    `- date: ${GENERATED_AT}`,
    "- proof: generator script + this registry + local `tmp-sound-catalog-v1/*.json` manifest sidecar",
    "- third-party samples: none",
    ""
  );
  mkdirSync(dirname(REGISTRY_MD), { recursive: true });
  writeFileSync(REGISTRY_MD, `${lines.join("\n")}\n`, "utf8");
}

function main() {
  const phaseKey = argValue("phase", "all");
  const range = PHASES[phaseKey];
  if (!range) throw new Error("Use --phase=1|2|3|all");
  const catalog = buildCatalog();
  const selected = catalog.slice(range[0], range[1]);
  const ffmpeg = findFfmpeg(argValue("ffmpeg"));
  const codec = ffmpeg ? "aac_m4a" : "wav";
  mkdirSync(OUT_DIR, { recursive: true });

  const published = [];
  for (const row of selected) {
    const sr = 44100;
    const samples = render(row.kind, row.durationMs, row.seed, sr);
    const levels = measureLevels(samples);
    if (levels.peak < 0.25 || (levels.rms < 0.03 && levels.windowRms < 0.12)) {
      throw new Error(
        `Generated ${row.slug} is too quiet (peak=${levels.peak.toFixed(3)} rms=${levels.rms.toFixed(3)} win=${levels.windowRms.toFixed(3)})`
      );
    }
    const wavPath = join(OUT_DIR, `${row.slug}.wav`);
    writeFileSync(wavPath, encodeWav(samples, sr));
    let finalPath = wavPath;
    let storagePath = row.fallbackStoragePath;
    if (ffmpeg) {
      const m4aPath = join(OUT_DIR, `${row.slug}.m4a`);
      execFileSync(
        ffmpeg,
        [
          "-y",
          "-i",
          wavPath,
          "-af",
          "loudnorm=I=-16:TP=-1.5:LRA=11,alimiter=limit=0.89:level=disabled",
          "-c:a",
          "aac",
          "-b:a",
          "192k",
          "-ac",
          "1",
          "-ar",
          "44100",
          "-movflags",
          "+faststart",
          m4aPath,
        ],
        { stdio: "ignore" }
      );
      finalPath = m4aPath;
      storagePath = row.storagePath;
    }
    published.push({
      ...row,
      storagePath,
      localPath: finalPath.replace(/\\/g, "/"),
      sampleRate: sr,
      codec,
    });
  }

  const leanAssets = catalog.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    prefix: row.prefix,
    durationMs: row.durationMs,
    phase: row.phase,
    storagePath: codec === "aac_m4a" ? row.storagePath : row.fallbackStoragePath,
    licenseType: LICENSE_TYPE,
    commercialUseAllowed: true,
    ugcSyncAllowed: true,
    attributionRequired: false,
    rightsOwner: "UMTUBA",
    source: "synthetic_generated_on_host",
  }));
  writeFileSync(
    MANIFEST_JSON,
    `${JSON.stringify(
      {
        version: 1,
        generatedAt: GENERATED_AT,
        licenseType: LICENSE_TYPE,
        confirmation: CONFIRMATION,
        codec,
        count: leanAssets.length,
        assets: leanAssets,
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  writeFileSync(
    join(OUT_DIR, "generated.local.json"),
    `${JSON.stringify({ phase: phaseKey, assets: published }, null, 2)}\n`,
    "utf8"
  );
  writeRegistry(
    catalog.map((row) => ({
      ...row,
      storagePath: codec === "aac_m4a" ? row.storagePath : row.fallbackStoragePath,
    })),
    codec
  );
  copyFileSync(MANIFEST_JSON, join(OUT_DIR, "catalog.v1.json"));
  console.log(
    JSON.stringify(
      {
        STATUS: "GENERATED",
        PHASE: phaseKey,
        ASSETS_PREPARED: published.length,
        CODEC: codec,
        FFMPEG: ffmpeg ? "YES" : "NO",
        OUT_DIR,
        MANIFEST: MANIFEST_JSON,
        REGISTRY: REGISTRY_MD,
      },
      null,
      2
    )
  );
}

main();
