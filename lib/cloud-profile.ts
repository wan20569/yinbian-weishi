/**
 * ─────────────────────────────────────────────────────────────
 *  用户资料（昵称 / 头像）· 云服务数据访问层
 * ─────────────────────────────────────────────────────────────
 *  背景：云服务 Auth SDK 没有更新昵称/头像的 API，因此用户资料由应用
 *  自建 profiles 表承载（见 server/profiles_schema.sql）。头像文件存
 *  Storage 的 users/<uid>/avatar/...，本文件只读写对象路径。
 *
 *  安全红线：
 *   - owner_id 归属：insert 不传，靠数据库 DEFAULT auth.uid() 自动填；
 *     upsert 因需要冲突键而显式传 owner_id，值取自当前 session（= auth.uid()），
 *     仍受 INSERT WITH CHECK (owner_id = auth.uid()) 保护，前端无法伪造成他人。
 *   - 换头像签名 URL 前校验路径前缀必须等于当前用户 id，防越权看图
 *   - 不打印昵称以外的隐私信息到日志
 */

"use client";

import { createWorkBuddyCloud } from "@tencent-ai/workbuddy-cloud-sdk";

import { cloudPublicConfig } from "./cloud-config";

// ─────────────────────────────────────────────────────────────
// 类型
// ─────────────────────────────────────────────────────────────

/** profiles 表的一行（与 profiles_schema.sql 对应） */
export interface ProfileRow {
  owner_id: string;
  name: string | null;
  avatar_path: string | null;
  updated_at: string;
}

/** 供 UI 消费的归一化资料 */
export interface UserProfile {
  name: string;
  avatarPath: string | null;
}

/** profiles 表的数据库 Schema，用于 database.from("profiles") 类型推断 */
export interface ProfileDatabaseSchema {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: { name?: string | null; avatar_path?: string | null };
        Update: { name?: string | null; avatar_path?: string | null };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}

// ─────────────────────────────────────────────────────────────
// SDK 客户端（单例）
// ─────────────────────────────────────────────────────────────

let profileClient: ReturnType<typeof createWorkBuddyCloud<ProfileDatabaseSchema>> | null = null;

function cloud() {
  if (!profileClient) {
    profileClient = createWorkBuddyCloud<ProfileDatabaseSchema>({
      endpoint: cloudPublicConfig.endpoint,
      oauthRelayBaseUrl: cloudPublicConfig.oauthRelayBaseUrl,
      publishableKey: cloudPublicConfig.publishableKey,
    });
  }
  return profileClient;
}

/** 拿当前登录用户 id；未登录返回 null */
async function currentUid(): Promise<string | null> {
  const { data: session, error } = await cloud().auth.getSession();
  if (error || !session) return null;
  return session.user.id;
}

// ─────────────────────────────────────────────────────────────
// 读取 / 写入
// ─────────────────────────────────────────────────────────────

/** 读当前用户资料；未登录或尚无记录返回 null（UI 回落 session 兜底） */
export async function getProfile(): Promise<UserProfile | null> {
  const uid = await currentUid();
  if (!uid) return null;

  const { data, error } = await cloud()
    .database.from("profiles")
    .select("name, avatar_path")
    .eq("owner_id", uid)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return { name: data.name ?? "", avatarPath: data.avatar_path };
}

/** 更新昵称（不存在则自动创建一行）。返回更新后的资料。 */
export async function updateName(name: string): Promise<UserProfile> {
  const uid = await currentUid();
  if (!uid) throw new Error("请先登录后再修改昵称");

  const trimmed = name.trim();
  // .select() 让 upsert 直接返回写入后的行，省掉「写完再 getProfile」的额外会话+查询
  // updated_at 不传：INSERT 由 DEFAULT now() 填、UPDATE 由触发器填，避免客户端时钟偏移
  const { data, error } = await cloud()
    .database.from("profiles")
    .upsert(
      { owner_id: uid, name: trimmed },
      { onConflict: "owner_id" },
    )
    .select("name, avatar_path")
    .maybeSingle();

  if (error) throw error;
  return { name: data?.name ?? trimmed, avatarPath: data?.avatar_path ?? null };
}

/**
 * 上传头像图片到 Storage，并回写 profiles.avatar_path。
 * 返回头像对象路径（相对），供头像 URL 换签。
 *
 * 头像统一放 users/<uid>/avatar/ 下，只本人可见（不对外共享）。
 * 每次用新的 uuid 路径（而非固定路径覆盖）：这样 avatar_path 会变，
 * UserAvatar 依赖 [avatarPath] 的签名副作用才会重跑、显示新头像；固定路径
 * 字符串不变会导致组件不重签、换头像后仍显示旧图。代价是要主动清理旧对象，
 * 否则每换一次头像就在 Storage 里留一个孤儿文件。
 */
