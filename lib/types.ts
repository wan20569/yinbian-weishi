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
