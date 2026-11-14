// Ball.tsx — the Muse ball, deterministic by design (v4: big, dense motion;
// v3: beat-driven motion; v2: highlight + spin fix).
//
// WHY THIS EXISTS INSTEAD OF PORTING stage-v3.html:
// stage-v3 uses grok-icon-study's GrokCharacter spring engine: random
// eye morphs, random blink cadence, random wink (one eye!), random gaze.
// That randomness is exactly what ken saw in v4: eyes asymmetric,
// blinking too fast. A daily template must be deterministic — same
// input, same frames, every day. So the ball here is drawn from first
// principles with ONE parameter set for both eyes, mirrored.
//
// V4 (ken feedback 2026-11-15: "好像连眨眼都不会眨，感觉很呆……
// 其他多余的动作都没有，就是很简单自我介绍，参考视频不是这样"):
// v3's beats were real but too small to see on a phone: hop -36px,
// nod sink 14px, tilt 7°, idle sway ±6px, ball centre NEVER moved,
// one spin in 40s, and the 0.48s blink (every 4.3s) was hidden
// whenever a droop/excited beat was already squinting the eyes
// (blink at 3.6s falls inside the droop beat at 3.06-4.79s).
// The reference engine (grok-icon-study replica/src/) is NOT a
// static ball: onboarding cycles a mood every 1.2s
// (curious/happy/playful/excited/listening/proud/laughing/shy),
// eye morphs swap every 1.1-16s per state (EYE_HOLD_MS), blinks
// every 1.2-14s per state (BLINK_MS), and tricks fire constantly:
// spinBounce (1 turn + hop), spinDizzy (3-4 turns + post-spin
// wobble ±17°), spinWild (9 turns), decaying hops 48→28→14→6px,
// excited bounces at 2.2Hz (squash 0.92→1.05), dragging moves
// ±16px sideways. v4 copies that DENSITY and AMPLITUDE, but
// deterministically (YAML-driven, no Math.random anywhere):
//   - ball TRAVELS: slide ±115px, dance ±85px swings, idle sway ±28px
//   - ball JUMPS BIG: bigjump -110px with crouch 0.86 / landing 0.84
//   - TWO spins: 1 turn at 6.0s + a double spin (720°) at ~22.8s,
//     the double spin ends with a dizzy wobble (Grok spinDizzy)
//   - SUB-BEATS: every segment gets 2-3 actions (main beat + subs at
//     commas / keywords), so something happens every ~1.2s, not one
//     action per 2.7s segment
//   - EYE EXPRESSIONS: happy = both eyes become ∩ arcs (stroke),
//     sad = a ball-blue lid covers the top of both eyes, wide =
//     eyes open 1.28x. All three are ONE shared value, mirrored —
//     a beat can never deform one eye alone (v4 must not come back)
//   - BLINKS YOU CAN SEE: close 0.20s to 0.02 (fully closed line),
//     HOLD closed 0.12s, open 0.28s = 0.60s total, every ~3.2s,
//     and build-day.mjs now schedules them AWAY from squint beats
//     (excited/droop/wide) and spin windows, so a blink is never
//     masked by a squint. Plus a tiny nod rides each blink.
//
// V5 (ken feedback 2026-11-15: "舞台太单一了，眼睛那边有问题"):
// v4's eyes were still wrong in three measured frames:
//   - 1.0s normal eye: a plain white capsule, no pupil, no life;
//   - 20.0s sad: the ball-blue lid rect is drawn INSIDE the eye group,
//     which rotates with the ball's droop tilt (-12° about the ball
//     centre), so the lid's horizontal edge cuts the two capsules at
//     different heights — measured left eye centre-y 967 vs right 926.5
//     (Δcy 40.5px, widths identical 112px). It reads as the eyes melting;
//   - 25.0s (end of the 720° spin): the whole eye group rotates with
//     spinAngle, so the eyes are two slanted ellipses, one 81px higher
//     than the other (measured Δcy 81px; mid-spin at 6.6s Δcy 174px).
//   Root cause in both cases: the eyes were children of the ball's
//   rotate() groups.
//
// V5-CORRECTED (2026-11-15, browser-verified GrokBot Day 0,
// BV1o9J96eEmY 59s — this REPLACES the first v5 draft's assumptions):
// The browser watch showed the original is NOT "eyes always changing
// expression, many scenes". Day 0 is: ONE light grey-white room, fixed
// camera, no scene cuts; the ball rolls right along a white winding
// road, bounces 1/4-1/2 ball diameter, lands squashed 1.6x wide +
// ripple; eyes are just two white bars at ~45° that NEVER change, NEVER
// blink, and roll WITH the ball; liveliness comes from the road +
// ground ring + per-sentence popup cards + typed big text. The slanted
// bars were later treated as a defect INSIDE the series: later videos
// switch the main ball to upright "II" bars, and 眨眼⑤号 defines blink
// as "two horizontals merge into one thin horizontal line, 0.25-0.3s,
// DO NOT draw slanted eyes". So v5-corrected copies the CORRECTED
// original, not the Day 0 slanted bars:
//   - eyes = two horizontal white bars ("=="), 116x36, ALWAYS upright:
//     they translate with the ball but never rotate with tilt (there
//     are no spins at all now — dance/spin/spin2/shake deleted);
//   - blink = both bars flatten (scaleY -> 0.06) and converge
//     (dx 118 -> ~18) into ONE thin horizontal line, 0.28s total,
//     ~3.2s apart, 12 in 40s (build-day.mjs schedule unchanged);
//   - NO pupils, NO happy/sad/wide shapes, NO blue lid: the v5-draft
//     pupil + sad-path + happy-arc are all deleted;
//   - motion = road drift (-180 -> +220px over 40s) + bounce (-155px)
//     + land (1.6x-wide squash + ripple rings + pink stars) + motion
//     smear ghosts; emotion comes from squash, bounce, roll speed and
//     the cards, exactly like the original.
//
// Frozen look (unchanged since v2):
// - round blob, perfect circle, Muse blue #2A92FE, light-blue eyes #EAF3FF
// - ball centre (540, 920), radius 310. Aspect ratio is 1:1 EXCEPT for
//   transient squash — always springs back to 1:1 within ~0.5s.
// - HIGHLIGHT: radialGradient, small (rx 50, ry 30) at the upper-left
//   rim (cx 390, cy 710), plus a tiny dot at (465, 655). It does NOT
//   rotate with the spin.
// - eyes: two identical capsules, 110 x 150, centres at x = 540 +/- 118,
//   y = 860. Gaze moves BOTH eyes together — never one eye.
import React from "react";

