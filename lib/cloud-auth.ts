/**
 * ─────────────────────────────────────────────────────────────
 *  登录与身份 · 云服务封装
 * ─────────────────────────────────────────────────────────────
 *  只做「邮箱 OTP 登录」这一种主推方式，其余（微信 / WorkBuddy 账号）暂不在此
 *  实现。原因见 server/SECURITY.md 的账号策略：不同登录方式 = 不同 uid，报告
 *  互不可见，SDK 目前也没有账号绑定/合并 API，因此主推一种、其余作备选并明确
 *  提示用户固定使用同一种方式。
 *
 *  邮箱 OTP 流程（两步，对应 SDK 的 sendOtp / verifyOtp）：
 *    1. sendOtp({ email })     → 发验证码，返回 { verificationId, isExistingUser }
 *    2. verifyOtp({...})       → 验码，返回会话（老用户登录 / 新用户自动注册）
 *
 *  安全红线：
 *   - 不打印邮箱、验证码、token 到日志
 *   - 不把会话凭据落任何自定义存储（SDK 内部已处理）
 */

"use client";

import * as React from "react";
import { createWorkBuddyCloud, shouldClearCredentials } from "@tencent-ai/workbuddy-cloud-sdk";
import type { CloudSession } from "@tencent-ai/workbuddy-cloud-sdk";

import { cloudPublicConfig } from "./cloud-config";
import { clearAvatarUrlCache, getProfile } from "./cloud-profile";

// ─────────────────────────────────────────────────────────────
// 客户端单例（与 lib/cloud-reports.ts 共用同一套配置；独立创建也无妨，
// SDK 会话凭据在 localStorage / cookie，跨实例共享）
// ─────────────────────────────────────────────────────────────

let authClient: ReturnType<typeof createWorkBuddyCloud> | null = null;

function client() {
  if (!authClient) {
    authClient = createWorkBuddyCloud({
      endpoint: cloudPublicConfig.endpoint,
      oauthRelayBaseUrl: cloudPublicConfig.oauthRelayBaseUrl,
      publishableKey: cloudPublicConfig.publishableKey,
    });
  }
  return authClient;
}

// ─────────────────────────────────────────────────────────────
// 类型
// ─────────────────────────────────────────────────────────────

/** 当前登录用户（前端展示用，字段取自会话 + 云端 profiles 合并） */
export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  /** 头像对象路径（来自 profiles 表）；需要签名 URL 时用 cloud-profile.avatarUrl() */
  avatarPath?: string;
  /** session 兜底头像 URL（第三方登录时可能有直链） */
  avatarUrl?: string;
}

/** sendOtp 的返回（透传 SDK 关键字段） */
export interface OtpChallenge {
  verificationId: string;
  /** true = 老用户（登录）；false = 新用户（自动注册） */
  isExistingUser: boolean;
}

// ─────────────────────────────────────────────────────────────
// 会话读取
// ─────────────────────────────────────────────────────────────

function toAuthUser(session: CloudSession): AuthUser {
  return {
    id: session.user.id,
    name: session.user.name ?? "未命名用户",
    email: session.user.email,
    avatarUrl: session.user.avatarUrl,
  };
}

/** 读当前会话；未登录返回 null */
export async function fetchAuthUser(): Promise<AuthUser | null> {
  const { data: session, error } = await client().auth.getSession();
  if (error) {
    // 区分「确定未登录」与「临时故障（502/超时/断网）」：
    //   - shouldClearCredentials 为 true  → 凭据已失效，确实未登录，返回 null
    //   - 为 false（network / backend-unavailable 等）→ 临时故障，抛给上层重试，
    //     不能返回 null，否则会把已登录用户误判成未登录、弹出登录墙
    if (shouldClearCredentials(error)) return null;
    throw error;
  }
  if (!session) return null;
  return toAuthUser(session);
}

// ─────────────────────────────────────────────────────────────
// 邮箱 OTP 登录
// ─────────────────────────────────────────────────────────────

/** 第一步：发验证码。返回 verificationId 与是否老用户（决定验码后登录/注册） */
export async function sendEmailOtp(email: string): Promise<OtpChallenge> {
  const { data, error } = await client().auth.sendOtp({ email });
  if (error || !data) {
    throw error ?? new Error("发送验证码失败，请稍后重试");
  }
  return {
    verificationId: data.verificationId,
    isExistingUser: data.isExistingUser,
  };
}

