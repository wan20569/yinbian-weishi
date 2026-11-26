-- =====================================================================
--  音辩卫士 · 用户资料云数据库建表脚本
--  用途：把「昵称 / 头像」持久化到 WorkBuddy 云服务（托管 PostgreSQL）。
--
--  背景：云服务 Auth SDK 目前没有更新用户资料（昵称/头像）的 API，
--  因此用户资料由应用自建 profiles 表承载；头像文件存 Storage，
--  本表只存对象路径。登录态里的 session.user.name / avatarUrl 只作
--  兜底展示，实际以本表为准（lib/cloud-auth.ts 的 useAuth 会合并）。
--
--  执行方式：在 WorkBuddy 云服务「数据库」管理面板中执行本脚本，
--  或通过 management 流程创建表与 RLS 策略。前端代码不写 DDL。
--
--  核心约定：
--   1. owner_id 用 TEXT PRIMARY KEY —— 一个用户一行，auth.uid() 返回文本
--   2. 前端【永不传 owner_id】；DEFAULT auth.uid() 自动填，RLS 负责隔离
--   3. avatar_path 只存对象路径，图片本体在 Storage（users/<uid>/avatar/...）
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. 用户资料表（一人一行，owner_id 即用户 id）
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    -- 主键 + 所有者：一个登录用户对应且仅对应一行
    owner_id      TEXT        PRIMARY KEY DEFAULT auth.uid(),
    -- 昵称：用户可自由修改，仅作展示，不参与任何鉴权判断
    name          TEXT,
    -- 头像对象路径（如 users/<uid>/avatar/xxxx.png）
    -- ⚠️ 只存路径，合法性由「换签名 URL 时」的前端校验兜底（见文件末尾）
    avatar_path   TEXT,
    -- 最近一次更新（改名 / 换头像都刷新）
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 2. 行级安全（RLS）策略 —— 按用户隔离
-- ---------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ⚠️ 必须先 GRANT 到 authenticated, anon，再建策略。漏掉 GRANT 会得到
--    形似策略失效的 42501（表授权与行策略是两道独立门）。
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated, anon;

-- 读：只能读自己的资料
CREATE POLICY profiles_select_own
    ON public.profiles
    FOR SELECT
    TO authenticated, anon
    USING (owner_id = auth.uid());

-- 写：只能插入自己的一行（配合 DEFAULT auth.uid()）
CREATE POLICY profiles_insert_own
    ON public.profiles
    FOR INSERT
    TO authenticated, anon
    WITH CHECK (owner_id = auth.uid());

-- 改：只能改自己的一行（改名 / 换头像都走 update）
CREATE POLICY profiles_update_own
    ON public.profiles
    FOR UPDATE
    TO authenticated, anon
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- 删：只能删自己的一行（注销 / 清空资料用；RLS 默认拒绝 DELETE，需显式放行）
CREATE POLICY profiles_delete_own
    ON public.profiles
    FOR DELETE
    TO authenticated, anon
    USING (owner_id = auth.uid());

-- ---------------------------------------------------------------------
-- 2.1 updated_at 交给数据库掌管（BEFORE UPDATE 触发器）
--
--   列上的 DEFAULT now() 只在 INSERT 生效；upsert 命中已存在行时走 UPDATE
--   分支，DEFAULT 不会再触发。用触发器在每次 UPDATE 时统一写 now()，前端就
--   不必传 updated_at，也就不会被客户端时钟偏移污染。
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.profiles_touch_updated_at()
    RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_touch_updated_at ON public.profiles;
CREATE TRIGGER profiles_touch_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.profiles_touch_updated_at();

-- ---------------------------------------------------------------------
-- 3. 文件隔离兜底 —— 与 reports 一致
--
--   RLS 只保证「A 读不到 B 的 profiles 行」，管不到 Storage 里的头像文件：
--   avatar_path 是前端可填写的字符串。因此换签名 URL 前必须校验路径前缀
--   等于当前用户 id（users/<uid>/...），不匹配直接拒绝，绝不「拿到路径
--   就换 URL」。（lib/cloud-profile.ts 的 avatarUrl() 已内置该校验。）
-- ---------------------------------------------------------------------