export const BALL_CX = 540;
export const BALL_CY = 920;
export const BALL_R = 310;
const EYE_W = 116; // eye bar width ("==" bars, v5-corrected)
const EYE_BAR_H = 36; // eye bar height
const EYE_Y = 860; // eye centre y
const EYE_DX = 118; // eye centre offset from ball centre x

// Piecewise keyframe interpolation with smoothstep easing per segment.
// pts: [[time_s, value], ...] sorted by time. Clamped outside the range.
function keys(t: number, pts: [number, number][]): number {
  if (t <= pts[0][0]) return pts[0][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const [t0, v0] = pts[i];
    const [t1, v1] = pts[i + 1];
    if (t <= t1) {
      const k = (t - t0) / (t1 - t0);
      const s = k * k * (3 - 2 * k); // smoothstep: slow-fast-slow
      return v0 + (v1 - v0) * s;
    }
  }
  return pts[pts.length - 1][1];
}

// --- Beats (v5-corrected, 2026-11-15 browser measurement) ---
// The reference Day 0 has NO dance, NO full spin, NO head shake:
// the ball rolls along the road, bounces 1/4-1/2 ball diameter, and
// lands with a 1.6x-wide squash + ripple. So dance / spin / spin2 /
// shake are deleted; new types are bounce (a 155px bounce, ~1/4 ball
// diameter) and land (a big jump whose LANDING squashes 1.6x wide,
// with ripple rings + pink stars — the original's 42s landing).
// Eye expressions are gone too: the reference eyes never change shape
// (two white bars, no pupils, no happy/sad/wide) — emotion comes from
// squash, bounce, roll speed and the cards. Beats still move the BODY
// (hop/sink/tilt/gaze), and wide/excited still modulate eye BAR
// thickness, but no beat ever changes the eye SHAPE.
export type BeatType =
  | "hop" | "excited" | "nod" | "droop" | "proud" | "look" | "busy" | "wide" | "slide"
  | "bigjump" | "bounce" | "land";
