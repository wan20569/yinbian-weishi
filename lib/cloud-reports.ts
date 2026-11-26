/**
 * ─────────────────────────────────────────────────────────────
 *  检测报告 · 云服务数据访问层
 * ─────────────────────────────────────────────────────────────
 *  本文件封装「登录 → 上传报告图片 → 写入报告记录 → 读取报告列表」的完整链路，
 *  目标是把 lib/report-store.ts 的 localStorage 持久化升级为云端持久化。
 *
 *  ⚠️ 前置条件（二者缺一不可）：
 *   1. 云服务环境已激活（拿到 publicConfig）
 *   2. 已安装 SDK：npm install @tencent-ai/workbuddy-cloud-sdk@dev
 *
 *  数据表结构见 server/reports_schema.sql（owner_id + RLS 按用户隔离）。
 *
 *  安全红线：
 *   - 前端【永不传 owner_id】，数据库用 DEFAULT auth.uid() 自动填
 *   - 不打印 token、邮箱、手机号、私密文件 URL 到日志
 *   - 只放公开配置（endpoint / publishableKey），不放长期密钥
 */

import type { RiskLevel } from "./types";
import { createWorkBuddyCloud } from "@tencent-ai/workbuddy-cloud-sdk";
import { cloudPublicConfig } from "./cloud-config";

// ─────────────────────────────────────────────────────────────
// 类型
// ─────────────────────────────────────────────────────────────

/** reports 表的一行（与 reports_schema.sql 对应） */
export interface CloudReportRow {
  id: number;
  owner_id: string;
  owner_name: string | null;
  file_name: string;
  risk_level: RiskLevel;
  ai_probability: number | null;
  image_path: string | null;
  created_at: string;
}

/** 新建报告时前端要提交的字段（owner_id 不在此列，由 DB 自动填） */
export interface NewCloudReport {
  file_name: string;
  risk_level: RiskLevel;
  ai_probability: number;
  image_path: string;
  owner_name?: string | null;
}

// ─────────────────────────────────────────────────────────────
// SDK 客户端（单例，初始化一次）
//
// 用 publicConfig 初始化真实客户端。endpoint + publishableKey 必填，
// web 应用还要传 oauthRelayBaseUrl（微信/WorkBuddy 账号登录依赖它）。
// 三个值都来自 cloud-config.ts 里的 publicConfig，绝不硬编码 endpoint、
// 也不从 location / env 变量读取。
// ─────────────────────────────────────────────────────────────

/**
 * reports 表的数据库 Schema（与 server/reports_schema.sql 对应）。
 * 用于让 database.from("reports") 获得正确的列类型推断。
 */
