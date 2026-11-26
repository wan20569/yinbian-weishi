/**
 * 帮助中心数据。
 * 纯静态文案，不依赖任何接口，因此可以在服务端 / 客户端无缝渲染，
 * 搜索与分类筛选都在客户端内存里完成（14 条数据量很小）。
 */

export type FaqCategory = "all" | "principle" | "result" | "privacy" | "account";

export interface FaqItem {
  id: string;
  category: Exclude<FaqCategory, "all">;
  /** 问题前的小标签：原理 / 解读 / 隐私 / 使用 */
  tag: string;
  question: string;
  answer: string;
  /** 额外的检索词，让用户搜「误报」「zip」这类口语词也能命中 */
  keywords: string[];
}

export const FAQ_CATEGORIES: Array<{ key: FaqCategory; label: string }> = [
  { key: "all", label: "全部" },
  { key: "principle", label: "检测原理" },
  { key: "result", label: "结果解读" },
  { key: "privacy", label: "文件与隐私" },
  { key: "account", label: "使用与额度" },
];

/** 文档更新时间，展示在页头元信息里 */
export const FAQ_UPDATED_AT = "2026-10-12";

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "how-judge",
    category: "principle",
    tag: "原理",
    question: "你们如何判断一段音乐是不是 AI 生成的？",
    answer:
      "系统综合四类证据：频谱纹理、相位一致性、瞬态包络与编解码指纹。模型在 12.8 万条标注样本上训练，输出的是「AI 生成」的相对概率，而不是绝对结论。检测报告中会列出每项证据的异常分数，方便你判断结论来自哪里。",
    keywords: ["判断", "原理", "依据", "频谱", "相位", "怎么", "检测"],
  },
  {
    id: "model-version",
    category: "principle",
    tag: "原理",
    question: "检测模型是什么？多久更新一次？",
    answer:
      "当前使用频谱 CNN 与序列 Transformer 的集成模型，版本 v2.4.1，覆盖 18 类主流生成器指纹。每当新的生成器出现，我们会补充样本并在 6–8 周内完成一次迭代；最近一次更新在 2026-09-30。",
    keywords: ["模型", "版本", "更新", "多久", "升级", "生成器", "指纹"],
  },
  {
    id: "why-slow",
    category: "principle",
    tag: "原理",
    question: "为什么一次检测需要 20 多秒？",
    answer:
      "音频需要先解码、重采样并按 30 秒切片，再逐段计算 12 项特征，最后过双模型并做置信度校准。3 分钟以内的音频通常 18–28 秒完成；10 分钟音频大约 40–60 秒。耗时主要来自分段推理，而不是上传。",
    keywords: ["耗时", "时间", "多久", "慢", "30秒", "分析", "等待"],
  },
  {
    id: "prob-meaning",
    category: "result",
    tag: "解读",
    question: "AI 生成概率 87% 是什么意思？",
    answer:
      "它表示模型对「这段音频由 AI 生成」的相对置信程度，不代表 87% 的内容是 AI 做的，也不代表剩下 13% 来自人类创作。请结合置信区间与分段判定一起看：区间越窄、异常片段越集中，结论越稳定。",
    keywords: ["概率", "87", "意思", "含义", "结果", "百分比"],
  },
  {
    id: "confidence-vs-prob",
    category: "result",
    tag: "解读",
    question: "置信度和概率有什么区别？",
    answer:
      "概率是判断的方向（更可能是 AI 还是人类），置信度是模型对这个判断的把握程度。举例：概率 62%、置信度 55% 意味着模型倾向于 AI，但自己也拿不准；概率 87%、置信度 96% 则是明确的高置信判断。",
    keywords: ["置信度", "区间", "概率", "区别", "把握", "圆环"],
  },
  {
    id: "segment-mismatch",
    category: "result",
    tag: "解读",
    question: "为什么分段结果和整体结果不一致？",
    answer:
      "分段以 30 秒窗口滑动计算，整体结果对所有片段加权汇总。人机混合制作、片段拼接、母带处理都可能让某一段的概率明显偏低。此时建议关注异常集中的位置，而不是只盯着整体数字。",
    keywords: ["分段", "不一致", "混合", "拼接", "片段", "窗口"],
  },
  {
    id: "false-positive",
    category: "result",
    tag: "解读",
    question: "会误判人类创作吗？",
    answer:
      "会。重度电子编曲、循环素材、强压缩、AI 降噪与二次转码都会让真实作品呈现出类似 AI 的规整特征，当前误报率约 2.1%。如果这是你的原创作品，建议保留工程文件与素材来源，作为人工复核依据。",
    keywords: ["误判", "误报", "人类", "原创", "电子乐", "循环", "素材"],
  },
  {
    id: "evidence",
    category: "result",
    tag: "解读",
    question: "检测结果可以直接作为维权证据吗？",
    answer:
      "不建议单独使用。检测报告是技术参考，不是司法鉴定。正式维权时，请同时准备工程文件、分轨、创作时间戳、发布记录与平台后台数据，再咨询专业法律意见。",
    keywords: ["证据", "维权", "法律", "版权", "鉴定", "使用"],
  },
  {
    id: "store-file",
    category: "privacy",
    tag: "隐私",
    question: "上传的音频会被保存吗？",
    answer:
      "不会长期保存。原始音频与分析中间产物仅用于当次检测，24 小时内自动删除，也可以在报告页手动清除本地归档记录。删除后不可恢复。",
    keywords: ["保存", "删除", "隐私", "文件", "存储", "24小时"],
  },
  {
    id: "training",
    category: "privacy",
    tag: "隐私",
    question: "音频会被用于训练模型吗？",
    answer:
      "不会。用户上传的音频默认不进入训练集。用于训练的样本均来自公开数据集、合作方授权数据与生成器官方输出，并经过脱敏与版权审核。",
    keywords: ["训练", "数据", "模型", "样本", "使用", "数据集"],
  },
  {
    id: "encryption",
    category: "privacy",
    tag: "隐私",
    question: "传输和存储是否加密？",
    answer:
      "上传与下载全程使用 TLS 1.3；对象存储采用 AES-256 静态加密；访问日志保留 30 天，仅用于安全审计。演示环境中的音频只在本机处理，不出内网。",
    keywords: ["加密", "传输", "存储", "安全", "私有化", "内网"],
  },
  {
    id: "formats",
    category: "account",
    tag: "使用",
    question: "支持哪些音频格式与大小？",
    answer:
      "支持 MP3、WAV、FLAC、AAC、M4A、OGG，单文件不超过 50MB，时长不超过 10 分钟，采样率建议不低于 16 kHz。为保证准确率，优先上传原始导出文件，避免平台压缩版本。",
    keywords: ["格式", "大小", "时长", "支持", "mp3", "wav", "flac", "上限"],
  },
  {
    id: "quota",
    category: "account",
    tag: "使用",
    question: "需要注册账号吗？有免费额度吗？",
    answer:
      "单次检测无需注册，每日可免费检测 3 个文件。批量上传、API 调用与历史记录同步需要登录；团队版提供更高额度与私有化部署选项。",
    keywords: ["注册", "账号", "免费", "额度", "次数", "登录"],
  },
  {
    id: "batch",
    category: "account",
    tag: "使用",
    question: "可以批量检测吗？",
    answer:
      "支持。网页端支持 ZIP 批量上传（单批不超过 200 个文件），企业版 API 支持并发调用与回调，结果可导出为 CSV 或 JSON。批量任务通常在 5–10 分钟内完成。",
    keywords: ["批量", "api", "zip", "导出", "并发", "接口", "csv"],
  },
];