export type BeatSpec = {
  type?: BeatType;
  intensity?: number; // 0-1, scales amplitude (default 1)
  dir?: number; // look/slide: +1 right, -1 left (default +1)
  offset?: number; // seconds after segment start when the action starts (default 0)
  subs?: BeatSpec[]; // v4: sub-beats inside the same segment; each sub's
  // offset is also seconds after the SEGMENT start (not after the main beat)
};
export type BeatSegment = { start: number; end: number; beat?: BeatSpec };

// One smoothstep pulse: 0 -> 1 -> 0 over [start, start+dur].
function pulse(t: number, start: number, dur: number): number {
  return keys(t, [
    [start, 0],
    [start + 0.22 * dur, 1],
    [start + 0.65 * dur, 1],
    [start + dur, 0],
  ]);
}
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// v5-corrected blink (browser-verified GrokBot 眨眼⑤号):
// "两横合为一条细横线、0.25-0.3 秒" — the two horizontal eye bars
// flatten and converge into ONE thin horizontal line. Total 0.28s:
// close 0.10s (scaleY 1 -> 0.06, dx 118 -> ~18), hold 0.06s, open
// 0.12s. Starts come from build-day.mjs (~3.2s apart, 12 in 40s).
// The v4 0.60s blink is gone: the reference blink is short on purpose,
// and visibility now comes from the flatten+converge, not duration.
export function blinkScaleY(frame: number, fps: number, starts: number[] = [1.6, 4.8, 8.1]): number {
  for (const s of starts) {
    const t = frame / fps - s;
    if (t < 0 || t >= 0.28) continue;
    if (t < 0.1) {
      const k = t / 0.1;
      return 1 - 0.94 * k * k;
    }
    if (t < 0.16) return 0.06; // hold closed — one thin line
    const k = (t - 0.16) / 0.12;
    return 0.06 + 0.94 * (1 - (1 - k) * (1 - k));
  }
  return 1;
}

// Gaze saccades (v4, Grok nextGaze): the eyes HOLD a target for
// ~2.4s, then jump to a new one in 0.18s — a jump reads as alive,
// a slow sine reads as a screensaver. Deterministic: targets are
// sin-hash of the step index, same every render.
function gazeKeys(t: number, axis: "x" | "y"): number {
  const pts: [number, number][] = [];
  const N = 18; // 0..43.2s, covers a 40s episode
  for (let k = 0; k < N; k++) {
    const v =
      axis === "x"
        ? 26 * Math.sin(k * 2.39 + 0.7)
        : 16 * Math.sin(k * 1.71 + 1.3);
    const t0 = k * 2.4;
    if (k === 0) pts.push([0, v]);
    else {
      pts.push([t0 - 0.18, pts[pts.length - 1][1]]); // hold previous target
      pts.push([t0, v]); // 0.18s jump
    }
  }
  return keys(t, pts);
}

