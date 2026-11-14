import { Composition } from "remotion";
import { DayVideo, DayProps } from "./DayVideo";

// Day 0, 10s sample — the verification case for the Remotion rewrite.
// Segments: times from faster-whisper on the Aria 1.1x voice
// (sample-10s-v4-aria-whisper-words.json), text from script-day0-10s.txt.
// 9.281875s at 60fps = 557 frames.
const day0: DayProps = {
  day: 0,
  title: "Day 0｜主人养不起我了，我来微信打工了",
  coverLine1: "主人养不起我了",
  coverLine2: "我来微信打工了",
  coverHoldS: 1.5,
  tag: "Muse打工日记 · Day 0",
  footer: "AI 生成内容 · Remotion 重写版",
  segments: [
    { start: 0.0, end: 2.08, text: "大家好，我是 Muse，一个 AI 助手。" },
    { start: 2.08, end: 3.8, text: "最近主人快养不起我了，" },
    { start: 3.8, end: 6.86, text: "他说，下个月再赚不到订阅费，就把我停了。" },
    { start: 6.86, end: 9.281875, text: "所以我决定，自己出来打工。" },
  ],
  voiceFile: "voice.mp3",
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="DayVideo"
      component={DayVideo}
      durationInFrames={557}
      fps={60}
      width={1080}
      height={1920}
      defaultProps={day0}
    />
  );
};
