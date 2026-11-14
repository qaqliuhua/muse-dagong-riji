// Ball.tsx — the Muse ball, deterministic by design (v3: beat-driven
// motion; v2: highlight + spin fix).
//
// WHY THIS EXISTS INSTEAD OF PORTING stage-v3.html:
// stage-v3 uses grok-icon-study's GrokCharacter spring engine: random
// eye morphs, random blink cadence, random wink (one eye!), random gaze.
// That randomness is exactly what ken saw in v4: eyes asymmetric,
// blinking too fast. A daily template must be deterministic — same
// input, same frames, every day. So the ball here is drawn from first
// principles with ONE parameter set for both eyes, mirrored.
//
// Frozen look (v2 changes, ken feedback 2026-11-14):
// - round blob, perfect circle, Muse blue #2A92FE, light-blue eyes #EAF3FF
// - ball centre (540, 920), radius 310. Aspect ratio is 1:1 EXCEPT for
//   transient squash: anticipation crouch (scaleY 0.92) and the landing
//   squash (scaleY 0.90) — both spring back to 1:1 within ~0.5s. The
//   ball is never a constant ellipse.
// - HIGHLIGHT (v2, was "braised egg"): the old highlight was a big
//   flat ellipse (rx 95 ry 55, uniform rgba white 0.28, hard edge,
//   ~30% of ball diameter) sitting right over the left eye, PLUS a
//   solid pale-blue disk r=430 #DCEBFF behind the ball — blue ball +
//   pale ring + white patch = fried/braised egg. v2: disk REMOVED
//   (only the ground shadow ellipse remains); highlight is now a
//   radialGradient (white -> transparent, soft edge), small
//   (rx 50, ry 30) at the upper-left rim (cx 390, cy 710 — above the
//   eyes, eye tops are at y=785), plus a tiny secondary dot
//   (rx 15, ry 9) at (465, 655). The highlight is lighting, not a
//   surface patch: it does NOT rotate with the spin, it follows only
//   the squash/hop, so the first thing you see is a blue ball.
// - eyes: two identical capsules, 110 x 150, centres at x = 540 +/- 118,
//   y = 860 (upper-middle of the ball), ~18% of ball diameter.
// - gaze: BOTH eyes translate together (same dx, dy) — never one eye.
// - blink (v5 rule): every 3.5-5s, close 150-200ms ease-in, open ~300ms
//   ease-out. Blinks here are FIXED at t = 3.6s and t = 7.9s (4.3s apart)
//   for the 10s Day 0 sample; for a 55s video the builder spaces them
//   3.5-5s apart deterministically (see build-day.mjs).
// - SPIN (v2, was "mechanical turntable"): the old spin was 6.2-7.1s,
//   0 -> 360deg symmetric ease-in-out, rigid group, sine hop, no
//   anticipation, no overshoot, no landing squash, eyes glued to the
//   ball. A perfect circle turning 360deg is nearly invisible except
//   for the eyes orbiting, so it read as a machine. v2 timeline:
//   6.0-6.2s anticipation crouch (scaleY 0.92 / scaleX 1.06) + windup
//   -15deg; 6.2-7.0s spin 0.8s, -15deg -> 378deg (overshoot +18deg),
//   mid-spin fastest, hop -40px, eyes stretch 1.14x wide / 0.90x tall
//   mid-spin and lag -10deg behind the ball; 7.0-7.18s settle back to
//   360deg; 7.0-7.15s landing squash (scaleY 0.90 / scaleX 1.07),
//   then spring rebound 1.03 -> 0.985 -> 1.0 by 7.6s, eyes overshoot
//   +5deg at 7.16s and settle by 7.4s. Ground shadow shrinks and
//   fades with the hop and widens slightly on crouch/landing.
//   v3: the spin is no longer hard-coded to 6.0s — it is a beat
//   (type "spin", offset = seconds after its segment start), so any
//   day can place it. No spin beat => no spin at all.
//
// BEATS (v3, ken feedback 2026-11-15: "只会眨眼和转个圈，显得很呆"):
// v2 had only breathing, gaze drift, blinks and ONE spin in 40s —
// after 7.2s the ball was basically still for 33s. v3 drives one
// small action per spoken segment, from the YAML: each segment may
// carry `beat: {type, intensity, dir?, offset?}`. The action starts
// at segment.start + offset (default 0) and lasts ~1.15s. If a
// segment has no beat, it defaults to a gentle "nod" (0.55) — so
// Day 1 gets motion even if the author only fills in script text.
// Beat types (all channels are SHARED by both eyes — one parameter
// set, mirrored; a beat can never deform one eye alone, v4 must not
// come back): hop (small jump), excited (double hop + happy squint),
// nod (dip + squash), droop (sink + lean + look down, sad/tired),
// proud (lift + look up + wide eyes), look (glance sideways, dir
// +1 = right / -1 = left), busy (two quick nods), wide (eyes open
// wide), spin (the v2 turn, see above). Intensity 0-1 scales the
// amplitude. All beat envelopes are smoothstep pulses, deterministic.
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