type Channels = {
  hop: number; sink: number; tilt: number; moveX: number;
  sqX: number; sqY: number; eyeSX: number; eyeSY: number;
  gazeX: number; gazeY: number;
};
const zeroCh = (): Channels => ({
  hop: 0, sink: 0, tilt: 0, moveX: 0, sqX: 1, sqY: 1,
  eyeSX: 1, eyeSY: 1, gazeX: 0, gazeY: 0,
});

// One beat's contribution to the channels at time t. `s` is the beat's
// absolute start (segment.start + offset). All amplitudes are v4-sized:
// v3 hop was -36px, nod sink 14px, tilt 7° — roughly doubled here.
function applyBeat(ch: Channels, type: BeatType, I: number, s: number, t: number, dir = 1): void {
  const d = 1.15;
  const e = pulse(t, s, d);
  switch (type) {
    case "hop":
      ch.hop -= 48 * I * e;
      ch.sqY *= 1 + 0.08 * e;
      ch.sqX *= 1 - 0.04 * e;
      break;
    case "bigjump": {
      // crouch -> launch -110px -> landing squash 0.84 -> rebound.
      // Grok's hop is 48px decaying; ours is one deliberate big jump.
      ch.hop += keys(t, [
        [s, 0], [s + 0.18, 10], [s + 0.55, -110 * I], [s + 0.95, 0], [s + 1.3, 0],
      ]);
      ch.sqY *= keys(t, [
        [s, 1], [s + 0.15, 0.86], [s + 0.45, 1.1], [s + 0.85, 0.84],
        [s + 1.0, 0.84], [s + 1.15, 1.04], [s + 1.3, 1],
      ]);
      ch.sqX *= keys(t, [
        [s, 1], [s + 0.15, 1.08], [s + 0.45, 0.94], [s + 0.85, 1.09],
        [s + 1.15, 0.98], [s + 1.3, 1],
      ]);
      break;
    }
    case "bounce": {
      // the reference bounce: 1/4-1/2 ball diameter (155-310px). Ours:
      // -155px with a firm landing squash, then a smaller rebound hop.
      ch.hop += keys(t, [
        [s, 0], [s + 0.2, 12], [s + 0.6, -155 * I], [s + 1.0, 0],
        [s + 1.25, -38 * I], [s + 1.55, 0], [s + 1.7, 0],
      ]);
      ch.sqY *= keys(t, [
        [s, 1], [s + 0.18, 0.85], [s + 0.5, 1.08], [s + 0.95, 0.8],
        [s + 1.1, 0.8], [s + 1.28, 1.05], [s + 1.45, 0.96], [s + 1.7, 1],
      ]);
      ch.sqX *= keys(t, [
        [s, 1], [s + 0.18, 1.08], [s + 0.5, 0.95], [s + 0.95, 1.16],
        [s + 1.1, 1.16], [s + 1.28, 0.97], [s + 1.45, 1.02], [s + 1.7, 1],
      ]);
      break;
    }
    case "land": {
      // the reference 42s landing: a big jump, then the ball flattens
      // to a horizontal ellipse ~1.6x as wide as tall, + ripple rings
      // + pink stars (rings/stars are drawn in the component from the
      // landing time landT = s + 0.85). Squash here is the BODY squash;
      // the ripple is separate.
      ch.hop += keys(t, [
        [s, 0], [s + 0.18, 10], [s + 0.55, -120 * I], [s + 0.85, 0], [s + 1.3, 0],
      ]);
      // The ball drifts right along the road all video (drift +200 by
      // 38s), so a 1.6x squash would bleed ~140px off the right edge
      // (measured on the 38.0s frame of the first 40s render). The jump
      // therefore carries the ball back to centre stage (moveX -190)
      // and it rolls back along the road after the landing.
      ch.moveX += keys(t, [
        [s, 0], [s + 0.5, -190 * I], [s + 1.3, -190 * I], [s + 2.0, 0],
      ]);
      ch.sqY *= keys(t, [
        [s, 1], [s + 0.15, 0.86], [s + 0.45, 1.1], [s + 0.85, 0.62],
        [s + 1.0, 0.62], [s + 1.15, 1.05], [s + 1.3, 1],
      ]);
      ch.sqX *= keys(t, [
        [s, 1], [s + 0.15, 1.08], [s + 0.45, 0.94], [s + 0.85, 1.6],
        [s + 1.0, 1.6], [s + 1.15, 0.97], [s + 1.3, 1],
      ]);
      break;
    }
    case "excited": {
      const e2 = pulse(t, s, 0.55) + 0.85 * pulse(t, s + 0.45, 0.55);
      ch.hop -= 40 * I * e2;
      // eye bars get thinner (a squint) — shape never changes
      ch.eyeSY *= 1 - 0.25 * I * Math.min(1, e2);
      ch.eyeSX *= 1 + 0.12 * I * Math.min(1, e2);
      ch.sqY *= 1 + 0.05 * e;
      break;
    }
    case "nod":
      ch.sink += 22 * I * e;
      ch.sqY *= 1 - 0.12 * e;
      ch.gazeY += 12 * I * e;
      ch.eyeSY *= 1 - 0.08 * e;
      break;
    case "droop":
      ch.sink += 45 * I * e;
      ch.tilt -= 12 * I * e;
      ch.gazeY += 24 * I * e;
      ch.eyeSY *= 1 - 0.1 * e;
      ch.sqY *= 1 - 0.07 * e;
      break;
    case "proud":
      ch.hop -= 18 * I * e;
      ch.sqY *= 1 + 0.05 * e;
      ch.gazeY -= 14 * I * e;
      ch.eyeSY *= 1 + 0.15 * e;
      ch.tilt += 3 * I * e;
      break;
    case "busy": {
      const e1 = pulse(t, s, 0.55);
      const e2 = pulse(t, s + 0.55, 0.55);
      ch.sink += 16 * I * (e1 + e2);
      ch.sqY *= 1 - 0.08 * (e1 + e2);
      ch.gazeX += 18 * I * (e1 - e2);
      break;
    }
    case "wide":
      ch.eyeSY *= 1 + 0.28 * I * e;
      ch.eyeSX *= 1 - 0.08 * I * e;
      ch.hop -= 10 * I * e;
      break;
    case "slide": {
      // travel to one side and back (Grok "dragging": ±16px in a 259px
      // viewBox ≈ ±68px in our 1080px frame; v4 goes further: ±115px)
      ch.moveX += keys(t, [
        [s, 0], [s + 0.45, 115 * I * dir], [s + 1.05, 115 * I * dir], [s + 1.5, 0],
      ]);
      ch.tilt += 5 * I * dir * pulse(t, s, 1.5);
      ch.gazeX += 20 * I * dir * pulse(t, s, 1.5);
      break;
    }
  }
}

