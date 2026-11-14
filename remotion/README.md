# Remotion 重写版 — Muse打工日记（免费路线，$0）

ken 拍板：重写就重写，是来赚钱的，不是花钱的。AWS Lambda 分片、
OpenManus 付费 key、任何付费云服务一律不要。本目录就是免费重写的结果。

## 为什么重写，而不是接着修 HTML 舞台

`sample/stage-v3.html` 用的是 grok-icon-study 的 GrokCharacter 弹簧引擎：
随机换眼睛、随机眨眼节奏、还会随机单眼 wink、随机视线。随机就是
v4 眼睛不对称、眨太快的根因——同一份输入，每次录出来都不一样，
没法靠 QA 兜底。Remotion 版把球从第一性原理重画成确定性的：
同一份 YAML → 同一帧画面，每天都一样。

## 舞台（src/Ball.tsx，确定性）

- 正圆：一个 `<circle>`，中心 (540, 920)，半径 310，Muse 蓝 #2A92FE。
  常态宽高比恒为 1:1；“呼吸”只是整体均匀缩放 ±1.4%（周期 4 秒）。
  转圈前后有**瞬态**压扁（下蹲 scaleY 0.92、落地 scaleY 0.90 再弹簧
  回弹），不是常态椭圆。
- 高光（v2 改）：主高光 radialGradient 白→透明，rx=50、ry=30，
  在 (390, 710)，眼顶 y=785，高光底边约 740，**不压眼睛**；另有
  小副高光 rx=15、ry=9 在 (465, 655)。高光不跟转圈旋转，只跟随
  压扁/跳起。球外实心淡蓝大圆盘 r=430 已**删掉**（v1 的卤蛋感根因），
  球外只留地面椭圆影。
- 眼睛：一只参数、镜像两只。胶囊 110×150，#EAF3FF，中心 x = 540±118，
  y = 860（约球直径的 18%）。视线是两只眼睛一起平移（±12px），
  眨眼是两只眼睛同一个 scaleY——不可能一只大一只小。
- 眨眼（v5 规则）：3.5–5 秒一次，闭合 180ms ease-in，睁开 300ms
  ease-out。10 秒小样固定在 3.6s、7.9s；55 秒由 build-day.mjs
  按 3.6 + k×4.3s 生成。实测：3.69s 两眼同时半闭，3.95s 同时睁开。
- 转圈（v2 改，旧的 6.2–7.1s 刚体 ease-in-out 已废弃）：
  6.0–6.2s 预备下蹲 scaleY 0.92 / scaleX 1.06 + 反向蓄力 -15°；
  6.2–7.0s 转 0.8s，-15° → 378°（超转 +18°），跳起 -40px，
  中段眼睛横向拉伸 1.14×、滞后球 -10°；7.0–7.18s 回弹归位 360°，
  落地压扁 scaleY 0.90 / scaleX 1.07 再弹簧回弹 1.03 → 0.985 → 1.0
  （到 7.6s），影子跳起时缩小 22%、变淡 45%。转圈中途眼睛是斜的——
  那是转圈本身，不是眼睛歪了；完整版只转一次。v3 起转圈不再写死
  6.0s：它是 beat（`{type: spin, offset: 0.86}`，段起 5.14 + 0.86
  = 6.0s，时间轴和 v2 完全一样），没有 spin beat 的那期就不转。
- 动效（v3 改，ken 2026-11-15 反馈“只会眨眼和转个圈，显得很呆”）：
  每段口播一个 beat，写在 YAML 的 `beat: {type, intensity, dir?, offset?}`，
  动作从段起 + offset 开始、持续约 1.15s，smoothstep 脉冲，确定性。
  类型：hop（小跳）、excited（双跳 + 开心眯眼）、nod（点头下压）、
  droop（低头蔫一点：下沉 + 倾斜 + 视线向下 + 半闭眼）、proud
  （抬头挺一下：上抬 + 视线向上 + 睁大）、look（斜视，dir +1 向右 /
  -1 向左）、busy（两下快点头）、wide（睁大）、spin（转圈）。
  没写 beat 的段默认 gentle nod（0.55）。另有全程闲置摇摆 ±6px
  （周期 7.3s）。所有动效通道都是两只眼睛共用同一参数，绝不能
  回到 v4 一只眼变形。
