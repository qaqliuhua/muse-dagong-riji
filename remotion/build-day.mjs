#!/usr/bin/env node
// build-day.mjs — one YAML in, one Remotion props JSON + voice file out.
// Usage: node build-day.mjs day-0.yaml [--render out.mp4]
//   --render runs `npx remotion render` with the generated props.
//
// The YAML is the same shape as tools/day-template.yaml, plus:
//   voice_file: path to the day's mp3 (relative to the project root)
//   segments: [{start, end, text}] — times from faster-whisper,
//     text from the script file (never Whisper's text: it hears Muse
//     as Mills and writes Traditional). If segments are missing, pass
//     segments_file: path to an .srt produced by tools/align_subs.py.
//   duration_s: total seconds (defaults to last segment end)
// Blink starts are generated deterministically: first at 3.6s, then
// every 4.3s (inside the 3.5-5s v5 rule), never during the 1.5s cover
// hold and never in the last 1s.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import yaml from "js-yaml";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HERE = path.resolve(ROOT, "remotion");
const yamlPath = path.resolve(process.argv[2]);
const renderOut = process.argv.includes("--render")
  ? process.argv[process.argv.indexOf("--render") + 1]
  : null;

const cfg = yaml.load(fs.readFileSync(yamlPath, "utf8"));
const day = cfg.day ?? 0;

function parseSrt(file) {
  const raw = fs.readFileSync(path.resolve(ROOT, file), "utf8");
  const segs = [];
  for (const block of raw.trim().split(/\n\s*\n/)) {
    const lines = block.trim().split("\n");
    if (lines.length < 3) continue;
    const m = lines[1].match(
      /(\d+):(\d+):([\d.]+)\s*-->\s*(\d+):(\d+):([\d.]+)/,
    );
    if (!m) continue;
    const toS = (h, mi, s) => +h * 3600 + +mi * 60 + parseFloat(s);
    segs.push({
      start: toS(m[1], m[2], m[3]),
      end: toS(m[4], m[5], m[6]),
      text: lines.slice(2).join(" ").trim(),
    });
  }
  return segs;
}

const segments = cfg.segments ?? parseSrt(cfg.segments_file);
const durationS = cfg.duration_s ?? segments[segments.length - 1].end;
const durationInFrames = Math.round(durationS * 60);

// Deterministic blink schedule (v5 rule: 3.5-5s apart).
const blinkStarts = [];
for (let s = 3.6; s < durationS - 1; s += 4.3) blinkStarts.push(+s.toFixed(2));

const props = {
  day,
  title: cfg.title,
  coverLine1: cfg.cover?.line1 ?? "",
  coverLine2: cfg.cover?.line2 ?? "",
  coverHoldS: cfg.cover?.hold_s ?? 1.5,
  tag: `Muse打工日记 · Day ${day}`,
  footer: cfg.footer ?? "AI 生成内容 · Remotion 重写版",
  segments,
  voiceFile: "voice.mp3",
  blinkStarts,
};

const propsPath = path.join(HERE, `day-${day}-props.json`);
fs.writeFileSync(propsPath, JSON.stringify(props, null, 2));
console.log("props ->", propsPath, `duration ${durationS}s = ${durationInFrames} frames, blinks at ${blinkStarts.join(", ")}s`);

if (cfg.voice_file) {
  const src = path.resolve(ROOT, cfg.voice_file);
  fs.copyFileSync(src, path.join(HERE, "public", "voice.mp3"));
  console.log("voice ->", path.join(HERE, "public", "voice.mp3"));
}
if (renderOut) {
  console.log("rendering… (concurrency 1, 1.5-CPU host)");
  execSync(
    `npx remotion render src/index.ts DayVideo ${path.resolve(renderOut)} ` +
      `--props=${propsPath} --duration=${durationInFrames} ` +
      `--codec=h264 --concurrency=1 --log=verbose`,
    // NOTE 2026-11-14: Remotion 4 has NO --duration-in-frames flag —
    // the CLI flag is --duration (frames). The old flag was silently
    // ignored and the composition's hard-coded 557 frames in Root.tsx
    // won, so a 40.19s render came out as 9.301s. Fixed here.
    { cwd: HERE, stdio: "inherit" },
  );
}
