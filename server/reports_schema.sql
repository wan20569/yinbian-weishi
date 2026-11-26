-- =====================================================================
--  音辩卫士 · 检测报告云数据库建表脚本
--  用途：把「检测报告」持久化到 WorkBuddy 云服务（托管 PostgreSQL）。
--
--  执行方式：在 WorkBuddy 云服务「数据库」管理面板中执行本脚本，
--  或通过 management 流程创建表与 RLS 策略。前端代码不写 DDL。
--
--  核心约定：
--   1. owner_id 用 TEXT DEFAULT auth.uid() —— auth.uid() 返回文本（非 uuid）
--   2. 前端【永不传 owner_id】；数据库用 DEFAULT 自动填，RLS 负责隔离
--   3. image_path 只存对象路径，图片本体在 Storage（runtime/shared 或 users）
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. 报告表
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
    -- 主键：前端用 id 定位「某一条」报告（update/delete 都靠它）
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- 所有者标识：由 DEFAULT auth.uid() 自动填充，前端不传
    owner_id      TEXT        NOT NULL DEFAULT auth.uid(),
    -- 昵称快照：前端在插入时从 session.user.name 写入，可为空
    -- 注意：这是客户端可控数据，只做展示，绝不能用于任何判断/鉴权
    owner_name    TEXT,
    -- 检测的音频文件名
    file_name     TEXT        NOT NULL,
    -- 风险等级：high / medium / low（数据库强制枚举，防写入任意字符串）
    risk_level    TEXT        NOT NULL
                  CONSTRAINT reports_risk_level_check
                  CHECK (risk_level IN ('high', 'medium', 'low')),
    -- 窗口概率均值（判决统计量），0-100（数据库强制范围，防负值/超界）
    ai_probability NUMERIC(5,1)
                  CONSTRAINT reports_ai_probability_check
                  CHECK (ai_probability >= 0 AND ai_probability <= 100),
    -- 报告图片在 Storage 中的对象路径（如 shared/<uid>/reports/xxx.png）
    -- ⚠️ 本列只存路径，路径合法性由「换签名 URL 时」的前端校验兜底，
    --    数据库无法也不应承担文件归属校验（见文件末尾「文件隔离」说明）
    image_path    TEXT,
    -- 生成时间
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 按创建时间倒序查询时常用索引
CREATE INDEX IF NOT EXISTS reports_owner_created_idx
    ON public.reports (owner_id, created_at DESC);

-- ---------------------------------------------------------------------
-- 2. 行级安全（RLS）策略 —— 按用户隔离的「安全边界」
--    安全在数据库层强制，前端 JS 过滤只是 UI 展示，不是安全手段。
-- ---------------------------------------------------------------------

-- 启用 RLS（默认拒绝一切，白名单式放行）
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 2.1 读：只能读自己名下的报告
CREATE POLICY reports_select_own
    ON public.reports
    FOR SELECT
    USING (owner_id = auth.uid());

-- 2.2 写：只能插入 owner_id 等于当前登录用户的报告
--     （配合 DEFAULT auth.uid()，前端不传 owner_id 也能正确落库）
CREATE POLICY reports_insert_own
    ON public.reports
    FOR INSERT
    WITH CHECK (owner_id = auth.uid());

-- 2.3 删：只能删自己名下的报告
--     （报告是一次性生成的产物，只有「读 + 删」，不提供 update，
--       避免用户篡改自己报告的 risk_level / image_path 后再传播）
CREATE POLICY reports_delete_own
    ON public.reports
    FOR DELETE
    USING (owner_id = auth.uid());

-- ---------------------------------------------------------------------
-- 3. 文件隔离 —— 表隔离 ≠ 文件隔离（必须各自由各自兜底）
--
--   RLS 只保证「A 读不到 B 的 reports 行」，但管不到 Storage 里的文件：
--   image_path 是前端可任意填写的字符串，数据库不校验它指向谁的对象。
--   因此文件层必须独立成立，缺一不可：
--
--   3.1 Storage 侧策略：只允许当前用户读写 shared/<uid>/ 前缀下的对象
--       （依赖云服务 Storage 的 userPath/sharedPath 能力，见
--        lib/cloud-reports.ts 的 uploadReportImage / reportImageUrl）
--
--   3.2 换签名 URL 时前端校验：path 的前缀必须等于当前用户 id，
--       不匹配直接拒绝，绝不「拿到 path 就换 URL」。
--       见 lib/cloud-reports.ts 中 reportImageUrl 调用前的 prefix 校验。
-- ---------------------------------------------------------------------
-- 说明：本脚本未授权任何「公开读」能力。报告默认仅本人可见。
-- 如需「分享给他人查看」，不要在表上加公开读策略；而是通过
-- Storage 的 shared 路径 + 短期签名 URL 实现（见 lib/cloud-reports.ts）。
-- ---------------------------------------------------------------------
