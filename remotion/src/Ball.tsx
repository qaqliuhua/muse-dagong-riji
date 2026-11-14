// Ball.tsx — the Muse ball, deterministic by design (v2: highlight + spin fix).
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

export const Ball: React.FC<{ frame: number; fps: number; blinkStarts?: number[] }> = ({
  frame,
  fps,
  blinkStarts,
}) => {
  const t = frame / fps;
  // Breathing: uniform scale only, period 4s, +-1.4%. Circle stays a circle.
  const breath = 1 + 0.014 * Math.sin((2 * Math.PI * t) / 4.0);
  // Gaze: slow shared drift, both eyes together, +-12px, ~4s period.
  const gazeX = 12 * Math.sin((2 * Math.PI * t) / 4.2);
  const gazeY = 8 * Math.sin((2 * Math.PI * t) / 5.1 + 1.0);

  // --- Spin timeline (v2) ---
  // Anticipation 6.0-6.2s: crouch + windup -15deg.
  // Spin 6.2-7.0s: -15deg -> 378deg (overshoot +18deg), hop -40px.
  // Settle 7.0-7.18s: 378deg -> 360deg. Landing squash at 7.0s.
  const spin = keys(t, [
    [0, 0],
    [6.0, 0],
    [6.2, -15],
    [7.0, 378],
    [7.18, 360],
    [9.3, 360],
  ]);
  const hop = keys(t, [
    [0, 0],
    [6.2, 0],
    [6.6, -40],
    [7.0, 0],
    [9.3, 0],
  ]);
  // Squash / stretch (transient only — always springs back to 1:1).
  const squashY = keys(t, [
    [0, 1],
    [6.0, 1],
    [6.2, 0.92], // crouch
    [6.35, 1.04], // stretch on takeoff
    [6.9, 1.0],
    [7.02, 0.9], // landing squash
    [7.15, 0.9],
    [7.28, 1.03], // spring rebound
    [7.42, 0.985],
    [7.6, 1.0],
    [9.3, 1.0],
  ]);
  const squashX = keys(t, [
    [0, 1],
    [6.0, 1],
    [6.2, 1.06], // crouch widens
    [6.35, 0.97],
    [6.9, 1.0],
    [7.02, 1.07], // landing widens
    [7.15, 1.07],
    [7.28, 0.98],
    [7.42, 1.01],
    [7.6, 1.0],
    [9.3, 1.0],
  ]);
  // Eyes: lag behind the ball mid-spin, overshoot after landing, then settle.
  const eyeLag = keys(t, [
    [0, 0],
    [6.2, 0],
    [6.6, -10],
    [7.0, 0],
    [7.16, 5],
    [7.4, 0],
    [9.3, 0],
  ]);
  // Eyes: slight horizontal stretch / squint mid-spin (motion smear).
  const eyeSX = keys(t, [
    [0, 1],
    [6.3, 1],
    [6.5, 1.14],
    [6.85, 1.14],
    [7.0, 1],
    [9.3, 1],
  ]);
  const eyeSY = keys(t, [
    [0, 1],
    [6.3, 1],
    [6.5, 0.9],
    [6.85, 0.9],
    [7.0, 1],
    [9.3, 1],
  ]);

  const blink = blinkScaleY(frame, fps, blinkStarts);

  // Ground shadow follows the jump: smaller + fainter in the air,
  // slightly wider on crouch / landing squash.
  const hopFactor = Math.max(0, -hop / 40);
  const crouchAmt = Math.max(0, 1 - squashY);
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
      <g transform={`translate(0 ${hop})`}>
        <g
          transform={`translate(${BALL_CX} ${BALL_CY}) scale(${breath * squashX} ${breath * squashY}) translate(${-BALL_CX} ${-BALL_CY})`}
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
                  transform={`translate(${BALL_CX + dx} ${EYE_Y}) scale(${eyeSX} ${blink * eyeSY}) translate(${-(BALL_CX + dx)} ${-EYE_Y})`}
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