type FlatBeat = { start: number; spec: BeatSpec };
function flatBeats(segments: BeatSegment[]): FlatBeat[] {
  const flat: FlatBeat[] = [];
  for (const seg of segments) {
    const b = seg.beat ?? { type: "nod" as BeatType, intensity: 0.55 };
    flat.push({ start: seg.start + (b.offset ?? 0), spec: b });
    for (const sub of b.subs ?? []) {
      flat.push({ start: seg.start + (sub.offset ?? 0), spec: sub });
    }
  }
  return flat;
}

// Ball centre at time tt, for the motion-smear ghosts. Same beat math
// as the main render, re-run at an earlier time. Valid only because v5
// has no spins: spin hop/squash are always 0, so they are skipped here.
function centerAt(tt: number, flat: FlatBeat[]): { x: number; y: number } {
  const ch = zeroCh();
  for (const fb of flat) {
    const spec = fb.spec;
    const type = spec.type ?? "nod";
    const I = clamp(spec.intensity ?? 1, 0, 1);
    if (type === "look") {
      const dir = spec.dir ?? 1;
      const e = pulse(tt, fb.start, 1.15);
      if (e > 0) ch.moveX += 18 * I * dir * e;
      continue;
    }
    applyBeat(ch, type, I, fb.start, tt, spec.dir ?? 1);
  }
  const swayX = 20 * Math.sin((2 * Math.PI * tt) / 5.0) + 8 * Math.sin((2 * Math.PI * tt) / 2.3 + 1);
  const swayY = 7 * Math.sin((2 * Math.PI * tt) / 3.7 + 0.5);
  const driftX = clamp(-180 + 10 * tt, -180, 220);
  return {
    x: BALL_CX + swayX + driftX + ch.moveX,
    y: BALL_CY + ch.hop + ch.sink + swayY,
  };
}

