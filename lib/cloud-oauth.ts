/**
 * ─────────────────────────────────────────────────────────────
 *  OAuth 登录回调处理（微信扫码 / WorkBuddy 账号）
 * ─────────────────────────────────────────────────────────────
 *  不建独立 /auth/callback 页：redirectTo 服务端按已登记域名精确匹配，
 *  新建子路径大概率未登记 → 400。回调一律回站点根，由工作台页顶层 effect
 *  在启动时无条件调用一次本模块，完成 code/state → session 的兑换。
 *
 *  关键约束（均来自 SDK 注释，切勿改动）：
 *   1. 按 URL 的 provider 参数分发，不盲调两个 handler：
 *      - handleWechatWebCallback 遇到非 wechat 回调会报错
 *      - handleWorkBuddyCallback 对普通访问返回 {data:null,error:null}（非失败）
 *   2. 兑换成功后 history.replaceState 清掉 code/state/provider，保留业务参数
 *   3. WorkBuddy 是 PKCE：必须用户手势同标签页 location.assign，禁 window.open
 *   4. localhost 非注册域名，微信/WorkBuddy 本地必然失败，仅邮箱 OTP 可本地实测
 */

"use client";

import { createWorkBuddyCloud } from "@tencent-ai/workbuddy-cloud-sdk";

import { cloudPublicConfig } from "./cloud-config";

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

/** OAuth 回调要清理的参数（保留 ?view= 等业务参数） */
const OAUTH_PARAMS = ["code", "state", "provider"] as const;

export type OAuthProvider = "wechat" | "workbuddy";

/**
 * 判断当前是否运行在「已注册的线上域名」。
 *
 * OAuth 的 redirectTo 由服务端按已登记域名精确匹配，本地 localhost / 127.0.0.1
 * 这类地址不在登记列表里，微信/WorkBuddy 登录必然失败。注意：**部署到新域名
 * 不等于已注册**——未在应用后台登记的域名同样会失败。
 *
 * 本函数只在事件处理器（用户点击）里调用，不在渲染期读 window，因此对 SSR /
 * hydration 安全。
 */
function isRegisteredDomain(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  // 本地环回地址与局域网 IP 一律视为未注册（不可能在应用后台登记）
  const local = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
  ];
  if (local.includes(host)) return false;
  // 其余（含已部署的线上域名）交由服务端精确匹配决定，不在此臆断
  return true;
}

/** 从当前 URL 读 provider 参数；非法值返回 null（视作普通访问） */
function readProvider(search: string): OAuthProvider | null {
  const params = new URLSearchParams(search);
  const provider = params.get("provider");
  return provider === "wechat" || provider === "workbuddy" ? provider : null;
}

export interface OAuthCallbackResult {
  /** 是否真的完成了一次 OAuth 兑换 */
  handled: boolean;
  /** 兑换成功（已建立会话） */
  success: boolean;
  /** 失败时的错误信息（success=false 时有值） */
  error?: string;
}

/**
 * 处理一次 OAuth 回调（若有）。工作台页顶层启动时无条件调用一次。
 *
 * - 无 provider 参数 → 返回 { handled:false }，调用方照常渲染未登录态即可
 * - 有 provider 且兑换成功 → 清 URL 参数，返回 { handled:true, success:true }
 * - 有 provider 但失败（拒绝授权/缺证明/参数非法）→ 清 URL，返回 error 供展示
 */
export async function handleOAuthCallback(search = window.location.search): Promise<OAuthCallbackResult> {
  const provider = readProvider(search);
  if (!provider) {
    return { handled: false, success: false };
  }

  const { data, error } =
    provider === "wechat"
      ? await client().auth.handleWechatWebCallback(search)
      : await client().auth.handleWorkBuddyCallback(search);

  // 无论成败都清掉 OAuth 参数，避免刷新时重复兑换（handler 已保证幂等，但
  // 清掉更干净，也避免用户把带 code 的 URL 收藏下来）。
  const url = new URL(window.location.href);
  for (const key of OAUTH_PARAMS) url.searchParams.delete(key);
  window.history.replaceState(null, "", url);

  if (error) {
    return { handled: true, success: false, error: error.message ?? "登录失败，请重试" };
  }
  if (!data) {
    // 理论上 provider 存在但 code 缺失时会返回 data:null（落地页被直接访问）
    return { handled: true, success: false, error: "登录回调缺少授权信息，请重新登录" };
  }

  return { handled: true, success: true };
}

/**
 * 发起第三方登录（用户手势触发，同标签页跳转）。
 *
 * ⚠️ 必须由用户点击触发、同一标签页 location.assign：
 *   WorkBuddy 的 PKCE 证明存在当前标签页 sessionStorage，另开标签页/新窗口
 *   读不到 verifier，兑换必然失败。
 */
export async function startOAuthLogin(provider: OAuthProvider): Promise<void> {
  // 本地 / 未登记域名直接给准确提示，不发起必然失败的跳转。
  // 文案要讲清「注册」而非「部署」：部署到新域名但没在应用后台登记，照样失败。
  if (!isRegisteredDomain()) {
    throw new Error("微信 / WorkBuddy 登录需在已注册的线上域名使用");
  }

  // redirectTo 用站点根（origin + pathname），缺省即 SDK 默认行为；
  // 显式传根地址，符合「不建独立回调页」的策略。
  const back = new URL(window.location.origin + window.location.pathname);
  // 清掉可能残留的 OAuth 参数，避免与本次登录冲突
  for (const key of OAUTH_PARAMS) back.searchParams.delete(key);

  const { data, error } = await client().auth.signInWithOAuth({
    provider,
    redirectTo: back.toString(),
  });
  if (error || !data) {
    throw error ?? new Error("发起登录失败，请重试");
  }
  // 同一标签页跳转，不能 window.open
  window.location.assign(data.url);
}
