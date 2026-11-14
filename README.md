# Muse打工日记 — GitHub Actions 10 秒小样验证

已推送到公开仓库 https://github.com/qaqliuhua/muse-dagong-riji（main 分支）。
验证结果见同目录下的 `REPORT-2026-11-15.md`：两次成功运行，第二次 64 秒全程，
0.5 秒帧与本地 v2 逐字节相同。

## 这是什么

- `remotion/`：Remotion 渲染工程（10 秒 Day 0 小样，v2 球）。
- `sample/sample-10s-voice-aria-11x.mp3`：10 秒测试配音（Aria 1.1x，9.28 秒，37KB）。
  只为验证渲染链路才放进来；正式库里配音的去留见 `REPORT-2026-11-15.md`。
- `.github/workflows/render-video.yml`：手动触发（`workflow_dispatch`）的渲染 workflow，只渲 10 秒小样。

## 渲染命令（workflow 里跑的就是这条）

```bash
cd remotion
node build-day.mjs day-0.yaml   # 生成 day-0-props.json + public/voice.mp3
npx remotion render src/index.ts DayVideo out/day0-10s-actions.mp4 \
  --props=day-0-props.json --duration=557 --codec=h264 \
  --concurrency=2 --log=verbose
```

9.281875 秒 × 60fps = 557 帧。`--duration` 必须显式传：Root.tsx 里写死的也是 557，但 Remotion 4 没有 `--duration-in-frames` 这个 flag，旧 flag 会被静默忽略（本地完整版曾经因此被截成 9.3 秒）。

## 不在仓库里的东西（workflow 现场生成）

- `remotion/day-0-props.json`：`build-day.mjs` 生成。本地那份现在是 40 秒完整版的 props（13 段），**不能直接抄过来**，会渲错时长。
- `remotion/public/voice.mp3`：`build-day.mjs` 从 `sample/` 拷过来。本地那份现在是 40.19 秒完整版配音，**不能直接抄过来**。
- `remotion/node_modules/`：`npm install` 装，`actions/cache` 按 `package-lock.json` 缓存。

## 费用

公开库 + 标准 `ubuntu-latest` runner（4 vCPU / 16GB）：免费不限分钟。workflow 只用标准 runner，没有 larger / GPU runner，没有任何密钥（Secrets）——这个测试不需要任何密钥。
