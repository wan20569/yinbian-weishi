# 音辩卫士（yinbian-guardian）

AI 音乐鉴别与原创性检测工作台。前端为 Next.js 14 纯静态界面（任务与报告数据来自 `lib/mock-data.ts` 与 `lib/mock-service.ts` 的内存态）；AI 鉴别一项可选接入本地 Python 推理服务，不接也能完整演示。

## 运行

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # 生产构建
```

技术栈：Next.js 14 App Router · React 18 · TypeScript · Tailwind CSS · shadcn/ui · lucide-react · wavesurfer.js（无真实音频时自动降级为占位波形）

## 路由

| 路径 | 说明 |
| --- | --- |
| `/` | Suno 风格三栏工作台；报告中心 / 个人中心通过 `?view=` 在同路由内切换 |
| `/detect/new` | 蘑兔风单列上传页 |
| `/detect/[taskId]` | 检测结果页 |

## 检测流程

所有上传一律调用真实模型，没有任何「第几次固定结果」的演示脚本，URL 上也不再带 `dc` 之类的演示参数。

1. 上传音频 → 跳转结果页（URL 只有 `type` 和 `name`）
2. 进度条推进到 **30%** 时发起一次推理请求，进度条继续走，不等待
3. 进度到 100% 且结果返回 → 展示模型数值；若此时仍在请求则继续显示骨架屏（最长等于客户端超时）
4. 请求失败 → 自动回落到种子随机结果，页面照常出结果

## 接入真实模型

前端在检测进度到 30% 时调用 `POST /api/infer`（同源），由 `next.config.mjs` 的 rewrite 代理到本地推理服务：

```bash
# 终端 1：推理服务
.venv-infer\Scripts\python.exe -m uvicorn server.serve:app --host 127.0.0.1 --port 8000
# 终端 2：前端
npm run dev
```

端口/地址要换，改环境变量 `INFERENCE_ORIGIN` 即可，前端代码不用动。

降级规则（页面永不白屏），结果页右上角徽章直接对应三种数据来源：

| 情况 | 行为 | 徽章 |
| --- | --- | --- |
| 模型返回成功 | 用模型的 AI 概率与耗时 | `模型实时判定` |
| 请求超时 / 后端未启动 / 5xx / 返回体不合法 | 回落到种子随机 | `模型推理失败 · 已降级随机` |
| 没有可推理的音频（6 条预设任务、刷新后 File 丢失） | 走种子随机 | `无原始音频 · 随机结果` |

模型只输出 AI 概率，不产出相似度与片段。后端返回 `similarityAvailable: false` 时，前端按真实 AI 概率重新取一个同象限、未检出抄袭的场景来补相似度数值，保证「AI 概率 / 相似度 / 结论文案」三者自洽。

## ⚠️ 坑位记录：服务端单例污染（hydration mismatch）

**`lib/mock-service.ts` 的 `inMemoryTasks` 是模块级可变单例，在 SSR 期间必须避免任何写入操作，否则会污染服务端状态导致 hydration mismatch。**

背景：Next.js App Router 中标记为 `"use client"` 的组件**依然会在服务端预渲染一次**。此时 `mock-service.ts` 会被求值，且这份数组在 Node 进程里**跨请求共享**。服务端一旦写入（如把任务改成 `status: "done", progress: 100`），该状态会永久生效，之后所有请求的预渲染 HTML 都带着被改写的数据；而客户端 hydrate 时用的是干净的初始副本 → 两端不一致 → Hydration failed。

**复现路径**：先访问 `/detect/tsk_20260930_002`，再刷新 `/`，`demo_vocal_take3.mp3` 的「检测中 58%」在服务端 HTML 里变成「已完成」。表现为「逛一圈后刷新才报错，重启 dev 首次打开正常」。

**规避规则（改动此文件时务必遵守）**：

1. 所有写操作（`registerTask` / `updateTaskResult`）必须先过 `if (typeof window === "undefined") return;` 守卫。
2. 服务端只读：需要「算出来的结果」时只计算并返回（`buildTaskResult` 返回的 `fresh` 是种子确定性的，两端一致），不写回。
3. `listTasks()` 一律返回浅拷贝，禁止把内部数组引用交出去被 `sort()` 等原地修改。
4. 结果必须确定性可复现（种子 PRNG `mulberry32`），两端才能算出同样的值。

**回归校验**：

```bash
# 1. 先访问结果页触发 SSR（会执行 buildTaskResult）
curl -s http://localhost:3000/detect/tsk_20260930_002 > /dev/null
# 2. 再访问首页
curl -s http://localhost:3000/
# 3. 检查 demo_vocal_take3.mp3 的状态必须恒为「检测中 / 58%」，不随访问顺序变化
```

## 其他 SSR/CSR 一致性约定

- **时间文案**：一律以固定基准 `MOCK_NOW`（`lib/utils.ts`，2026-09-30 18:30 +08:00）计算相对时间；`formatDateTime` 固定按 **UTC+8** 手工换算，不使用 `getHours()` / `toLocaleDateString()`，避免 Node 与浏览器的**时区与 ICU 差异**导致不一致。
- **随机数**：渲染阶段禁止 `Math.random()`；一律使用 `lib/random-result.ts` 的 `mulberry32` 种子 PRNG，随机只发生在 `useEffect` 或事件回调里。
- **进度动画**：`progress` 初始值为 `0`，推进只在 `useEffect` 内进行。
- **localStorage**：只在 `useEffect` 中读取（报告中心、已生成报告状态、演示计数），首帧用 Skeleton / 确定性初始值占位。
- **File 对象**：跨路由不落盘，靠 `lib/pending-files.ts` 的模块级 Map 按 taskId 暂存，读写都带 `typeof window` 守卫（同上面那条服务端单例红线）。刷新后 Map 清空，调用方必须能接受 `null` 并降级。

## ⚠️ 坑位记录：生产构建 EPERM（`.next/trace`）

现象：`next build` 在 `Creating an optimized production build ...` 之后立刻中断，报

```
EPERM: operation not permitted, open '.next/trace'
```

原因不是文件锁，也不是杀毒软件：`next.config.mjs` 顶层写了 `outputFileTracing: false`（Next 14 里这个选项已移到 `experimental`，顶层写属于无效配置），它让构建期的 trace 落盘路径失效。

**结论：不要加这个选项。** 移除后 `next build` 正常通过（5/5 页面静态生成）。如果哪天又出现同样的 EPERM，先检查 config 里有没有这一行，再去怀疑环境。

