/**
 * ─────────────────────────────────────────────────────────────
 *  云服务公开配置（publicConfig）
 * ─────────────────────────────────────────────────────────────
 *  这三个值来自 workbuddy_cloud_service 激活时返回的 publicConfig，
 *  属于「公开配置」，可以安全放在前端代码里：
 *   - endpoint           数据面地址（客户端初始化必填）
 *   - oauthRelayBaseUrl  OAuth 中转地址（微信/WorkBuddy 账号登录用）
 *   - publishableKey     应用标识（无权限，服务端靠 Origin 精确匹配校验）
 *
 *  环境 ID、各类服务端密钥都留在平台侧，绝不进前端。
 *  不要把 token、手机号、邮箱、私密文件 URL 写进任何日志。
 */

export interface CloudPublicConfig {
  endpoint: string;
  oauthRelayBaseUrl: string;
  publishableKey: string;
}

export const cloudPublicConfig: CloudPublicConfig = {
  endpoint: "https://wbapp-ikn0vnzyagy3t8lt3rhb4o.app.workbuddy.host",
  oauthRelayBaseUrl: "https://www.workbuddy.cn/v2/as/genie-baas/oauth",
  publishableKey:
    "wbpk_IKn0vNZYAgY3t8lT3RHb4o_n4XgstdgtXvqxiTuTTdzQ6in0tiTQXWa",
};