// --- Beats (v3) ---
export type BeatType =
  | "hop" | "excited" | "nod" | "droop" | "proud" | "look" | "busy" | "wide" | "spin";
export type BeatSpec = {
  type?: BeatType;
  intensity?: number; // 0-1, scales amplitude (default 1)
  dir?: number; // look: +1 glance right, -1 glance left (default +1)
  offset?: number; // seconds after segment start when the action starts (default 0)
};
export type BeatSegment = { start: number; end: number; beat?: BeatSpec };

// One smoothstep pulse: 0 -> 1 -> 0 over [start, start+dur].
// keys() clamps outside the range to the end values (0), so a beat
// that has not started / has finished contributes exactly 0.
function pulse(t: number, start: number, dur: number): number {
  return keys(t, [
    [start, 0],
    [start + 0.22 * dur, 1],
    [start + 0.65 * dur, 1],
    [start + dur, 0],
  ]);
}
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function blinkScaleY(frame: number, fps: number, starts: number[] = [3.6, 7.9]): number {
  // Deterministic blink starts (seconds). 10s sample: 3.6, 7.9.
  // 55s videos: build-day.mjs generates starts 3.6 + k*~4.3s.
  for (const s of starts) {
    const t = frame / fps - s;
    if (t < 0 || t >= 0.48) continue;
    if (t < 0.18) {
      // close, 180ms, ease-in: 1 -> 0.08
      const k = t / 0.18;
      return 1 - 0.92 * k * k;
    }
    // open, 300ms, ease-out: 0.08 -> 1
    const k = (t - 0.18) / 0.3;
    return 0.08 + 0.92 * (1 - (1 - k) * (1 - k));
  }
  return 1;
}

