export type TaskStatus = "queued" | "analyzing" | "done" | "failed";

export type DetectType = "ai" | "plagiarism" | "comprehensive";

export type RiskLevel = "low" | "medium" | "high";

export interface MatchedSegment {
  id: string;
  /** 起始秒 */
  start: number;
  /** 结束秒 */
  end: number;
  /** 相似度 0-100 */
  similarity: number;
  sourceTitle: string;
  sourceArtist: string;
  /** 命中来源：指纹库 / 旋律特征库 */
  source: "fingerprint" | "melody";
  matchedAt?: string;
}

export interface EvidenceItem {
  key: "cnn" | "fingerprint" | "melody";
  name: string;
  method: string;
  conclusion: string;
  status: "pending" | "running" | "success";
  score: number;
}

/** 风格断裂点（仅真实推理产出，展示用，不参与判决） */
export interface Breakpoint {
  start: number;
  end: number;
  jump: number;
  direction: "ai_to_human" | "human_to_ai";
}

export interface DetectionResult {
  /** AI 生成概率 0-100 */
  aiProbability: number;
  /** 整体抄袭相似度 0-100 */
  similarity: number;
  riskLevel: RiskLevel;
  /** 综合结论 */
  verdict: string;
  /** 波形峰值数组 0-1 */
  waveformData: number[];
  audioDuration: number;
  matchedSegments: MatchedSegment[];
  evidenceChain: EvidenceItem[];
  /** 报告编号（前端伪造） */
  reportNo: string;
  createdAt: string;

  /** 以下均为真实推理才有的字段；mock / 降级随机时不存在 */
  /** 逐窗概率（单位 %），顺序对应滑窗顺序 */
  windowProbabilities?: number[];
  /** 逐窗概率峰值 0-100 */
  aiProbabilityPeak?: number;
  /** 参与推理的窗口数 */
  windows?: number;
  /** 风格断裂点 */
  breakpoints?: Breakpoint[];
  /** 模型名 */
  model?: string;
  /** P(AI) > 60% 的窗口个数；mock / 降级时不存在 */
  strongWindowCount?: number;
}

export interface Task {
  id: string;
  fileName: string;
  fileSize: number;
  duration: number;
  createdAt: string;
  status: TaskStatus;
  detectType: DetectType;
  progress: number;
  result?: DetectionResult;
}

export interface DetectTypeOption {
  value: DetectType;
  title: string;
  description: string;
  icon: "sparkles" | "copy" | "shield";
  tag: string;
}
