import type { ReportItem } from "./report-store";

/**
 * 示例报告数据 —— 仅供「载入示例报告（演示用）」按钮使用。
 *
 * 不放进 mock-data.ts 的原因：mock-data.ts 是检测任务/结果的 mock 源，
 * 示例报告只在用户主动点击时写入 localStorage，两者职责不同。
 *
 * 注意：createdAt 使用固定字符串，避免 SSR / CSR 两端取值不一致。
 */
export const sampleReports: ReportItem[] = [
  {
    taskId: "tsk_20260930_001",
    fileName: "夜色频率_remix_final.wav",
    detectType: "comprehensive",
    aiProbability: 98.7,
    similarity: 87.3,
    riskLevel: "high",
    reportNo: "YBS-2026-0930-0042",
    createdAt: "2026-09-30T20:12:00.000Z",
    status: "已生成",
    matchedSegments: [
      {
        id: "seg-1",
        start: 32,
        end: 45,
        similarity: 87.3,
        sourceTitle: "夜色频率 (Night Frequency)",
        sourceArtist: "陈屿 · 2024 独立发行",
        source: "fingerprint",
      },
      {
        id: "seg-2",
        start: 112,
        end: 121,
        similarity: 64.1,
        sourceTitle: "潮汐之间",
        sourceArtist: "蓝岸乐队 · 2023 专辑《回声》",
        source: "melody",
      },
    ],
  },
  {
    taskId: "tsk_20260929_004",
    fileName: "参赛作品_07_海边的信.mp3",
    detectType: "ai",
    aiProbability: 12.4,
    similarity: 23.6,
    riskLevel: "low",
    reportNo: "YBS-2026-0929-0031",
    createdAt: "2026-09-29T11:40:00.000Z",
    status: "已生成",
    matchedSegments: [],
  },
  {
    taskId: "tsk_20260928_005",
    fileName: "专辑母带_01_晨雾.wav",
    detectType: "plagiarism",
    aiProbability: 41.2,
    similarity: 76.8,
    riskLevel: "medium",
    reportNo: "YBS-2026-0928-0026",
    createdAt: "2026-09-28T09:05:00.000Z",
    status: "已生成",
    matchedSegments: [
      {
        id: "seg-1",
        start: 68,
        end: 84,
        similarity: 76.8,
        sourceTitle: "Morning Mist ( sketch )",
        sourceArtist: "K. Aoki · 2022 EP《Haze》",
        source: "melody",
      },
    ],
  },
];
