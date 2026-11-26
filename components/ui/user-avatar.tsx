"use client";

import * as React from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { avatarUrl as signAvatarUrl } from "@/lib/cloud-profile";

export function avatarText(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "音";
  return source.slice(0, 2).toUpperCase();
}

/**
 * 用户头像，显示优先级（高 → 低）：
 *   1. previewUrl   本地预览（编辑头像时的 blob URL）
 *   2. avatarPath   profiles 表的 Storage 路径，异步换签名 URL（600s 有效）
 *   3. avatarUrl    session 直链（第三方登录可能带）
 *   4. 首字母       avatarText 兜底
 *
 * 关键点：有 avatarPath 时只认它的签名结果，签名途中不回落到 session 直链，
 * 否则会先闪一下 provider 头像再跳到用户上传的头像。avatarPath 变化（换头像后
 * 路径是新的 uuid）会触发重签，因此换头像能即时刷新。
 */
export function UserAvatar({
  name,
  email,
  avatarPath,
  avatarUrl,
  previewUrl,
  className,
}: {
  name?: string | null;
  email?: string | null;
  /** profiles Storage 路径，需换签名 URL */
  avatarPath?: string | null;
  /** session 直链兜底（第三方登录） */
  avatarUrl?: string | null;
  /** 本地预览，优先级最高 */
  previewUrl?: string | null;
  className?: string;
}) {
  const [signedSrc, setSignedSrc] = React.useState<string | null>(null);
  const [retried, setRetried] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setSignedSrc(null);
    setRetried(false);
    if (!avatarPath) return;

    signAvatarUrl(avatarPath)
      .then((url) => {
        if (!cancelled) setSignedSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSignedSrc(null);
      });

    return () => {
      cancelled = true;
    };
  }, [avatarPath]);

  const src = previewUrl ?? (avatarPath ? signedSrc : avatarUrl) ?? null;

  const handleError = () => {
    // 仅当正在显示签名头像时重签一次（URL 可能已过期）；预览态不重签
    if (!retried && avatarPath && !previewUrl) {
      setRetried(true);
      signAvatarUrl(avatarPath)
        .then(setSignedSrc)
        .catch(() => setSignedSrc(null));
    } else {
      setSignedSrc(null);
    }
  };

  return (
    <Avatar className={className}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name ?? "头像"}
          className="h-full w-full object-cover"
          onError={handleError}
        />
      ) : (
        <AvatarFallback>{avatarText(name, email)}</AvatarFallback>
      )}
    </Avatar>
  );
}
