// DayVideo.tsx — one daily episode, driven entirely by props.
// Props come from build-day.mjs, which reads tools/day-template.yaml
// (one YAML per day). Nothing in here is hard-coded per episode
// except the 10s Day 0 defaults in Root.tsx.
import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Ball } from "./Ball";

export type Segment = { start: number; end: number; text: string };

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

export const DayVideo: React.FC<DayProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const seg =
    props.segments.find((s) => t >= s.start && t < s.end) ??
    props.segments[props.segments.length - 1];
  const lines = wrap(seg.text, 13);

  return (
    <AbsoluteFill style={{ backgroundColor: "#E4EEFF", fontFamily: "'Noto Sans CJK SC','Noto Sans CJK','PingFang SC',sans-serif" }}>
      <Ball frame={frame} fps={fps} blinkStarts={props.blinkStarts} />
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
      {/* cover: first frame is the cover, hold 1.5s */}
      {t < props.coverHoldS && (
        <>
          <div style={{ position: "absolute", top: 190, width: "100%", textAlign: "center", fontSize: 104, fontWeight: 700, color: "#0F1937" }}>
            {props.coverLine1}
          </div>
          <div style={{ position: "absolute", top: 320, width: "100%", textAlign: "center", fontSize: 104, fontWeight: 700, color: "#195AE0" }}>
            {props.coverLine2}
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