export const Ball: React.FC<{
  frame: number;
  fps: number;
  blinkStarts?: number[];
  segments?: BeatSegment[];
  ballScale?: number; // v5 camera: scene-driven ball size (default 1)
}> = ({ frame, fps, blinkStarts, segments = [], ballScale = 1 }) => {
  const t = frame / fps;
  // Breathing: uniform scale only, period 4s, ±2.0% (v3 was ±1.4%).
  const breath = 1 + 0.02 * Math.sin((2 * Math.PI * t) / 4.0);
  // Idle sway (v4): the ball drifts ±28px sideways even between beats
  // (v3 was ±6px — invisible). Plus a small vertical bob.
  const swayX = 20 * Math.sin((2 * Math.PI * t) / 5.0) + 8 * Math.sin((2 * Math.PI * t) / 2.3 + 1);
  const swayY = 7 * Math.sin((2 * Math.PI * t) / 3.7 + 0.5);
  // Gaze saccades (v4): hold ~2.4s, jump in 0.18s. Both eyes together.
  const gazeX0 = gazeKeys(t, "x");
  const gazeY0 = gazeKeys(t, "y");

  // --- Flatten beats: main beat + subs, each with an absolute start. ---
  const flat: FlatBeat[] = flatBeats(segments);

  const ch = zeroCh();
  for (const fb of flat) {
    const spec = fb.spec;
    const type = spec.type ?? "nod";
    const I = clamp(spec.intensity ?? 1, 0, 1);
    if (type === "look") {
      // look is the only beat whose dir handling is inline (gaze + lean)
      const dir = spec.dir ?? 1;
      const e = pulse(t, fb.start, 1.15);
      if (e > 0) {
        ch.gazeX += 36 * I * dir * e;
        ch.tilt += 6 * I * dir * e;
        ch.moveX += 18 * I * dir * e;
        ch.eyeSX *= 1 + 0.05 * e;
      }
      continue;
    }
    applyBeat(ch, type, I, fb.start, t, spec.dir ?? 1);
  }

  // --- Land events (v5-corrected): the reference 42s landing. ---
  // landT = when the ball touches down (beat start + 0.85s). Ripple
  // rings + pink stars are drawn from landT in the JSX below.
  const landTimes: number[] = flat
    .filter((fb) => fb.spec.type === "land")
    .map((fb) => fb.start + 0.85);

  const blink = blinkScaleY(frame, fps, blinkStarts);
  // A blink reads as a gesture, not just an eye flicker: a tiny nod
  // rides every blink (sink 8px at full close).
  const blinkDepth = 1 - blink;
  const blinkNod = blinkDepth > 0.4 ? 8 * blinkDepth : 0;

  // Combined channels — still ONE shared value per eye, mirrored.
  // Squash clamp is wide (0.6-1.65) on purpose: the land squash is
  // 1.6x wide / 0.62 tall, and the old 0.82-1.15 clamp would eat it.
  const totalHop = ch.hop;
  const totalSink = ch.sink + blinkNod;
  // Road drift (v5-corrected): the ball rolls right along the road,
  // -180px at t=0 to +220px at t=40 (10px/s). The road dashes scroll
  // the other way in DayVideo, so the roll reads even when the ball
  // is near the edge of the frame.
  const driftX = clamp(-180 + 10 * t, -180, 220);
  const totalMoveX = swayX + driftX + ch.moveX;
  const totalSqX = clamp(ch.sqX, 0.6, 1.65);
  const totalSqY = clamp(ch.sqY, 0.6, 1.15);
  const totalEyeSX = clamp(ch.eyeSX, 0.8, 1.3);
  const totalEyeSY = clamp(ch.eyeSY, 0.02, 1.3);
  const gazeX = clamp(gazeX0 + ch.gazeX, -36, 36);
  const gazeY = clamp(gazeY0 + ch.gazeY, -26, 30);
  const totalTilt = ch.tilt;

  // --- Motion smear (v5-corrected "运动加残影") ---
  // Ghost balls at t-0.05s / t-0.10s: the same beat math, re-run at an
  // earlier time (no spins exist in v5, so the helper only needs the
  // beat channels + sway + drift). Drawn only while actually moving
  // fast, so still frames stay clean.
  const ghost1 = centerAt(t - 0.05, flat);
  const ghost2 = centerAt(t - 0.1, flat);
  const ballCX = BALL_CX + totalMoveX;
  const ballCY = BALL_CY + totalHop + totalSink + swayY;

  // Ground shadow follows the ball sideways and the jump: smaller +
  // fainter in the air, wider on crouch / landing squash.
  const hopFactor = clamp(-totalHop / 110, 0, 1);
  const crouchAmt = Math.max(0, 1 - totalSqY);
  const shadowRx = 330 * (1 - 0.38 * hopFactor + 0.5 * crouchAmt);
  const shadowOpacity = Math.max(
    0.03,
    0.12 * (1 - 0.45 * hopFactor) + 0.15 * crouchAmt,
  );
  const shadowCx = 540 + totalMoveX * 0.85;

  return (
    <svg
      width={1080}
      height={1920}
      viewBox="0 0 1080 1920"
      style={{ position: "absolute", left: 0, top: 0 }}
    >
      <defs>
        {/* main highlight: radial gradient, white -> transparent, soft edge */}
        <radialGradient id="hlMain" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hlDot" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        {/* ghosts are motion smear, not a second ball: blur them so a
            fast vertical jump reads as a smear, not a pale halo */}
        <filter id="ghostBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>
      {/* ground shadow — follows the ball sideways now (v4: it travels) */}
      <ellipse
        cx={shadowCx}
        cy={1420}
        rx={shadowRx}
        ry={36}
        fill={`rgba(20,60,140,${shadowOpacity.toFixed(3)})`}
      />
      {/* pink dashed ground ring (v5-corrected, from the original) */}
      <ellipse
        cx={shadowCx}
        cy={1420}
        rx={shadowRx + 52}
        ry={52}
        fill="none"
        stroke="#FF9EBB"
        strokeWidth={4}
        strokeDasharray="10 12"
        opacity={0.8}
      />
      {/* landing ripple rings + pink stars (v5-corrected, 42s landing) */}
      {landTimes.map((landT) => {
        const dt = t - landT;
        if (dt < 0 || dt > 0.8) return null;
        const k = dt / 0.8;
        const starOp = dt < 0.6 ? 1 - dt / 0.6 : 0;
        const stars: [number, number][] = [[-260, -120], [260, -140], [-330, 60], [330, 40], [0, -210]];
        return (
          <g key={landT}>
            <ellipse cx={shadowCx} cy={1420} rx={140 + 260 * k} ry={20 + 34 * k} fill="none" stroke="#2A92FE" strokeWidth={5} opacity={(0.5 * (1 - k)).toFixed(3)} />
            <ellipse cx={shadowCx} cy={1420} rx={90 + 200 * k} ry={14 + 26 * k} fill="none" stroke="#FF9EBB" strokeWidth={4} opacity={(0.45 * (1 - k)).toFixed(3)} />
            {stars.map(([sx, sy], i) => (
              <path
                key={i}
                d={`M ${shadowCx + sx} ${1420 + sy - 26} L ${shadowCx + sx + 8} ${1420 + sy - 8} L ${shadowCx + sx + 26} ${1420 + sy} L ${shadowCx + sx + 8} ${1420 + sy + 8} L ${shadowCx + sx} ${1420 + sy + 26} L ${shadowCx + sx - 8} ${1420 + sy + 8} L ${shadowCx + sx - 26} ${1420 + sy} L ${shadowCx + sx - 8} ${1420 + sy - 8} Z`}
                fill="#FF9EBB"
                opacity={starOp.toFixed(3)}
              />
            ))}
          </g>
        );
      })}
      {/* motion smear: ghost balls 0.05s / 0.10s behind, only while moving fast */}
      {[
        { c: ghost1, op: 0.07, min: 10 },
        { c: ghost2, op: 0.04, min: 20 },
      ].map(({ c, op, min }, i) => {
        const d = Math.hypot(c.x - ballCX, c.y - ballCY);
        if (d < min) return null;
        return <circle key={i} cx={c.x} cy={c.y} r={BALL_R} fill="#2A92FE" opacity={op} filter="url(#ghostBlur)" />;
      })}
      <g transform={`translate(${totalMoveX.toFixed(2)} ${(totalHop + totalSink + swayY).toFixed(2)})`}>
        <g
          transform={`translate(${BALL_CX} ${BALL_CY}) scale(${(ballScale * breath * totalSqX).toFixed(4)} ${(ballScale * breath * totalSqY).toFixed(4)}) translate(${-BALL_CX} ${-BALL_CY})`}
        >
          {/* the ball: one perfect circle */}
          <circle cx={BALL_CX} cy={BALL_CY} r={BALL_R} fill="#2A92FE" />
          {/* highlight: small, soft, upper-left rim. It leans with the
              ball (totalTilt) but never spins — it is light, not paint. */}
          <g transform={`rotate(${totalTilt.toFixed(2)} ${BALL_CX} ${BALL_CY})`}>
            <ellipse
              cx={390}
              cy={710}
              rx={50}
              ry={30}
              fill="url(#hlMain)"
              transform={`rotate(-25 390 710)`}
            />
            {/* tiny secondary highlight dot, near the top rim */}
            <ellipse cx={465} cy={655} rx={15} ry={9} fill="url(#hlDot)" />
          </g>
          {/* EYES v5-corrected — two horizontal white bars ("=="),
              ALWAYS upright: they translate and squash with the ball,
              but NEVER rotate with tilt (there are no spins at all).
              One shared parameter set, mirrored by construction.
              No pupils, no happy/sad/wide shapes, no lids, no blue
              mask — the bars never change shape. Blink = both bars
              flatten (scaleY -> 0.06) and converge (dx 118 -> ~18)
              into ONE thin horizontal line, 0.28s (see blinkScaleY).
              wide/excited only change bar THICKNESS (eyeSY), never
              the shape. */}
          {[-EYE_DX, EYE_DX].map((dx) => {
            const eyeDx = dx * (1 - 0.85 * blinkDepth);
            const eyeCx = BALL_CX + eyeDx;
            return (
              <g
                key={dx}
                transform={`translate(${eyeCx + gazeX} ${EYE_Y + gazeY}) scale(${totalEyeSX.toFixed(3)} ${(blink * totalEyeSY).toFixed(3)}) translate(${-eyeCx} ${-EYE_Y})`}
              >
                <rect
                  x={eyeCx - EYE_W / 2}
                  y={EYE_Y - EYE_BAR_H / 2}
                  width={EYE_W}
                  height={EYE_BAR_H}
                  rx={EYE_BAR_H / 2}
                  fill="#FFFFFF"
                />
              </g>
            );
          })}
        </g>
      </g>
    </svg>
  );
};
