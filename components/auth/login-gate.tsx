"use client";

import * as React from "react";
import { Loader2, Mail, MessageSquareText, ShieldCheck, CloudUpload, Lock, RefreshCw, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuroraBackground } from "@/components/workbench/aurora-background";
import {
  sendEmailOtp,
  verifyEmailOtp,
  type OtpChallenge,
} from "@/lib/cloud-auth";
import { startOAuthLogin } from "@/lib/cloud-oauth";

// ─────────────────────────────────────────────────────────────
// 全局登录墙（入口级渲染开关）
//
// 未登录用户只看到本页，登录后进入完整工作台。这是「体验层」的入口门：
// 数据隔离由 RLS + Storage 策略在服务端强制，与这堵墙是否存在无关——
// 即使有人绕过本页直接调数据接口，也拿不到别人的报告。
//
// 价值说明不能是「裸墙」：要讲清楚为什么值得注册，而不是一句「请先登录」。
// ─────────────────────────────────────────────────────────────

type Step = "email" | "code";

const VALUE_POINTS = [
  {
    icon: CloudUpload,
    title: "云端保存",
    desc: "检测报告与存证记录永久保存在云端，换设备也不丢失。",
  },
  {
    icon: Lock,
    title: "按账号隔离",
    desc: "你的报告只属于你的账号，他人无法查看或篡改。",
  },
  {
    icon: RefreshCw,
    title: "随时回看",
    desc: "历史检测结果、置信度与证据链，登录即可一键回溯。",
  },
  {
    icon: Users,
    title: "多设备同步",
    desc: "工作台、报告中心在任意设备登录后自动同步。",
  },
] as const;

export function LoginGate({ onSuccess }: { onSuccess?: () => void }) {
  const [step, setStep] = React.useState<Step>("email");
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [challenge, setChallenge] = React.useState<OtpChallenge | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [oauthBusy, setOauthBusy] = React.useState<"wechat" | "workbuddy" | null>(null);
  const [oauthError, setOauthError] = React.useState<string | null>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSend = async () => {
    if (!emailValid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await sendEmailOtp(email.trim());
      setChallenge(res);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送验证码失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    if (!challenge || code.trim().length < 4 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await verifyEmailOtp({
        verificationId: challenge.verificationId,
        token: code.trim(),
        email: email.trim(),
        isExistingUser: challenge.isExistingUser,
      });
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "验证码校验失败，请重试");
    } finally {
      setBusy(false);
    }
  };

  const handleOAuth = async (provider: "wechat" | "workbuddy") => {
    if (oauthBusy) return;
    setOauthBusy(provider);
    setOauthError(null);
    try {
      await startOAuthLogin(provider);
      // 成功后页面会跳走
    } catch (err) {
      setOauthError(
        err instanceof Error
          ? err.message
          : "微信 / WorkBuddy 登录需在已注册的线上域名使用"
      );
    } finally {
      setOauthBusy(null);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <AuroraBackground />

      <div className="relative z-10 grid w-full max-w-[960px] overflow-hidden rounded-2xl border border-border bg-card shadow-lift lg:grid-cols-2">
        {/* 左：品牌 + 价值说明 */}
        <div className="hidden flex-col justify-between bg-gradient-to-br from-primary/10 via-card to-card p-8 lg:flex">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[16px] font-semibold leading-none text-foreground">
                  音辩卫士
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  AI 音乐鉴别与版权溯源平台
                </p>
              </div>
            </div>

            <h2 className="mt-8 text-[20px] font-semibold leading-snug text-foreground">
              登录音辩卫士，
              <br />
              云端保存你的检测报告与存证记录，
              <br />
              随时回看、按账号隔离。
            </h2>

            <div className="mt-8 space-y-5">
              {VALUE_POINTS.map((point) => {
                const Icon = point.icon;
                return (
                  <div key={point.title} className="flex gap-3">
                    <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-foreground">
                        {point.title}
                      </p>
                      <p className="mt-0.5 text-[12px] leading-5 text-muted-foreground">
                        {point.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="mt-8 text-[11px] leading-5 text-muted-foreground">
            登录即代表你同意服务条款与隐私政策
          </p>
        </div>

        {/* 右：登录表单 */}
        <div className="p-8">
          {/* 小屏品牌头（lg 以上隐藏，因为左栏已展示） */}
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-foreground">音辩卫士</p>
              <p className="text-[11px] text-muted-foreground">
                登录后云端保存检测报告与存证记录
              </p>
            </div>
          </div>

          {step === "email" ? (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-foreground">
                  邮箱地址
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    className="h-10 pl-10"
                  />
                </div>
              </div>

              {error ? (
                <p className="text-[12px] leading-5 text-destructive">{error}</p>
              ) : null}

              <Button
                className="h-10 w-full"
                disabled={!emailValid || busy}
                onClick={handleSend}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                发送验证码
              </Button>

              <p className="text-center text-[11px] leading-5 text-muted-foreground">
                验证码将发送至你的邮箱
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-foreground">
                  输入 6 位验证码
                </label>
                <div className="relative">
                  <MessageSquareText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="6 位数字"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                    className="h-10 pl-10 tracking-[0.3em]"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  已发送至 <span className="text-foreground">{email.trim()}</span>
                  {challenge?.isExistingUser ? "（老用户，将直接登录）" : "（新账号，将自动注册）"}
                </p>
              </div>

              {error ? (
                <p className="text-[12px] leading-5 text-destructive">{error}</p>
              ) : null}

              <Button
                className="h-10 w-full"
                disabled={code.trim().length < 4 || busy}
                onClick={handleVerify}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {challenge?.isExistingUser ? "登录" : "注册并登录"}
              </Button>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                    setChallenge(null);
                    setError(null);
                  }}
                >
                  更换邮箱
                </button>
                <button
                  type="button"
                  className="text-[11px] text-primary transition-colors hover:underline"
                  onClick={handleSend}
                  disabled={busy}
                >
                  重新发送
                </button>
              </div>
            </div>
          )}

          {/* 分隔 */}
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[10px] text-muted-foreground">其他登录方式</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          {/* 备选登录方式 */}
          <div className="space-y-2">
            <Button
              variant="outline"
              className="h-10 w-full"
              disabled={oauthBusy !== null}
              onClick={() => handleOAuth("wechat")}
            >
              {oauthBusy === "wechat" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              微信登录
            </Button>
            <Button
              variant="outline"
              className="h-10 w-full"
              disabled={oauthBusy !== null}
              onClick={() => handleOAuth("workbuddy")}
            >
              {oauthBusy === "workbuddy" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              WorkBuddy 账号登录
            </Button>
          </div>

          {oauthError ? (
            <p className="mt-2 text-[12px] leading-5 text-destructive">{oauthError}</p>
          ) : null}

          <p className="mt-3 rounded-lg bg-secondary/50 px-3 py-2 text-[11px] leading-5 text-muted-foreground">
            提示：邮箱、微信、WorkBuddy 账号是相互独立的账号，报告数据互不相通。请固定使用同一种方式登录。
          </p>
        </div>
      </div>
    </div>
  );
}
