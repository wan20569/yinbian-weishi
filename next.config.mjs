/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /**
   * 纯前端 Demo：关闭生产构建的文件追踪。
   * 关闭后不再写 .next/trace，构建产物更小，也避免部分环境下对该文件的写入限制。
   */
  outputFileTracing: false,
};

export default nextConfig;
