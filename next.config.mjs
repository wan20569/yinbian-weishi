/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /**
   * 注意：不要再加 outputFileTracing: false。
   * 它放在顶层是无效配置（Next 14 会警告），并会让构建期的 trace 落盘异常，
   * 表现为 `EPERM: operation not permitted, open '.next/trace'`，构建直接中断。
   */

  /**
   * 把同源的 /api/infer 反向代理到本地推理服务。
   *
   * 这样浏览器只请求 http://localhost:3000/api/infer，于是：
   *   - 不产生跨域：源、端口、协议都和页面一致，浏览器不会发预检，也不需要 CORS 头
   *   - 不会触发混合内容拦截：即使以后前端部署在 https，这个请求对浏览器而言仍是同源的，
   *     真正的 http://127.0.0.1:8000 只在 Node 侧发起
   *   - 换后端地址只改一个环境变量 INFERENCE_ORIGIN，前端代码不用动
   *
   * 注意：rewrite 是服务端行为，只影响 dev / next start，不影响 next export 静态导出。
   */
  async rewrites() {
    const origin = process.env.INFERENCE_ORIGIN || "http://127.0.0.1:8000";
    return [
      {
        source: "/api/infer",
        destination: `${origin}/api/detect`,
      },
      {
        source: "/api/health",
        destination: `${origin}/api/health`,
      },
    ];
  },
};

export default nextConfig;
