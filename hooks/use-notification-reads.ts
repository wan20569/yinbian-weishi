"use client";

import * as React from "react";

import {
  countUnread,
  loadReadIds,
  mockNotifications,
  saveReadIds,
} from "@/lib/notifications";

/**
 * 通知已读状态的唯一实现，下拉面板与 /notifications 页面共用。
 *
 * readIds 初始为 null（不是 []）：服务端渲染与首帧客户端渲染都按「全部未读」输出，
 * 挂载后再从 localStorage 收敛，避免 hydration mismatch。
 */
export function useNotificationReads() {
  const [readIds, setReadIds] = React.useState<string[] | null>(null);

  React.useEffect(() => {
    setReadIds(loadReadIds());
  }, []);

  const isUnread = React.useCallback(
    (id: string) => (readIds === null ? true : !readIds.includes(id)),
    [readIds]
  );

  const markRead = React.useCallback((id: string) => {
    setReadIds((prev) => {
      const base = prev ?? [];
      if (base.includes(id)) return base;
      const next = [...base, id];
      saveReadIds(next);
      return next;
    });
  }, []);

  const markAllRead = React.useCallback(() => {
    const ids = mockNotifications.map((item) => item.id);
    setReadIds(ids);
    saveReadIds(ids);
  }, []);

  return {
    readIds,
    isUnread,
    markRead,
    markAllRead,
    unreadCount: countUnread(readIds),
  };
}