/** 第二步：验码并登录（老用户）或自动注册（新用户）。返回登录后的用户 */
export async function verifyEmailOtp(params: {
  verificationId: string;
  token: string;
  email: string;
  isExistingUser: boolean;
}): Promise<AuthUser> {
  const { data, error } = await client().auth.verifyOtp({
    verificationId: params.verificationId,
    token: params.token,
    email: params.email,
    isExistingUser: params.isExistingUser,
  });
  if (error || !data) {
    throw error ?? new Error("验证码校验失败，请重试");
  }
  return toAuthUser(data);
}

/** 退出登录（无条件清本地，断网也能退） */
export async function signOut(): Promise<void> {
  await client().auth.signOut();
  // 签名 URL 是「持有即可访问」的凭证，登出必须清空，避免残留进下一个会话
  clearAvatarUrlCache();
}

// ─────────────────────────────────────────────────────────────
// React Hook：登录态
// ─────────────────────────────────────────────────────────────

/** 内部 state：只放会被 setState 更新的字段（refresh 在返回时附加） */
interface AuthStateData {
  /** 尚未初始化完成（首屏，避免登录态闪烁） */
  loading: boolean;
  user: AuthUser | null;
  /**
   * 初始化时遇到临时故障（token 接口 502/超时/断网），无法确定登录态。
   * 与「确定未登录（user === null 且 initError === null）」区分：这种时候
   * 不急着弹登录墙，而是给「重试」入口，避免把已登录用户误判成未登录。
   */
  initError: string | null;
}

export interface AuthState extends AuthStateData {
  /** 主动重拉会话 + 云端资料，改名/换头像后调用 */
  refresh: () => Promise<void>;
  /** 初始化失败后手动重试（重新探测登录态） */
  retry: () => Promise<void>;
}

/**
 * 订阅登录态。挂载时回放一次 INITIAL_SESSION，之后跟随 onAuthStateChange。
 * 返回 { user, loading, initError, refresh, retry }；登录/登出后无需手动刷新。
 *
 * user 字段会合并云端 profiles 表的昵称/头像（若有），优先于 session 的
 * 兜底值 —— SDK 没有更新资料 API，昵称/头像以 profiles 表为准。
 * 改名 / 换头像后调用 refresh() 即时同步（getUser() 也会在下次会话生效）。
 */
export function useAuth(): AuthState {
  const [state, setState] = React.useState<AuthStateData>({
    loading: true,
    user: null,
    initError: null,
  });

  // 把 session 用户与云端 profiles 合并；profiles 缺省时回落 session 兜底
  const applyProfile = React.useCallback(async (base: AuthUser | null) => {
    if (!base) {
      setState({ loading: false, user: null, initError: null });
      return;
    }
    try {
      const profile = await getProfile();
      setState({
        loading: false,
        initError: null,
        user: {
          ...base,
          name: profile?.name?.trim() || base.name,
          // avatarPath 只放 profiles 的 Storage 路径；session 直链保留在 base.avatarUrl，
          // 两条通道分开，由 UserAvatar 按「签名头像 > 直链 > 首字母」兜底（勿混入此处）
          avatarPath: profile?.avatarPath ?? undefined,
        },
      });
    } catch {
      // 拉取 profiles 失败（如建表前）不阻塞登录，回落 session 兜底
      setState({ loading: false, initError: null, user: base });
    }
  }, []);

  const refresh = React.useCallback(async () => {
    try {
      const base = await fetchAuthUser();
      await applyProfile(base);
    } catch {
      // 临时故障：保留上一次已知登录态，标记 initError 供 UI 提示重试
      setState((prev) => ({ ...prev, loading: false, initError: "登录状态暂不可用，请稍后重试" }));
    }
  }, [applyProfile]);

  const retry = React.useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, initError: null }));
    await refresh();
  }, [refresh]);

  React.useEffect(() => {
    let cancelled = false;

    const apply = (user: AuthUser | null) => {
      if (cancelled) return;
      void applyProfile(user);
    };

    // 初始化探测：临时故障（fetchAuthUser 抛错）时不能直接判未登录
    fetchAuthUser()
      .then(apply)
      .catch(() => {
        if (cancelled) return;
        setState({ loading: false, user: null, initError: "登录状态暂不可用，请稍后重试" });
      });

    const unsubscribe = client().auth.onAuthStateChange((_event, session) => {
      apply(session ? toAuthUser(session) : null);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [applyProfile]);

  return { ...state, refresh, retry };
}
