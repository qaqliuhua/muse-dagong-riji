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
const EYE_W = 110;
const EYE_H = 150;
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

// --- Beats (v3, extended in v4) ---
export type BeatType =
  | "hop" | "excited" | "nod" | "droop" | "proud" | "look" | "busy" | "wide" | "spin"
  | "dance" | "slide" | "bigjump" | "spin2" | "shake";
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

// v4 blink: close 0.20s to 0.02 (a real closed line, not 0.08),
// HOLD closed 0.12s so a phone viewer actually registers it,
// open 0.28s. Total 0.60s (v3 was 0.48s with no hold).
// Starts come from build-day.mjs, which now spaces them ~3.2s apart
// and keeps them OUT of squint-beat and spin windows.
export function blinkScaleY(frame: number, fps: number, starts: number[] = [1.6, 4.8, 8.1]): number {
  for (const s of starts) {
    const t = frame / fps - s;
    if (t < 0 || t >= 0.6) continue;
    if (t < 0.2) {
      // close, 200ms, ease-in: 1 -> 0.02
      const k = t / 0.2;
      return 1 - 0.98 * k * k;
    }
    if (t < 0.32) return 0.02; // hold closed — this is what makes it visible
    // open, 280ms, ease-out: 0.02 -> 1
    const k = (t - 0.32) / 0.28;
    return 0.02 + 0.98 * (1 - (1 - k) * (1 - k));
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
  gazeX: number; gazeY: number; happy: number; sad: number;
};
const zeroCh = (): Channels => ({
  hop: 0, sink: 0, tilt: 0, moveX: 0, sqX: 1, sqY: 1,
  eyeSX: 1, eyeSY: 1, gazeX: 0, gazeY: 0, happy: 0, sad: 0,
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
      ch.happy += 0.6 * I * pulse(t, s, 0.95);
      break;
    }
    case "excited": {
      const e2 = pulse(t, s, 0.55) + 0.85 * pulse(t, s + 0.45, 0.55);
      ch.hop -= 40 * I * e2;
      // happy ARC eyes (both together) + a squint on the capsule underneath
      ch.happy += 0.9 * I * Math.min(1, e2);
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
      ch.sad += 0.85 * I * e; // ball-blue lid over the top of both eyes
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
    case "dance": {
      // side-to-side shimmy, Grok celebrate style: 3 swings + 2 hops
      ch.moveX += keys(t, [
        [s, 0], [s + 0.28, 85 * I], [s + 0.55, -85 * I], [s + 0.82, 85 * I],
        [s + 1.1, -45 * I], [s + 1.4, 0],
      ]);
      ch.hop -= 45 * I * (pulse(t, s, 0.5) + 0.8 * pulse(t, s + 0.55, 0.5));
      ch.happy += 0.8 * I * pulse(t, s, 1.4);
      ch.sqY *= 1 - 0.06 * I * (pulse(t, s, 0.5) + pulse(t, s + 0.55, 0.5));
      break;
    }
    case "shake": {
      // embarrassed / "no no" shake: rapid ±12px, 6Hz, 0.7s
      const env = pulse(t, s, 0.7);
      ch.moveX += 12 * I * Math.sin((t - s) * 2 * Math.PI * 6) * env;
      ch.tilt += 3 * I * Math.sin((t - s) * 2 * Math.PI * 6) * env;
      ch.eyeSY *= 1 + 0.2 * I * env;
      break;
    }
    case "spin":
    case "spin2":
      break; // spins have their own timeline below
  }
}

export const Ball: React.FC<{
  frame: number;
  fps: number;
  blinkStarts?: number[];
  segments?: BeatSegment[];
}> = ({ frame, fps, blinkStarts, segments = [] }) => {
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
  type FlatBeat = { start: number; spec: BeatSpec };
  const flat: FlatBeat[] = [];
  for (const seg of segments) {
    const b = seg.beat ?? { type: "nod" as BeatType, intensity: 0.55 };
    flat.push({ start: seg.start + (b.offset ?? 0), spec: b });
    for (const sub of b.subs ?? []) {
      flat.push({ start: seg.start + (sub.offset ?? 0), spec: sub });
    }
  }

  const ch = zeroCh();
  for (const fb of flat) {
    const spec = fb.spec;
    const type = spec.type ?? "nod";
    if (type === "spin" || type === "spin2") continue;
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

  // --- Spins (v2 timeline, generalised to N spins, v4 adds a 2nd) ---
  // Each spin: anticipation ss-0.2..ss (crouch + windup -15°),
  // spin ss..ss+dur (dur = 0.8s per turn, angle -> turns*360+18°),
  // settle +0.18s back to turns*360, then a dizzy wobble for ~1.5s
  // (Grok spinDizzy: post-spin tilt oscillation ±17° decaying).
  // Base angle = 360° per spin already finished, so spin 2 starts
  // where spin 1 ended instead of snapping back to 0.
  type SpinBeat = { ss: number; turns: number };
  const spins: SpinBeat[] = flat
    .filter((fb) => fb.spec.type === "spin" || fb.spec.type === "spin2")
    .map((fb) => ({ ss: fb.start, turns: fb.spec.type === "spin2" ? 2 : 1 }))
    .sort((a, b) => a.ss - b.ss);
  let spinAngle = 0;
  let spinHop = 0;
  let spinSqX = 1;
  let spinSqY = 1;
  let spinLag = 0;
  let spinEyeSX = 1;
  let spinEyeSY = 1;
  let spinTiltWobble = 0;
  let spinDizzy = 0;
  let completedTurns = 0;
  for (const sp of spins) {
    const dur = 0.8 * sp.turns + (sp.turns > 1 ? 0.6 : 0);
    const end = sp.ss + dur + 0.18;
    if (t >= end) {
      completedTurns += sp.turns;
      continue;
    }
    if (t < sp.ss - 0.2) continue;
    // this spin is active (or in its wobble tail)
    const total = sp.turns * 360;
    spinAngle = keys(t, [
      [sp.ss - 0.2, 0], [sp.ss, -15], [sp.ss + dur, total + 18],
      [end, total], [end + 1.6, total],
    ]);
    spinHop = keys(t, [
      [sp.ss, 0], [sp.ss + dur / 2, -50], [sp.ss + dur, 0], [end + 1.6, 0],
    ]);
    spinSqY = keys(t, [
      [sp.ss - 0.2, 1], [sp.ss, 0.92], [sp.ss + 0.15, 1.04],
      [sp.ss + dur - 0.1, 1.0], [sp.ss + dur + 0.02, 0.88],
      [sp.ss + dur + 0.15, 0.88], [sp.ss + dur + 0.28, 1.03],
      [sp.ss + dur + 0.42, 0.985], [sp.ss + dur + 0.6, 1],
    ]);
    spinSqX = keys(t, [
      [sp.ss - 0.2, 1], [sp.ss, 1.06], [sp.ss + 0.15, 0.97],
      [sp.ss + dur - 0.1, 1.0], [sp.ss + dur + 0.02, 1.09],
      [sp.ss + dur + 0.15, 1.09], [sp.ss + dur + 0.28, 0.98],
      [sp.ss + dur + 0.42, 1.01], [sp.ss + dur + 0.6, 1],
    ]);
    spinLag = keys(t, [
      [sp.ss, 0], [sp.ss + dur / 2, -10], [sp.ss + dur, 0],
      [sp.ss + dur + 0.16, 5], [sp.ss + dur + 0.4, 0],
    ]);
    spinEyeSX = keys(t, [
      [sp.ss, 1], [sp.ss + 0.1, 1], [sp.ss + 0.3, 1.14],
      [sp.ss + dur - 0.15, 1.14], [sp.ss + dur, 1],
    ]);
    spinEyeSY = keys(t, [
      [sp.ss, 1], [sp.ss + 0.1, 1], [sp.ss + 0.3, 0.9],
      [sp.ss + dur - 0.15, 0.9], [sp.ss + dur, 1],
    ]);
    if (t > end) {
      // dizzy wobble after the spin (stronger for the double spin)
      const dt = t - end;
      const env = Math.exp(-dt * 1.8) * Math.max(0, 1 - dt / 1.5);
      spinTiltWobble = 8 * (sp.turns >= 2 ? 1 : 0.4) * env * Math.sin(dt * 9);
      spinDizzy = 0.3 * env;
    }
    break; // only one spin can be active at a time (Day 0 spins are 16s apart)
  }
  spinAngle += completedTurns * 360;

  const blink = blinkScaleY(frame, fps, blinkStarts);
  // A blink reads as a gesture, not just an eye flicker: a tiny nod
  // rides every blink (sink 8px at full close).
  const blinkDepth = 1 - blink;
  const blinkNod = blinkDepth > 0.4 ? 8 * blinkDepth : 0;

  // Combined channels — still ONE shared value per eye, mirrored.
  const totalHop = spinHop + ch.hop;
  const totalSink = ch.sink + blinkNod;
  const totalMoveX = swayX + ch.moveX;
  const totalSqX = clamp(spinSqX * ch.sqX, 0.82, 1.15);
  const totalSqY = clamp(spinSqY * ch.sqY, 0.82, 1.15);
  const totalEyeSX = clamp(spinEyeSX * ch.eyeSX, 0.8, 1.3);
  const totalEyeSY = clamp(spinEyeSY * ch.eyeSY * (1 - spinDizzy), 0.02, 1.3);
  const gazeX = clamp(gazeX0 + ch.gazeX, -36, 36);
  const gazeY = clamp(gazeY0 + ch.gazeY, -26, 30);
  const happy = clamp(ch.happy, 0, 1);
  const sad = clamp(ch.sad, 0, 1);
  const totalTilt = ch.tilt + spinTiltWobble;

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
      </defs>
      {/* ground shadow — follows the ball sideways now (v4: it travels) */}
      <ellipse
        cx={shadowCx}
        cy={1420}
        rx={shadowRx}
        ry={36}
        fill={`rgba(20,60,140,${shadowOpacity.toFixed(3)})`}
      />
      <g transform={`translate(${totalMoveX.toFixed(2)} ${(totalHop + totalSink + swayY).toFixed(2)})`}>
        <g
          transform={`translate(${BALL_CX} ${BALL_CY}) rotate(${totalTilt.toFixed(2)}) scale(${(breath * totalSqX).toFixed(4)} ${(breath * totalSqY).toFixed(4)}) translate(${-BALL_CX} ${-BALL_CY})`}
        >
          {/* the ball: one perfect circle */}
          <circle cx={BALL_CX} cy={BALL_CY} r={BALL_R} fill="#2A92FE" />
          {/* highlight: small, soft, upper-left rim, ABOVE the eyes.
              It does NOT rotate with the spin — it is light. */}
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
          {/* eyes rotate WITH the ball, but with their own lag +
              mid-spin stretch, so they are not glued rigidly. */}
          <g transform={`rotate(${spinAngle} ${BALL_CX} ${BALL_CY})`}>
            <g transform={`translate(${gazeX} ${gazeY}) rotate(${spinLag} ${BALL_CX} ${BALL_CY})`}>
              {[-EYE_DX, EYE_DX].map((dx) => (
                <g
                  key={dx}
                  transform={`translate(${BALL_CX + dx} ${EYE_Y}) scale(${totalEyeSX.toFixed(3)} ${(blink * totalEyeSY).toFixed(3)}) translate(${-(BALL_CX + dx)} ${-EYE_Y})`}
                >
                  {/* v4 eye expressions — all THREE shapes share the same
                      parameters for both eyes (mirrored by construction):
                      capsule (normal), ∩ arc (happy, crossfades in),
                      ball-blue lid over the top (sad). Blink scales the
                      whole group, so a blink during a happy arc still
                      closes both eyes together. */}
                  <rect
                    x={BALL_CX + dx - EYE_W / 2}
                    y={EYE_Y - EYE_H / 2}
                    width={EYE_W}
                    height={EYE_H}
                    rx={EYE_W / 2}
                    fill="#EAF3FF"
                    opacity={(1 - happy).toFixed(3)}
                  />
                  <path
                    d={`M ${BALL_CX + dx - 52} ${EYE_Y + 12} A 52 52 0 0 1 ${BALL_CX + dx + 52} ${EYE_Y + 12}`}
                    stroke="#EAF3FF"
                    strokeWidth={34}
                    fill="none"
                    strokeLinecap="round"
                    opacity={happy.toFixed(3)}
                  />
                  <rect
                    x={BALL_CX + dx - EYE_W / 2}
                    y={EYE_Y - EYE_H / 2}
                    width={EYE_W}
                    height={58}
                    rx={18}
                    fill="#2A92FE"
                    opacity={(sad * 0.95).toFixed(3)}
                  />
                </g>
              ))}
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
};
