"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";

import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/cloud-auth";
import { normalizeAvatar, updateAvatar, updateName } from "@/lib/cloud-profile";

export interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 「编辑个人信息」弹窗：昵称 + 头像，统一保存。
 * 头像选择后仅本地预览（previewUrl），点「保存」才真正上传；
 * 昵称与头像在同一次保存里提交，点击取消/关闭则全部丢弃。
 */
export function EditProfileDialog({ open, onOpenChange }: EditProfileDialogProps) {
  const { user, refresh } = useAuth();
  const { toast } = useToast();

  const [nameDraft, setNameDraft] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 弹窗打开时，把草稿对齐到当前值
  useEffect(() => {
    if (open) {
      setNameDraft(user?.name ?? "");
      setPendingFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open, user?.name]);

  // 关闭时释放预览 blob
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const pickAvatar = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "请选择图片文件", variant: "destructive" });
      return;
    }
    // 释放上一张预览，避免泄漏
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    const nextName = nameDraft.trim();
    if (!nextName) {
      toast({ title: "昵称不能为空", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // 有头像变更才传头像；昵称始终提交
      const tasks: Promise<unknown>[] = [updateName(nextName)];
      if (pendingFile) {
        const normalized = await normalizeAvatar(pendingFile);
        tasks.push(updateAvatar(normalized, "jpg"));
      }
      await Promise.all(tasks);
      await refresh();
      onOpenChange(false);
      toast({
        title: "资料已更新",
        description: pendingFile ? "昵称与头像均已保存" : "昵称已更新",
      });
    } catch (error) {
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑个人信息</DialogTitle>
          <DialogDescription>修改昵称和头像，保存后立即生效。</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          {/* 头像预览 + 更换入口 */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group relative grid place-items-center rounded-full outline-none"
            aria-label="更换头像"
          >
            <UserAvatar
              className="h-20 w-20 ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
              name={user?.name}
              email={user?.email}
              avatarPath={user?.avatarPath ?? null}
              avatarUrl={user?.avatarUrl ?? null}
              previewUrl={previewUrl}
            />
            <span className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full border border-border bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-110">
              <Upload className="h-3.5 w-3.5" />
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => pickAvatar(event.target.files?.[0])}
          />
          <p className="text-[11px] text-muted-foreground">点击头像更换，支持 JPG / PNG</p>

          {/* 昵称 */}
          <label className="w-full space-y-1.5 text-left">
            <span className="text-[12px] font-medium text-foreground">昵称</span>
            <Input
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              maxLength={24}
              placeholder="输入昵称"
              autoFocus
            />
          </label>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            取消
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? "保存中…" : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
