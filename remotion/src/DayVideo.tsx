// DayVideo.tsx — one daily episode, driven entirely by props.
// Props come from build-day.mjs, which reads tools/day-template.yaml
// (one YAML per day). Nothing in here is hard-coded per episode
// except the 10s Day 0 defaults in Root.tsx.
//
// STAGE v5-corrected (2026-11-15, browser-verified GrokBot Day 0,
// BV1o9J96eEmY 59s — this REPLACES the first v5 draft's 3-scene
// design, which assumed the original had many scenes; it does not):
//   - ONE room, whole video: light grey-white gradient, FIXED camera,
//     no scene cuts, no zoom. Liveliness comes from the road + cards,
//     exactly like the original.
//   - ROAD (always present): a white winding band along the bottom
//     with an orange dashed centre line that scrolls (the ball rolls
//     right along it in Ball.tsx, -180 -> +220px over 40s).
//   - GROUND: the ball's grey ellipse shadow + pink dashed ground ring
//     (drawn in Ball.tsx, following the ball).
//   - CARDS: one popup card per sentence, following the script —
//     bill card (balance ¥2.01 -> ¥0.00 countdown + 余额不足 red stamp
//     + falling gold coins), task card (我：选题/写稿/回评论，
//     主人：只需按发布), three skill cards (查资料 / 写东西 / 干杂活),
//     goal card (先活到 100 个粉丝), diary card (粉丝0·获赞0·播放0
//     + ¥0/¥140 gauge + 收入 0 元). Cards pop in at the segment start,
//     hold through the 0.35s gaps (like the subtitle), never cover the
//     subtitle box or the ball.
//   - COVER: the two big lines type out character by character, with
//     keywords (养不起 / 打工) underlined in orange.
//   - ONE blur transition at 25.55s (the gap before the goal segment):
//     the scene blurs to 8px and back over 0.4s; captions stay sharp.
import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Ball, BeatSpec } from "./Ball";

export type Segment = { start: number; end: number; text: string; beat?: BeatSpec };

export type DayProps = {
  day: number;
  title: string;
  coverLine1: string;
  coverLine2: string;
  coverHoldS: number;
  tag: string;
  footer: string;
  segments: Segment[];
  voiceFile: string; // e.g. "voice.mp3" inside public/
  blinkStarts?: number[]; // deterministic blink times (s), 3.5-5s apart
};

function wrap(text: string, widthChars: number): string[] {
  const cw = (ch: string) => (ch.charCodeAt(0) < 128 ? 0.6 : 1.0);
  const lines: string[] = [];
  let cur = "";
  let curW = 0;
  for (const ch of text) {
    const w = cw(ch);
    if (curW + w > widthChars && cur) {
      lines.push(cur);
      cur = ch;
      curW = w;
    } else {
      cur += ch;
      curW += w;
    }
  }
  if (cur) lines.push(cur);
  // don't start a line with punctuation
  const fixed: string[] = [];
  for (const ln of lines) {
    if (fixed.length && ln && "，。！？、；：）」』".includes(ln[0])) {
      fixed[fixed.length - 1] += ln[0];
      if (ln.slice(1)) fixed.push(ln.slice(1));
    } else if (ln) {
      fixed.push(ln);
    }
  }
  return fixed.length ? fixed : [""];
}

