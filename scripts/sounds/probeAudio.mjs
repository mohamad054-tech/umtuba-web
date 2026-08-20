#!/usr/bin/env node
/**
 * Probe AAC/M4A files with ffprobe/ffmpeg. Never prints signed URLs or keys.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function argValue(name, fallback = "") {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

function findBinary(name) {
  const toolsRoot = join("D:", "umtuba-central", "tools", "ffmpeg");
  const candidates = [
    join(toolsRoot, `${name}.exe`),
    join(toolsRoot, "bin", `${name}.exe`),
    name,
  ];
  if (existsSync(toolsRoot)) {
    for (const entry of readdirSync(toolsRoot, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        candidates.push(join(toolsRoot, entry.name, "bin", `${name}.exe`));
      }
    }
  }
  for (const c of candidates) {
    try {
      if (c !== name && !existsSync(c)) continue;
      execFileSync(c, ["-version"], { stdio: "ignore" });
      return c;
    } catch {
      // next
    }
  }
  return "";
}

function walkAudio(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkAudio(full, acc);
    else if (/\.(m4a|aac|wav|mp3)$/i.test(entry.name) && !entry.name.includes("upload")) {
      acc.push(full);
    }
  }
  return acc;
}

function probeFile(ffprobe, ffmpeg, filePath) {
  const info = JSON.parse(
    execFileSync(
      ffprobe,
      [
        "-v",
        "error",
        "-select_streams",
        "a:0",
        "-show_entries",
        "stream=codec_name,codec_type,duration,sample_rate,channels:format=duration,size,bit_rate",
        "-of",
        "json",
        filePath,
      ],
      { encoding: "utf8" }
    )
  );
  const stream = info.streams?.[0] || {};
  const format = info.format || {};
  let meanVolume = null;
  let maxVolume = null;
  try {
    const vol = execFileSync(
      ffmpeg,
      ["-i", filePath, "-af", "volumedetect", "-f", "null", "-"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    );
    const text = `${vol}`;
    const mean = text.match(/mean_volume:\s*(-?[\d.]+)\s*dB/);
    const max = text.match(/max_volume:\s*(-?[\d.]+)\s*dB/);
    if (mean) meanVolume = Number(mean[1]);
    if (max) maxVolume = Number(max[1]);
  } catch (error) {
    const text = `${error.stderr || error.stdout || ""}`;
    const mean = text.match(/mean_volume:\s*(-?[\d.]+)\s*dB/);
    const max = text.match(/max_volume:\s*(-?[\d.]+)\s*dB/);
    if (mean) meanVolume = Number(mean[1]);
    if (max) maxVolume = Number(max[1]);
  }
  const size = existsSync(filePath) ? statSync(filePath).size : 0;
  const duration = Number(stream.duration || format.duration || 0);
  const silent =
    size <= 0 ||
    !stream.codec_type ||
    duration <= 0 ||
    (maxVolume != null && maxVolume < -35) ||
    (meanVolume != null && meanVolume < -45);
  return {
    file: filePath.replace(/\\/g, "/"),
    size,
    mimeGuess: filePath.endsWith(".m4a") ? "audio/mp4" : "audio",
    codec: stream.codec_name || "",
    sampleRate: Number(stream.sample_rate || 0),
    channels: Number(stream.channels || 0),
    duration,
    meanVolume,
    maxVolume,
    playable: !silent,
    silent,
  };
}

function main() {
  const dir = resolve(argValue("dir", join(ROOT, "tmp-sound-catalog-v1")));
  const ffprobe = findBinary("ffprobe");
  const ffmpeg = findBinary("ffmpeg");
  if (!ffprobe || !ffmpeg) {
    throw new Error("ffprobe/ffmpeg not found");
  }
  const files = walkAudio(dir).filter((p) => !p.includes(`${"upload"}`));
  const rows = [];
  for (const file of files) {
    rows.push(probeFile(ffprobe, ffmpeg, file));
  }
  const out = join(dir, "probe.local.json");
  writeFileSync(out, `${JSON.stringify({ count: rows.length, rows }, null, 2)}\n`);
  const playable = rows.filter((r) => r.playable).length;
  console.log(
    JSON.stringify(
      {
        STATUS: "PROBED",
        COUNT: rows.length,
        PLAYABLE: playable,
        UNPLAYABLE: rows.length - playable,
        OUT: out,
      },
      null,
      2
    )
  );
}

main();
