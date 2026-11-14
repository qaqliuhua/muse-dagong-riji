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

// Deterministic blink schedule (v4, 2026-11-15).
// v3 was 3.6 + k*4.3s, 0.48s each — and the 3.6s blink fell inside the
// droop beat (3.06-4.79s), where the eyes were already squinting, so on
// a phone it looked like the ball never blinked at all. v4: candidates
// every ~3.2s from 1.6s, each 0.60s in Ball.tsx (0.20s close to 0.02,
// 0.12s HOLD closed, 0.28s open). A candidate that lands inside a
// squint-beat window (excited / droop / wide, beat start .. +1.3s) or
// a spin window is shifted +1.2s once, so a blink is never masked by
// a squint. Minimum gap 2.0s between blinks. Same input -> same list.
const SQUINT = new Set(["excited", "droop", "wide"]);
const squintWindows = [];
const spinWindows = [];
for (const seg of segments) {
  const beats = [seg.beat, ...((seg.beat && seg.beat.subs) || [])].filter(Boolean);
  for (const b of beats) {
    const bs = seg.start + (b.offset ?? 0);
    if (SQUINT.has(b.type)) squintWindows.push([bs, bs + 1.3]);
    if (b.type === "spin" || b.type === "spin2") {
      const dur = b.type === "spin2" ? 2.0 : 0.8;
      spinWindows.push([bs - 0.2, bs + dur + 0.18 + 1.6]);
    }
  }
}
const inWin = (x, wins) => wins.some(([a, b]) => x >= a && x <= b);
const blinkStarts = [];
for (let c = 1.6; c < durationS - 1; c += 3.2) {
  let s = +c.toFixed(2);
  if (inWin(s, squintWindows) || inWin(s, spinWindows)) s = +(s + 1.2).toFixed(2);
  if (blinkStarts.length && s < blinkStarts[blinkStarts.length - 1] + 2.0) {
    s = +(blinkStarts[blinkStarts.length - 1] + 2.0).toFixed(2);
  }
  if (s < durationS - 1) blinkStarts.push(s);
}

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