- 字幕（v3 修，ken 2026-11-15 反馈“字幕依旧有问题”）：根因是
  DayVideo.tsx 空档 fallback 取最后一段——13 段之间 12 个 0.35s
  空档全闪“收入 0 元，粉丝 0 个，但我还没放弃。”。修法是空档
  延续上一句（不是隐藏字幕框，隐藏会让框 12 次闪现）。段起止
  时间没动，分段时长表仍是对的。
- 没有 tmix / gblur：Remotion 是逐帧真渲染的 60fps，不是插帧，
  不需要动态模糊来掩盖插帧痕迹。

## 每天怎么出片（只改一个 YAML）

```bash
cd ~/workspace/muse-dagong-riji
cp tools/day-template.yaml remotion/day-N.yaml   # 填标题、封面、稿子、账本
# 1. 配音：云端 TTS（Aria，1.1x），存成 day-N-voice.mp3
# 2. 字幕：sample/fw_words.py 跑词级时间戳 -> tools/align_subs.py 出 .srt
#    （时间用 Whisper，文字用稿子原文）
# 3. 把 segments（起止时间+稿子原文）和 voice_file 写进 day-N.yaml
#    （segments_file: 指向 .srt 也行，build-day.mjs 会解析）
cd remotion
node build-day.mjs day-N.yaml --render dayN-remotion.mp4
python3 ../tools/qa_check.py dayN-remotion.mp4 ../day-N-voice.mp3
```

build-day.mjs 做的事：读 YAML → 生成 `day-N-props.json`
（含确定性眨眼时间表）→ 把配音拷到 `public/voice.mp3` → 调
`remotion render`（concurrency=1，1.5 核主机只能跑 1 路）。

## 实测（2026-11-14）