export async function updateAvatar(imageBlob: Blob, extension = "jpg"): Promise<UserProfile> {
  const uid = await currentUid();
  if (!uid) throw new Error("请先登录后再更换头像");

  // 先读旧头像路径，写库成功后清理，避免孤儿文件（RLS 自动限定为本人行）
  const { data: old } = await cloud()
    .database.from("profiles")
    .select("avatar_path")
    .eq("owner_id", uid)
    .maybeSingle();
  const oldPath = old?.avatar_path ?? null;

  const path = cloud().storage.userPath(uid, `avatar/${crypto.randomUUID()}.${extension}`);
  const { error: uploadError } = await cloud().storage.upload(path, imageBlob, {
    contentType: imageBlob.type || "image/jpeg",
  });
  if (uploadError) throw uploadError;

  const { data, error } = await cloud()
    .database.from("profiles")
    .upsert(
      { owner_id: uid, avatar_path: path },
      { onConflict: "owner_id" },
    )
    .select("name, avatar_path")
    .maybeSingle();
  if (error) throw error;

  // 删旧对象：best-effort，DB 已指向新路径，删失败只记日志、不阻塞
  if (oldPath && oldPath !== path) {
    const { error: removeError } = await cloud().storage.remove([oldPath]);
    if (removeError) {
      console.warn("[profile] 旧头像清理失败（已忽略）：", removeError.message);
    }
  }

  // 路径已变，清掉可能残留的签名 URL 缓存（含旧路径条目）
  clearAvatarUrlCache();

  return { name: data?.name ?? "", avatarPath: data?.avatar_path ?? path };
}

// ─────────────────────────────────────────────────────────────
// 头像展示 URL
// ─────────────────────────────────────────────────────────────

/**
 * 由头像对象路径生成短期签名 URL（用于 <img src>）。
 *
 * ⚠️ 文件隔离兜底：avatar_path 是前端可填写的字符串，换签前必须校验
 *   path 前缀等于当前用户 id（users/<uid>/...），不匹配直接拒绝。
 *
 * 缓存策略（省掉组件每次挂载都重签）：
 *   · 按 `${uid}:${path}` 存内存，过期时间 = now + ttl - 60s（留 60s 余量，
 *     确保缓存到期早于 URL 到期，杜绝复用到已失效 URL 而裂图）。
 *   · in-flight 单飞：同一 path 并发挂载（如 profile 页两个 UserAvatar）只签一次。
 *   · 只存内存、绝不落 localStorage——签名 URL 是「持有即可访问」的凭证，落盘等于延长暴露。
 *   · 登出 / 换头像时调用 clearAvatarUrlCache() 失效。
 */
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
const signedUrlInflight = new Map<string, Promise<string>>();

export async function avatarUrl(path: string, ttlSeconds = 600): Promise<string> {
  const uid = await currentUid();
  if (!uid) throw new Error("请先登录后再查看头像");

  const allowedPrefix = `users/${uid}/`;
  if (!path.startsWith(allowedPrefix)) {
    throw new Error("无权访问该头像");
  }

  const key = `${uid}:${path}`;
  const cached = signedUrlCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const pending = signedUrlInflight.get(key);
  if (pending) return pending;

  const task = (async () => {
    const { data, error } = await cloud().storage.createSignedUrl(path, ttlSeconds);
    if (error) throw error;
    signedUrlCache.set(key, {
      url: data.signedUrl,
      expiresAt: Date.now() + (ttlSeconds - 60) * 1000,
    });
    return data.signedUrl;
  })().finally(() => signedUrlInflight.delete(key));

  signedUrlInflight.set(key, task);
  return task;
}

/** 失效全部签名 URL 缓存：登出、换头像后调用，避免复用旧凭证 / 跨会话残留。 */
export function clearAvatarUrlCache(): void {
  signedUrlCache.clear();
  signedUrlInflight.clear();
}

/** 把图片 Blob 压缩成 ≤ 512×512 的 JPEG，避免头像原图过大。返回新 Blob。 */
export async function normalizeAvatar(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const maxSide = 512;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("浏览器不支持图片处理");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85),
  );
  if (!blob) throw new Error("图片处理失败");
  return blob;
}