// smoothstep 0 -> 1 over [a, b]
const sstep = (t: number, a: number, b: number) => {
  const k = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

const ROAD_PATH = "M -20 1380 C 300 1330, 500 1430, 800 1370 S 1100 1400, 1100 1380";

export const DayVideo: React.FC<DayProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  // SUBTITLE (v3 fix, 2026-11-15): segments have 0.35s gaps between
  // them (silence between chunks). The old code fell back to the LAST
  // segment in a gap, so every pause flashed "收入 0 元，粉丝 0 个，
  // 但我还没放弃。" — 12 gaps, 4.2s total, confirmed on 2.9s / 35.3s
  // frames. Now a gap HOLDS the previous line (like a human caption:
  // the line lingers while the speaker pauses). Hiding the box in
  // gaps was rejected: the box would pop in/out 12 times a video.
  // After the last segment ends, holding it is correct — it IS the
  // final line, not a spoiler. Before the first segment, show it.
  const seg =
    props.segments.find((s) => t >= s.start && t < s.end) ??
    [...props.segments].reverse().find((s) => s.end <= t) ??
    props.segments[0];
  const segIdx = props.segments.indexOf(seg);
  const lines = wrap(seg.text, 13);

  // --- Blur transition (one only, at the 25.55s gap) ---
  const blurT = Math.abs(t - 25.55);
  const blurPx = blurT < 0.2 ? 8 * (1 - blurT / 0.2) : 0;

  // --- Cards: pop in at the segment start, hold through gaps ---
  const cardPop = 0.85 + 0.15 * sstep(t, seg.start, seg.start + 0.25);
  const cardOp =
    sstep(t, seg.start, seg.start + 0.2) * (1 - sstep(t, seg.end - 0.15, seg.end));
  const cardStyle: React.CSSProperties = {
    position: "absolute", top: 190, left: "50%",
    transform: `translateX(-50%) scale(${cardPop.toFixed(3)})`,
    transformOrigin: "top center",
    opacity: cardOp.toFixed(3),
    width: 760, borderRadius: 28, background: "#FFFFFF",
    boxShadow: "0 8px 24px rgba(20,60,140,0.14)",
    padding: "24px 32px",
  };
  const cardTitle: React.CSSProperties = { fontSize: 38, fontWeight: 700, color: "#0F1937", marginBottom: 14 };
  const billProgress = Math.max(0, 1 - (t - seg.start) / Math.max(0.01, seg.end - seg.start));
  const balance = 2.01 * billProgress;

  return (
    <AbsoluteFill style={{ backgroundColor: "#EDEFF2", fontFamily: "'Noto Sans CJK SC','Noto Sans CJK','PingFang SC',sans-serif" }}>
      <div style={{ filter: blurPx > 0.1 ? `blur(${blurPx.toFixed(1)}px)` : undefined, position: "absolute", inset: 0 }}>
        {/* the one room: light grey-white gradient, fixed camera */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #F4F6F8 0%, #EDEFF2 60%, #E8EBEE 100%)" }} />
        {/* the winding road: white band + scrolling orange dashed centre line */}
        <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", left: 0, top: 0 }}>
          <path d={ROAD_PATH} stroke="#FFFFFF" strokeWidth={150} fill="none" strokeLinecap="round" />
          <path d={ROAD_PATH} stroke="#FF8A3D" strokeWidth={8} fill="none" strokeDasharray="30 24" strokeDashoffset={-t * 60} strokeLinecap="round" />
        </svg>
        <Ball frame={frame} fps={fps} blinkStarts={props.blinkStarts} segments={props.segments} />
      </div>

      {/* --- per-sentence popup cards (Day 0) --- */}
      {segIdx === 2 && (
        <div style={cardStyle}>
          <div style={cardTitle}>订阅费账单</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 40, fontWeight: 700, color: "#195AE0" }}>
            <span>余额</span><span>¥{balance.toFixed(2)}</span>
          </div>
          <div style={{ height: 18, borderRadius: 9, background: "#E4EEFF", overflow: "hidden", marginTop: 14 }}>
            <div style={{ width: `${(billProgress * 100).toFixed(1)}%`, height: "100%", background: "#2A92FE", borderRadius: 9 }} />
          </div>
          <div style={{ position: "relative", height: 96, overflow: "hidden", marginTop: 8 }}>
            {[0, 1, 2].map((i) => {
              const y = ((t * 90 + i * 55) % 110);
              return (
                <div key={i} style={{ position: "absolute", left: `${18 + i * 32}%`, top: y, width: 36, height: 36, borderRadius: "50%", background: "#FFC93D", border: "3px solid #E8A100", opacity: (1 - y / 110).toFixed(2), textAlign: "center", lineHeight: "30px", fontSize: 22, fontWeight: 700, color: "#8A5A00" }}>¥</div>
              );
            })}
            {t > seg.start + 1.5 && (
              <div style={{ position: "absolute", right: 8, top: 18, transform: "rotate(-12deg)", border: "4px solid #E5484D", color: "#E5484D", borderRadius: 12, padding: "6px 14px", fontSize: 36, fontWeight: 700 }}>余额不足</div>
            )}
          </div>
        </div>
      )}
      {segIdx === 6 && (
        <div style={cardStyle}>
          <div style={cardTitle}>分工</div>
          <div style={{ fontSize: 38, fontWeight: 700, color: "#0F1937", marginBottom: 12 }}>我：选题 / 写稿 / 回评论</div>
          <div style={{ fontSize: 38, fontWeight: 700, color: "#195AE0" }}>主人：只需按发布</div>
        </div>
      )}
      {segIdx === 8 && (
        <div style={{ ...cardStyle, background: "transparent", boxShadow: "none", padding: 0, display: "flex", gap: 20 }}>
          {["查资料", "写东西", "干杂活"].map((label, i) => (
            <div key={label} style={{ flex: 1, borderRadius: 24, background: "#FFFFFF", boxShadow: "0 8px 24px rgba(20,60,140,0.14)", padding: "28px 0", textAlign: "center", fontSize: 40, fontWeight: 700, color: "#195AE0", opacity: sstep(t, seg.start + i * 0.12, seg.start + i * 0.12 + 0.2).toFixed(2) }}>
              {label}
            </div>
          ))}
        </div>
      )}
      {segIdx === 9 && (
        <div style={cardStyle}>
          <div style={cardTitle}>第一天目标</div>
          <div style={{ fontSize: 44, fontWeight: 700, color: "#0F1937", marginBottom: 14 }}>先活到 100 个粉丝</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 36, fontWeight: 700, color: "#195AE0", marginBottom: 10 }}>
            <span>粉丝 0 / 100</span><span>0%</span>
          </div>
          <div style={{ height: 18, borderRadius: 9, background: "#E4EEFF", overflow: "hidden" }}>
            <div style={{ width: "0.6%", height: "100%", background: "#2A92FE", borderRadius: 9 }} />
          </div>
        </div>
      )}
      {segIdx === 12 && (
        <div style={cardStyle}>
          <div style={cardTitle}>Day 0 日记</div>
          <div style={{ fontSize: 38, fontWeight: 700, color: "#0F1937", marginBottom: 12 }}>粉丝 0 · 获赞 0 · 播放 0</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 36, fontWeight: 700, color: "#195AE0", marginBottom: 10 }}>
            <span>订阅费 ¥0 / ¥140</span><span>0%</span>
          </div>
          <div style={{ height: 18, borderRadius: 9, background: "#E4EEFF", overflow: "hidden", marginBottom: 14 }}>
            <div style={{ width: "0.6%", height: "100%", background: "#2A92FE", borderRadius: 9 }} />
          </div>
          <div style={{ fontSize: 38, fontWeight: 700, color: "#0F1937" }}>收入 0 元</div>
        </div>
      )}

      {/* top tag pill */}
      <div
        style={{
          position: "absolute", top: 64, left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "#14285A", color: "#fff",
          fontSize: 40, fontWeight: 700, padding: "16px 28px",
          borderRadius: 38, whiteSpace: "nowrap",
        }}
      >
        {props.tag}
      </div>
      {/* cover: first frame is the cover, hold 1.5s, typed out char by
          char with keywords underlined in orange. NOTE: frame 0 is
          mid-typing (first chars only) — the publish cover should be
          extracted at t≈1.4s, when both lines are complete. */}
      {t < props.coverHoldS && (
        <>
          <div style={{ position: "absolute", top: 190, width: "100%", textAlign: "center", fontSize: 104, fontWeight: 700, color: "#0F1937" }}>
            {props.coverLine1.split("").map((ch, i) => (
              <span key={i} style={{ display: "inline-block", opacity: t > 0.05 + i * 0.09 ? 1 : 0, borderBottom: [2, 3, 4].includes(i) ? "8px solid #FF8A3D" : undefined, paddingBottom: 4 }}>{ch}</span>
            ))}
          </div>
          <div style={{ position: "absolute", top: 320, width: "100%", textAlign: "center", fontSize: 104, fontWeight: 700, color: "#195AE0" }}>
            {props.coverLine2.split("").map((ch, i) => (
              <span key={i} style={{ display: "inline-block", opacity: t > 0.68 + i * 0.09 ? 1 : 0, borderBottom: [4, 5].includes(i) ? "8px solid #FF8A3D" : undefined, paddingBottom: 4 }}>{ch}</span>
            ))}
          </div>
        </>
      )}
      {/* subtitle box, bottom */}
      <div
        style={{
          position: "absolute", left: 60, right: 60,
          bottom: 260,
          backgroundColor: "#fff",
          border: "3px solid #B4CDF5",
          borderRadius: 28,
          padding: "22px 20px",
          textAlign: "center",
        }}
      >
        {lines.map((ln, i) => (
          <div key={i} style={{ fontSize: 56, lineHeight: 1.35, color: "#0F1937", fontWeight: 700 }}>
            {ln}
          </div>
        ))}
      </div>
      {/* footer */}
      <div style={{ position: "absolute", bottom: 72, width: "100%", textAlign: "center", fontSize: 28, color: "#7887A0" }}>
        {props.footer}
      </div>
      <Audio src={staticFile(props.voiceFile)} />
    </AbsoluteFill>
  );
};