| | v4（HTML 录屏 + ffmpeg tmix） | Remotion v1（10 秒小样） | Remotion v2（Day 0 完整版） |
|---|---|---|---|
| 文件 | sample/sample-10s-v4-preview60.mp4，937 KB | [day0-remotion-v1.mp4](sandbox://workspace/muse-dagong-riji/remotion/day0-remotion-v1.mp4)，869 KB | [day0-full-remotion-v2.mp4](sandbox://workspace/muse-dagong-riji/remotion/day0-full-remotion-v2.mp4)，3.6 MB |
| 规格 | 1080×1920，60fps，9.282s | 1080×1920，60fps，9.301s（配音 9.282s，差 0.02s） | 1080×1920，60fps，**40.192s**（2411 帧，配音 40.19s，差 0.00s） |
| QA | 6/6 PASS | 6/6 PASS（tools/qa_check.py，5.3s 左右） | **6/6 PASS**（tools/qa_check.py） |
| 球 | 正圆 | 正圆，抽查帧 0.5 / 4.7 / 7.0 / 8.8s 均圆 | 正圆；高光改小改软不压眼，大圆盘已删 |
| 眼睛 | 不对称、眨太快（ken 反馈） | 对称（0.5s、4.7s 两帧左右眼完全一致）；眨眼 3.6s、7.9s 两次 | 对称；眨眼按 3.6 + k×4.3s 自动生成（3.6 / 7.9 / 12.2 / 16.5 / 20.8 / 25.1 / 29.4 / 33.7 / 38.0s，共 9 次） |
| 字幕 | Whisper 时间 + 稿子原文 | 同一套时间 + 稿子原文，抽查帧全部对上 | **分段时长法 13 段**（不用 Whisper）：35s 处“我是 Muse，打工 Day 0，”**在**，快线版 3.3s 空档已修 |
| 渲染耗时 | 30→60fps 转换 38s（不含录屏/合成） | **109 秒全流程**（含打包约 40s + 557 帧渲染约 69s，约 8 帧/秒） | **2 分 59 秒全流程**（2411 帧，约 13.5 帧/秒）；v2 10 秒小样 54.5 秒 |

抽查帧：v1 在 `qa/`；v2 完整版在 `qa-full/`（check-0.5s / 6.15s /
6.6s / 20s / 35s / 39s），v2 10 秒小样在 `qa-v2/`。

## 55 秒一条要多久（实测速率外推，不是猜的）

- 配音云端 TTS：约 5 秒（Day 0 用的是现成分段配音，0 秒）
- 字幕：分段时长法 0.1 秒（不用 Whisper；Whisper 方案约 30 秒）
- Remotion 渲染：完整版 40.19s 实测 2 分 59 秒（2411 帧，约 13.5 帧/秒），
  55 秒（3300 帧）推算约 **4 分钟**，在 5 分钟目标内。
  注意 v1 10 秒 109 秒、v2 10 秒 54.5 秒、完整版约 13.5 帧/秒——
  同命令同机器速率有波动，4 分钟是按完整版实测速率算的。
- QA 门：约 5 秒
- **合计约 4–4.5 分钟一条 55 秒**。比旧流水线 20 分钟快，达标。

## 和 HyperFrames 路线对比

- HyperFrames（提速线程正在跑，本次没碰它的文件）：HTML + GSAP
  时间线，headless Chrome 逐帧 seek + ffmpeg，理论上和 Remotion
  一样是真 60fps；它的耗时本次未测，无法直接对比快慢。
- Remotion 的优势：React props 就是配置，YAML → props 是一条线，
  不用录屏、不靠帧时间戳对齐；确定性眨眼/眼睛对称是代码保证的，
  不是录屏碰运气；QA 门直接跑在成品上。
- Remotion 的代价：一次重写（装包约 3.5 分钟，修了 3 个坑，见下）；许可证是 source-available（≤3 人免费商用），不是
  MIT/Apache——本项目 1 个人用，免费额度内；node_modules 约
  485MB 浏览器缓存 + 250 个包，只在项目目录里，不影响别处。

## 坑（下次别再踩）

1. **Remotion 的 Chrome 下载会超时**：`npx remotion render` 第一次
   下载 Chrome Headless Shell（107MB），它的下载器 20 秒没数据就
   报错重下。其实网络没问题，用 curl 直接下就 9 秒：
   `curl -L -o node_modules/.remotion/chrome-headless-shell/<zip> https://remotion.media/chromium-headless-shell-linux-x64-158.0.8127.2.zip?clear`，
   解压后在同目录写 VERSION 文件 `158.0.8127.2-remotion-v3`。
   别用 /opt/meta-chromium/chrome：它有 Hatch 域策略，Remotion
   启动不了（"Hatch WebGL domain policy is required"）。
2. **/tmp 只有 512MB**：Remotion 打包 + 渲染帧缓存放 /tmp 会
   ENOSPC。每次渲染前 `export TMPDIR=$PWD/.tmp`（项目目录在
   150GB 盘上）。已在 build-day.mjs 的 --render 路径里说明，
   但环境变量要自己 export——README 这句话就是提醒。
3. **`interpolate` 的签名**：Remotion 是
   `interpolate(input, inputRange, outputRange, options)`，
   不是 `interpolate(inputRange, outputRange, options)`。
   漏了 input 会在第 0 帧就报错 "inputRange (2) and outputRange
   (undefined) must have the same length"。
4. **没碰的文件**：sample/v5/（v5 眼睛修复）、hyperframes-test/、
   fast/（提速线程）、MEMORY.md。skill 文件也没改：
   `muse-dagong-video/SKILL.md` 里 Remotion 仍写着“备用”，
   要不要把它扶正成主线，等 ken 看完 v1 再定。

## 版本

- Remotion 4.0.543，React 18.3.1，Node 24.22.1，Chrome Headless
  Shell 158.0.8127.2。全部免费，无付费 API，无 AWS，无 LLM key。