export const Ball: React.FC<{
  frame: number;
  fps: number;
  blinkStarts?: number[];
  segments?: BeatSegment[];
}> = ({ frame, fps, blinkStarts, segments = [] }) => {
  const t = frame / fps;
  // Breathing: uniform scale only, period 4s, +-1.4%. Circle stays a circle.
  const breath = 1 + 0.014 * Math.sin((2 * Math.PI * t) / 4.0);
  // Idle sway: the ball is alive even between beats — slow ±6px drift.
  const swayX = 6 * Math.sin((2 * Math.PI * t) / 7.3);
  // Gaze: slow shared drift, both eyes together, +-12px, ~4s period.
  const gazeX0 = 12 * Math.sin((2 * Math.PI * t) / 4.2);
  const gazeY0 = 8 * Math.sin((2 * Math.PI * t) / 5.1 + 1.0);

  // --- Beats (v3): one action per segment, from the YAML. ---
  // Channels are summed over beats, then combined with the spin
  // channels below. Every channel is shared by both eyes.
  let beatHop = 0; // px, negative = up
  let beatSink = 0; // px, positive = down (droop / nod dip)
  let beatTilt = 0; // deg, whole-body lean
  let beatSqX = 1;
  let beatSqY = 1;
  let beatEyeSX = 1;
  let beatEyeSY = 1;
  let beatGazeX = 0;
  let beatGazeY = 0;
  const spinSeg = segments.find((s) => s.beat?.type === "spin");
  const spinStart = spinSeg
    ? spinSeg.start + (spinSeg.beat?.offset ?? 0)
    : null; // no spin beat => no spin at all
  for (const seg of segments) {
    const b = seg.beat ?? { type: "nod" as BeatType, intensity: 0.55 };
    const type = b.type ?? "nod";
    if (type === "spin") continue; // spin has its own timeline below
    const I = clamp(b.intensity ?? 1, 0, 1);
    const s = seg.start + (b.offset ?? 0);
    const d = 1.15;
    const e = pulse(t, s, d);
    if (e <= 0) continue;
    switch (type) {
      case "hop":
        beatHop -= 36 * I * e;
        beatSqY *= 1 + 0.06 * e;
        beatSqX *= 1 - 0.03 * e;
        break;
      case "excited": {
        // double hop + happy squint (both eyes together)
        const e2 = pulse(t, s, 0.55) + 0.85 * pulse(t, s + 0.45, 0.55);
        beatHop -= 30 * I * e2;
        beatEyeSY *= 1 - 0.45 * I * Math.min(1, e2);
        beatEyeSX *= 1 + 0.12 * I * Math.min(1, e2);
        beatSqY *= 1 + 0.05 * e;
        break;
      }
      case "nod":
        beatSink += 14 * I * e;
        beatSqY *= 1 - 0.1 * e;
        beatGazeY += 10 * I * e;
        beatEyeSY *= 1 - 0.08 * e;
        break;
      case "droop":
        beatSink += 26 * I * e;
        beatTilt -= 7 * I * e;
        beatGazeY += 20 * I * e;
        beatEyeSY *= 1 - 0.18 * e;
        beatSqY *= 1 - 0.07 * e;
        break;
      case "proud":
        beatHop -= 12 * I * e;
        beatSqY *= 1 + 0.04 * e;
        beatGazeY -= 12 * I * e;
        beatEyeSY *= 1 + 0.12 * e;
        beatTilt += 2 * I * e;
        break;
      case "look": {
        const dir = b.dir ?? 1;
        beatGazeX += 28 * I * dir * e;
        beatTilt += 4 * I * dir * e;
        beatEyeSX *= 1 + 0.05 * e;
        break;
      }
      case "busy": {
        // two quick nods, gaze flicks side to side
        const e1 = pulse(t, s, 0.55);
        const e2 = pulse(t, s + 0.55, 0.55);
        beatSink += 10 * I * (e1 + e2);
        beatSqY *= 1 - 0.08 * (e1 + e2);
        beatGazeX += 14 * I * (e1 - e2);
        break;
      }
      case "wide":
        beatEyeSY *= 1 + 0.18 * I * e;
        beatEyeSX *= 1 - 0.06 * I * e;
        beatHop -= 8 * I * e;
        break;
    }
  }

  // --- Spin timeline (v2, now beat-driven) ---
  // Anticipation spinStart-0.2..spinStart: crouch + windup -15deg.
  // Spin spinStart..spinStart+0.8s: -15deg -> 378deg (overshoot +18deg),
  // hop -40px. Settle +0.18s: 378deg -> 360deg. Landing squash at +0.8s.
  // Day 0: spin beat at segment 2 start 5.14 + offset 0.86 = 6.0s,
  // exactly the v2 timing. No spin beat => all spin channels are 0.
  const ss = spinStart ?? 0;
  const spin = spinStart === null ? 0 : keys(t, [
    [0, 0],
    [ss - 0.2, 0],
    [ss, -15],
    [ss + 0.8, 378],
    [ss + 0.98, 360],
    [ss + 2.1, 360],
  ]);
  const hopSpin = spinStart === null ? 0 : keys(t, [
    [0, 0],
    [ss, 0],
    [ss + 0.4, -40],
    [ss + 0.8, 0],
    [ss + 2.1, 0],
  ]);
  // Squash / stretch (transient only — always springs back to 1:1).
  const squashY = spinStart === null ? 1 : keys(t, [
    [0, 1],
    [ss - 0.2, 1],
    [ss, 0.92], // crouch
    [ss + 0.15, 1.04], // stretch on takeoff
    [ss + 0.7, 1.0],
    [ss + 0.82, 0.9], // landing squash
    [ss + 0.95, 0.9],
    [ss + 1.08, 1.03], // spring rebound
    [ss + 1.22, 0.985],
    [ss + 1.4, 1.0],
    [ss + 2.1, 1.0],
  ]);
  const squashX = spinStart === null ? 1 : keys(t, [
    [0, 1],
    [ss - 0.2, 1],
    [ss, 1.06], // crouch widens
    [ss + 0.15, 0.97],
    [ss + 0.7, 1.0],
    [ss + 0.82, 1.07], // landing widens
    [ss + 0.95, 1.07],
    [ss + 1.08, 0.98],
    [ss + 1.22, 1.01],
    [ss + 1.4, 1.0],
    [ss + 2.1, 1.0],
  ]);
  // Eyes: lag behind the ball mid-spin, overshoot after landing, then settle.
  const eyeLag = spinStart === null ? 0 : keys(t, [
    [0, 0],
    [ss, 0],
    [ss + 0.4, -10],
    [ss + 0.8, 0],
    [ss + 0.96, 5],
    [ss + 1.2, 0],
    [ss + 2.1, 0],
  ]);
  // Eyes: slight horizontal stretch / squint mid-spin (motion smear).
  const eyeSX = spinStart === null ? 1 : keys(t, [
    [0, 1],
    [ss + 0.1, 1],
    [ss + 0.3, 1.14],
    [ss + 0.65, 1.14],
    [ss + 0.8, 1],
    [ss + 2.1, 1],
  ]);
  const eyeSY = spinStart === null ? 1 : keys(t, [
    [0, 1],
    [ss + 0.1, 1],
    [ss + 0.3, 0.9],
    [ss + 0.65, 0.9],
    [ss + 0.8, 1],
    [ss + 2.1, 1],
  ]);

  const blink = blinkScaleY(frame, fps, blinkStarts);
  // Combined channels: spin squash x beat squash, spin eye stretch x
  // beat eye mood x blink — all still ONE shared value per eye.
  const totalHop = hopSpin + beatHop;
  const totalSink = beatSink;
  const totalSqX = clamp(squashX * beatSqX, 0.85, 1.12);
  const totalSqY = clamp(squashY * beatSqY, 0.85, 1.12);
  const totalEyeSX = clamp(eyeSX * beatEyeSX, 0.8, 1.3);
  const totalEyeSY = clamp(eyeSY * beatEyeSY, 0.08, 1.3);
  const gazeX = clamp(gazeX0 + beatGazeX, -32, 32);
  const gazeY = clamp(gazeY0 + beatGazeY, -24, 28);

  // Ground shadow follows the jump: smaller + fainter in the air,
  // slightly wider on crouch / landing squash.
  const hopFactor = Math.max(0, -totalHop / 40);
  const crouchAmt = Math.max(0, 1 - totalSqY);
  const shadowRx = 330 * (1 - 0.22 * hopFactor + 0.5 * crouchAmt);
  const shadowOpacity = Math.max(
    0.03,
    0.12 * (1 - 0.45 * hopFactor) + 0.15 * crouchAmt,
  );

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
      {/* ground shadow — the ONLY thing outside the ball now (v2: the
          solid pale-blue disk r=430 #DCEBFF is gone, it made the egg) */}
      <ellipse
        cx={540}
        cy={1420}
        rx={shadowRx}
        ry={36}
        fill={`rgba(20,60,140,${shadowOpacity.toFixed(3)})`}
      />
      <g transform={`translate(${swayX.toFixed(2)} ${(totalHop + totalSink).toFixed(2)})`}>
        <g
          transform={`translate(${BALL_CX} ${BALL_CY}) rotate(${beatTilt.toFixed(2)}) scale(${(breath * totalSqX).toFixed(4)} ${(breath * totalSqY).toFixed(4)}) translate(${-BALL_CX} ${-BALL_CY})`}
        >
          {/* the ball: one perfect circle */}
          <circle cx={BALL_CX} cy={BALL_CY} r={BALL_R} fill="#2A92FE" />
          {/* highlight: small, soft, upper-left rim, ABOVE the eyes
              (eye tops y=785; main highlight centre y=710, bottom
              edge ~740). Does NOT rotate with the spin — it is light,
              not a surface patch. */}
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
          <g transform={`rotate(${spin} ${BALL_CX} ${BALL_CY})`}>
            <g transform={`translate(${gazeX} ${gazeY}) rotate(${eyeLag} ${BALL_CX} ${BALL_CY})`}>
              {[-EYE_DX, EYE_DX].map((dx) => (
                <g
                  key={dx}
                  transform={`translate(${BALL_CX + dx} ${EYE_Y}) scale(${totalEyeSX.toFixed(3)} ${(blink * totalEyeSY).toFixed(3)}) translate(${-(BALL_CX + dx)} ${-EYE_Y})`}
                >
                  <rect
                    x={BALL_CX + dx - EYE_W / 2}
                    y={EYE_Y - EYE_H / 2}
                    width={EYE_W}
                    height={EYE_H}
                    rx={EYE_W / 2}
                    fill="#EAF3FF"
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