export interface DatabaseSchema {
  public: {
    Tables: {
      reports: {
        Row: CloudReportRow;
        Insert: NewCloudReport;
        Update: Partial<NewCloudReport>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

let client: ReturnType<typeof createWorkBuddyCloud<DatabaseSchema>> | null = null;

/**
 * 初始化（或获取）云服务客户端。首次调用用 publicConfig 创建，之后复用单例。
 * 幂等：重复调用返回同一个实例。
 */
export function cloud() {
  if (!client) {
    client = createWorkBuddyCloud<DatabaseSchema>({
      endpoint: cloudPublicConfig.endpoint,
      oauthRelayBaseUrl: cloudPublicConfig.oauthRelayBaseUrl,
      publishableKey: cloudPublicConfig.publishableKey,
    });
  }
  return client;
}

/** 兼容旧调用方：显式初始化入口（已无需手动传 client，内部直接用 publicConfig） */
export function initCloud(): void {
  cloud();
}

// ─────────────────────────────────────────────────────────────
// 会话 / 身份
// ─────────────────────────────────────────────────────────────

export interface CloudUser {
  id: string;
  name?: string;
  avatarUrl?: string;
}

/** 拿当前登录用户；未登录返回 null（调用方据此引导登录） */
export async function currentUser(): Promise<CloudUser | null> {
  const { data: session, error } = await cloud().auth.getSession();
  if (error || !session) return null;
  return {
    id: session.user.id,
    name: session.user.name,
    avatarUrl: session.user.avatarUrl,
  };
}

/** 是否已登录 */
export async function isSignedIn(): Promise<boolean> {
  return (await currentUser()) !== null;
}

// ─────────────────────────────────────────────────────────────
// 报告读写（owner_id 由 RLS 自动隔离，前端不传）
// ─────────────────────────────────────────────────────────────

/** 写入一条报告（含图片路径）。返回新建的行。 */
export async function createReport(
  report: NewCloudReport,
): Promise<CloudReportRow> {
  const { data, error } = await cloud()
    .database.from("reports")
    .insert({
      file_name: report.file_name,
      risk_level: report.risk_level,
      ai_probability: report.ai_probability,
      image_path: report.image_path,
      // owner_id 不传，DB 用 DEFAULT auth.uid() 填；只手动填昵称快照
      owner_name: report.owner_name ?? null,
    })
    .select();

  if (error) throw error;
  return data?.[0];
}

/** 读取当前用户的报告列表（RLS 自动过滤，无需手动 eq owner_id） */
export async function listReports(): Promise<CloudReportRow[]> {
  const { data, error } = await cloud()
    .database.from("reports")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as CloudReportRow[];
}

/** 删除一条报告（RLS 保证只能删自己的；返回是否真的删掉了） */
export async function deleteReport(id: number): Promise<boolean> {
  const { data, error } = await cloud()
    .database.from("reports")
    .delete()
    .eq("id", id)
    .select();

  if (error) throw error;
  // RLS 过滤导致删不到时，返回空数组，需显式区分「不存在」与「非本人」
  return Array.isArray(data) && data.length > 0;
}

// ─────────────────────────────────────────────────────────────
// 报告图片：上传 + 取展示 URL
// ─────────────────────────────────────────────────────────────

/**
 * 上传报告图片到 Storage，返回对象路径。
 * 使用 shared 路径：所有登录用户可读，仅 owner 可改/删（适合分享）。
 * 若只想本人可见，改用 cloud().storage.userPath(uid, ...)。
 */
export async function uploadReportImage(
  uid: string,
  imageBlob: Blob,
  extension = "png",
): Promise<string> {
  const path = cloud().storage.sharedPath(
    uid,
    `reports/${crypto.randomUUID()}.${extension}`,
  );
  const { error } = await cloud().storage.upload(path, imageBlob, {
    contentType: imageBlob.type || "image/png",
  });
  if (error) throw error;
  return path;
}

/**
 * 由对象路径生成短期签名 URL（默认 600 秒），用于 <img src> 展示。
 *
 * ⚠️ 文件隔离兜底（对应 reports_schema.sql 的「3.2」）：
 *   image_path 是前端可填写的字符串，RLS 管不到文件。因此换签名 URL 前
 *   必须校验：path 前缀必须等于「当前用户 id」，不匹配直接拒绝，
 *   绝不「拿到 path 就换 URL」，否则可能看到别人的报告图。
 */
export async function reportImageUrl(
  path: string,
  ttlSeconds = 600,
): Promise<string> {
  const user = await currentUser();
  if (!user) {
    throw new Error("请先登录后再查看报告图片");
  }

  // 路径必须落在当前用户名下（shared/<uid>/... 或 users/<uid>/...）
  const allowedPrefixes = [`shared/${user.id}/`, `users/${user.id}/`];
  const owned = allowedPrefixes.some((prefix) => path.startsWith(prefix));
  if (!owned) {
    // 越权路径：直接拒绝，不生成签名 URL
    throw new Error("无权访问该报告图片");
  }

  const { data, error } = await cloud().storage.createSignedUrl(path, ttlSeconds);
  if (error) throw error;
  // createSignedUrl 返回 { signedUrl: string }，不是裸字符串
  return data.signedUrl;
}

// ─────────────────────────────────────────────────────────────
// 高层编排：生成报告一条龙
// ─────────────────────────────────────────────────────────────

/**
 * 完整流程：登录校验 → 上传图片 → 写报告记录 → 返回报告行。
 * 调用方在 catch 中处理「未登录」「网络失败」「配额」等错误。
 */
export async function publishReport(params: {
  fileName: string;
  riskLevel: RiskLevel;
  aiProbability: number;
  imageBlob: Blob;
}): Promise<CloudReportRow> {
  const user = await currentUser();
  if (!user) {
    throw new Error("请先登录后再生成报告");
  }

  const imagePath = await uploadReportImage(user.id, params.imageBlob);

  return createReport({
    file_name: params.fileName,
    risk_level: params.riskLevel,
    ai_probability: params.aiProbability,
    image_path: imagePath,
    owner_name: user.name ?? null,
  });
}

// ─────────────────────────────────────────────────────────────
// 错误处理提示（供 UI 层复用）
// ─────────────────────────────────────────────────────────────

/** 把常见错误码转成用户可读提示 */
export function describeCloudError(error: unknown): string {
  const code = (error as { code?: string })?.code;
  switch (code) {
    case "42P01":
      return "报告表尚未创建，请先在云服务管理面板执行建表脚本。";
    case "42501":
      return "没有权限执行该操作。";
    case "23505":
      return "该记录已存在。";
    default:
      return "云端操作失败，请稍后重试。";
  }
}
