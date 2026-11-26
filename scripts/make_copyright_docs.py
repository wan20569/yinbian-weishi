"""生成软著登记用的两份材料（源程序 / 软件说明书）。

用法（项目根目录）：
    D:\\yinbian-venv\\Scripts\\python.exe scripts\\make_copyright_docs.py

产出（默认在 软著材料/ 下）：
    音辩卫士V1.0_源程序.docx      —— 前 30 页 + 后 30 页，每页 50 行，页眉含名称/版本/页码
    音辩卫士V1.0_软件说明书.docx  —— 功能与操作说明，含截图占位

格式依据中国版权保护中心（CPCC）的常见受理要求：
  * 源程序：每页 50 行，页眉标注软件名称、版本号、页码；超过 60 页提交前 30 + 后 30
  * 说明书：前 30 + 后 30 页，不足 60 页全部提交
"""

from __future__ import annotations

import sys
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING, WD_TAB_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt

# ---------------- 可改配置 ----------------
SOFTWARE_NAME = "音辩卫士AI音乐鉴别系统"
SOFTWARE_VERSION = "V1.0"
ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "软著材料"

LINES_PER_PAGE = 50
MAX_PAGES = 60          # 前 30 + 后 30
WRAP_AT = 96            # 单行硬换行阈值（8.5pt Consolas 在 A4 上约可容 99 字符）

# 源码收集顺序：先是入口与业务代码，配置文件居中，最后是推理核心
# （这样第 1 页是 app/layout.tsx，最后一页落在 server 的算法代码上）
SOURCE_GLOBS = [
    ("app", "**/*.tsx"),
    ("app", "**/*.ts"),
    ("app", "**/*.css"),
    ("components", "**/*.tsx"),
    ("components", "**/*.ts"),
    ("hooks", "**/*.ts"),
    ("lib", "**/*.ts"),
]
SOURCE_GLOBS_TAIL = [
    ("server", "*.py"),
]
EXTRA_FILES = [
    "tailwind.config.ts",
    "next.config.mjs",
    "postcss.config.mjs",
    "tsconfig.json",
    "package.json",
]
EXCLUDE_DIRS = {"node_modules", ".next", "yinbian-venv", "__pycache__", "软著材料", ".git"}


def comment_banner(rel_path: str) -> str:
    """按语言选注释符，生成文件分隔行。"""
    if rel_path.endswith(".py"):
        return f"# ========== {rel_path} =========="
    if rel_path.endswith((".json", ".css")):
        return f"/* ========== {rel_path} ========== */"
    return f"// ========== {rel_path} =========="


def collect_files() -> list[Path]:
    seen: list[Path] = []

    def absorb(folder: str, pattern: str) -> None:
        base = ROOT / folder
        if not base.is_dir():
            return
        # 按「目录层级 → 文件名」排序，让 app/layout.tsx、app/page.tsx 这类入口文件排在前面
        for path in sorted(base.glob(pattern), key=lambda p: (len(p.relative_to(base).parts), str(p))):
            if any(part in EXCLUDE_DIRS for part in path.parts):
                continue
            if path.name.startswith("_") or path.suffix == ".pyc":
                continue
            if path not in seen:
                seen.append(path)

    for folder, pattern in SOURCE_GLOBS:
        absorb(folder, pattern)
    for name in EXTRA_FILES:
        path = ROOT / name
        if path.exists() and path not in seen:
            seen.append(path)
    for folder, pattern in SOURCE_GLOBS_TAIL:
        absorb(folder, pattern)
    return seen


def split_long(line: str, width: int) -> list[str]:
    """超长行硬折行，保证「一物理行 = 一代码行」，避免 Word 自动换行打乱 50 行网格。"""
    if len(line) <= width:
        return [line]
    indent = len(line) - len(line.lstrip())
    pad = " " * min(indent + 4, 16)
    parts = [line[:width]]
    rest = line[width:]
    while rest:
        parts.append(pad + rest[: width - len(pad)])
        rest = rest[width - len(pad) :]
    return parts


def build_lines() -> list[tuple[str, bool]]:
    """返回 [(文本, 是否为文件首行)]，空行已剔除。"""
    lines: list[tuple[str, bool]] = []
    for path in collect_files():
        rel = path.relative_to(ROOT).as_posix()
        try:
            raw = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        lines.append((comment_banner(rel), True))
        for line in raw.splitlines():
            line = line.rstrip().replace("\t", "    ")
            if not line.strip():
                continue
            for chunk in split_long(line, WRAP_AT):
                lines.append((chunk, False))
    return lines


# ---------------- docx 工具 ----------------
def set_code_font(run, size: float = 8.5) -> None:
    run.font.name = "Consolas"
    run.font.size = Pt(size)
    rpr = run._element.get_or_add_rPr()
    rfonts = rpr.get_or_add_rFonts()
    rfonts.set(qn("w:eastAsia"), "宋体")


def add_field(paragraph, instruction: str) -> None:
    """插入 PAGE / NUMPAGES 域，打印或打开时自动显示页码。"""
    run = paragraph.add_run()
    set_code_font(run, 9)
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = instruction
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    run._r.append(begin)
    run._r.append(instr)
    run._r.append(end)


def build_header(section, name: str, version: str, page_no: int | None = None, total: int | None = None) -> None:
    """页眉左侧软件名称+版本，右侧页码。

    页码优先写静态文字（源程序页数固定，60 页），不依赖 Word/WPS 更新域；
    只有页数不确定的文档才退化为 PAGE 域。
    """
    header = section.header
    header.is_linked_to_previous = False
    para = header.paragraphs[0]
    para.text = ""
    para.alignment = WD_ALIGN_PARAGRAPH.LEFT
    # 右对齐制表位放在正文右边界，保证页码贴右边
    para.paragraph_format.tab_stops.add_tab_stop(Cm(17.8), WD_TAB_ALIGNMENT.RIGHT)

    left = para.add_run(f"{name} {version}")
    set_code_font(left, 9)
    set_code_font(para.add_run("\t"), 9)

    if page_no is not None and total is not None:
        set_code_font(para.add_run(f"第 {page_no} 页 / 共 {total} 页"), 9)
    else:
        set_code_font(para.add_run("第 "), 9)
        add_field(para, "PAGE")
        set_code_font(para.add_run(" 页"), 9)


def setup_section(section) -> None:
    section.page_width = Cm(21)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(1.6)
    section.bottom_margin = Cm(1.4)
    section.left_margin = Cm(1.6)
    section.right_margin = Cm(1.6)
    section.header_distance = Cm(0.8)
    section.footer_distance = Cm(0.6)


def make_source_doc(lines: list[tuple[str, bool]], out: Path) -> tuple[int, int]:
    pages = [lines[i : i + LINES_PER_PAGE] for i in range(0, len(lines), LINES_PER_PAGE)]
    total = len(pages)

    if total > MAX_PAGES:
        half = MAX_PAGES // 2
        picked = pages[:half] + pages[-half:]
        note = f"（全文 {total} 页，按要求提交前 {half} 页与后 {half} 页）"
    else:
        picked = pages
        note = f"（全文 {total} 页，全部提交）"

    doc = Document()
    setup_section(doc.sections[0])
    build_header(doc.sections[0], SOFTWARE_NAME, SOFTWARE_VERSION, 1, len(picked))

    style = doc.styles["Normal"]
    style.font.name = "Consolas"
    style.font.size = Pt(8.5)
    style.element.rPr.rFonts.set(qn("w:eastAsia"), "宋体")
    fmt = style.paragraph_format
    fmt.space_before = Pt(0)
    fmt.space_after = Pt(0)
    fmt.line_spacing_rule = WD_LINE_SPACING.EXACTLY
    fmt.line_spacing = Pt(13)

    for index, page in enumerate(picked):
        if index > 0:
            # 每页一个 section：页码可以直接写死，不依赖域更新
            section = doc.add_section(WD_SECTION.NEW_PAGE)
            setup_section(section)
            build_header(section, SOFTWARE_NAME, SOFTWARE_VERSION, index + 1, len(picked))
        para = doc.add_paragraph()
        para.paragraph_format.keep_together = True  # 整页同段，防止被拆到两页
        for order, (text, is_banner) in enumerate(page):
            run = para.add_run(text)
            set_code_font(run, 8.5)
            if is_banner:
                run.bold = True
            if order < len(page) - 1:
                run.add_break()

    doc.save(out)
    return total, len(picked)


# ---------------- 说明书 ----------------
MANUAL_SECTIONS: list[tuple[str, list[str]]] = [
    (
        "一、软件概述",
        [
            f"软件全称：{SOFTWARE_NAME}",
            f"版本号：{SOFTWARE_VERSION}",
            "软件类型：应用软件（Web 端）",
            "开发语言：TypeScript / Python",
            "主要技术：Next.js 14、React 18、Tailwind CSS、PyTorch",
            "",
            f"{SOFTWARE_NAME}（以下简称本软件）面向音乐内容平台、版权服务机构与原创音乐人，"
            "提供 AI 生成音乐的鉴别与取证辅助能力。用户上传音频后，系统依次完成音频解析、"
            "AI 生成概率判别、音频指纹比对与旋律特征提取，输出可归档的技术意见书。",
            "",
            "本软件解决的核心问题是：AI 生成音乐与真人创作在听感上日益接近，"
            "平台与版权方缺乏可量化、可复现、可留存的判定依据。",
        ],
    ),
    (
        "二、运行环境",
        [
            "1. 服务端（Web 前端）",
            "   操作系统：Windows 10/11、Linux、macOS 均可",
            "   运行时：Node.js 18 及以上",
            "   依赖：Next.js 14、React 18、Tailwind CSS 3",
            "   启动命令：npm install && npm run dev（开发）/ npm run build && npm start（生产）",
            "",
            "2. 推理服务（模型侧）",
            "   运行时：Python 3.10 及以上",
            "   依赖：PyTorch（CPU 版即可）、NumPy、SciPy、SoundFile、PyAV",
            "   模型：轻量卷积神经网络，参数量约 25.7 万，权重文件约 1.3MB",
            "   启动命令：python server/infer.py <音频路径>",
            "",
            "3. 客户端",
            "   浏览器：Chrome 100+、Edge 100+、Firefox 100+、Safari 15+",
            "   屏幕分辨率：建议 1280×800 及以上",
        ],
    ),
    (
        "三、系统结构与技术实现",
        [
            "本软件采用前后端分离结构，分为三层。",
            "",
            "1. 表现层：基于 Next.js App Router 构建的 Web 界面，包含工作台、"
            "新建检测、检测结果、报告中心与个人中心五个视图。界面组件基于 React 函数组件与 "
            "Tailwind CSS 实现，采用统一的暗色设计语言。",
            "",
            "2. 业务层：以 TypeScript 实现的检测流程编排、任务状态机、报告生成与本地持久化。"
            "检测流程分为解析音频、AI 鉴别、指纹比对、旋律特征提取四个阶段，"
            "每个阶段的进度与文案由状态机驱动。",
            "",
            "3. 推理层：以 Python 实现的音频预处理与神经网络推理。"
            "预处理链路为：解码（SoundFile / FFmpeg）→ 降混单声道 → 重采样至 16kHz → "
            "短时傅里叶变换 → Mel 滤波器组投影 → 对数压缩 → 标准化 → 按 10 秒窗、5 秒步长切分。"
            "模型输出经 Sigmoid 映射为 0～100 的 AI 生成概率。",
            "",
            "音频预处理参数与训练阶段严格一致（采样率 16000Hz、Mel 频带 128、"
            "FFT 窗长 1024、帧移 320），以保证推理结果的可复现性。",
        ],
    ),
    (
        "四、主要功能模块",
        [
            "1. 工作台",
            "   以三栏布局呈现：左侧为功能导航，中间为任务列表，右侧为任务详情。"
            "顶部提供全局搜索与统计概览（累计检测数、风险命中数、平均处理时长）。"
            "任务列表支持按“全部任务 / 最近检测 / 进行中 / 风险命中”筛选，"
            "并提供列表视图与卡片视图两种呈现方式。",
            "",
            "2. 新建检测",
            "   提供拖拽与点选两种音频上传方式，支持 mp3、wav、flac、m4a 等常见格式。"
            "上传前可校验文件类型与大小，上传过程中显示实时进度。"
            "用户可选择检测类型：综合检测、AI 生成鉴别、抄袭比对。",
            "",
            "3. 检测过程",
            "   以四阶段进度条呈现解析、鉴别、比对、提取的推进过程，"
            "每个阶段配有对应的说明文案与完成状态，处理期间展示骨架屏，避免界面跳变。",
            "",
            "4. 检测结果",
            "   结果页展示 AI 生成概率、相似度两项核心指标（环形进度可视化），"
            "音频波形图与命中片段在时间轴上高亮对齐，证据链区域列出声学特征、"
            "指纹比对、旋律特征三类依据，并给出风险等级与处置建议。",
            "",
            "5. 技术意见书生成",
            "   结果页可一键生成《AI 音乐鉴别技术意见书》，记录任务编号、文件名、"
            "检测时间、判定结论与证据链，写入浏览器本地存储，供后续查阅与导出。",
            "",
            "6. 报告中心",
            "   汇总已生成的技术意见书，支持按时间排序、查看详情、删除单条记录，"
            "空态提供示例数据载入功能以便熟悉界面。",
            "",
            "7. 个人中心",
            "   展示账户信息、检测额度、历史统计与偏好设置入口。",
        ],
    ),
    (
        "五、操作流程",
        [
            "步骤 1：打开浏览器访问系统地址，进入工作台首页。",
            "步骤 2：点击左侧导航或顶部“新建检测”按钮，进入上传页面。",
            "步骤 3：将音频文件拖入上传区域，或点击选择文件。",
            "步骤 4：选择检测类型（综合检测 / AI 生成鉴别 / 抄袭比对）。",
            "步骤 5：等待上传完成，系统自动创建任务并跳转至检测结果页。",
            "步骤 6：观察四阶段检测进度，处理完成后自动展示结果。",
            "步骤 7：查看 AI 生成概率、相似度、波形高亮与证据链。",
            "步骤 8：点击“生成报告”，系统生成技术意见书并提示成功。",
            "步骤 9：从左侧导航进入报告中心，查看、下载或删除已生成的报告。",
        ],
    ),
    (
        "六、界面说明",
        [
            "1. 工作台首页",
            "   页面分为三栏。左栏为功能导航，包含任务、列表、报告中心、个人中心四个入口，"
            "底部显示账户信息。中栏顶部为统计概览，展示累计检测数、风险命中数、平均处理时长；"
            "其下为筛选标签与任务列表，每张任务卡显示文件名、检测类型、时长、提交时间与状态徽章，"
            "进行中的任务额外显示百分比进度。右栏为选中任务的详情面板，展示波形缩略图、"
            "核心指标与“查看完整结果页”入口。",
            "   【此处插入截图：工作台首页】",
            "",
            "2. 新建检测页",
            "   页面居中单列布局。主体为上传区域，支持拖拽与点选，未选择文件时显示文件格式与大小限制说明；"
            "选择文件后切换为进度条与文件信息卡。下方为检测类型选择，提供综合检测、AI 生成鉴别、"
            "抄袭比对三个可选项，选中项以主色边框标识。",
            "   【此处插入截图：新建检测页】",
            "",
            "3. 检测结果页",
            "   顶部为任务概览卡，显示文件名、任务状态、风险等级与提交时间；"
            "其下为波形图，命中片段以高亮色块标注在时间轴上；检测进行中显示四阶段进度条与骨架屏，"
            "完成后展示结果区。结果区自上而下依次为：两项核心指标卡（AI 生成概率、相似度，"
            "以环形进度呈现并带数字滚动动画）、匹配片段列表（含起止时间与相似度）、"
            "结论与证据链面板、报告生成入口。",
            "   【此处插入截图：检测过程（四阶段进度）】",
            "   【此处插入截图：检测结果（指标卡与波形）】",
            "   【此处插入截图：证据链与结论】",
            "",
            "4. 报告中心",
            "   以列表呈现已生成的技术意见书，每行显示报告编号、标题、结论徽章、生成时间与操作按钮；"
            "无数据时显示空态插图与“载入示例报告”按钮。",
            "   【此处插入截图：报告中心】",
            "",
            "5. 个人中心",
            "   展示账户头像、昵称、检测额度使用情况、历史检测统计与偏好设置项。",
            "   【此处插入截图：个人中心】",
        ],
    ),
    (
        "七、异常处理与提示",
        [
            "1. 文件格式不支持：上传区域对扩展名与文件大小做前置校验，不符合时以红色提示文案告知，"
            "并阻止进入检测流程。",
            "2. 文件已损坏或无法解码：解码环节同时尝试 SoundFile 与 FFmpeg 两条通道，"
            "均失败时在结果列表标记该文件为“失败”并给出原因，不影响其余文件继续处理。",
            "3. 推理服务不可用：前端设置请求超时，超时或返回异常时回落到预置的判定结果，"
            "并在界面上以中性文案提示，避免页面停留在加载状态。",
            "4. 音频过短：不足一个分析窗口（10 秒）时对频谱补零后推理，结果仍可输出，"
            "但在说明中标注采样不足。",
            "5. 操作反馈：生成报告、删除报告、重置演示数据等操作均以轻提示（Toast）反馈结果。",
        ],
    ),
    (
        "八、技术特点",
        [
            "1. 与训练一致的预处理链路。推理端完整复现训练阶段的采样率、"
            "窗长、帧移、Mel 滤波器与标准化参数，避免因预处理偏差导致的判定漂移。",
            "",
            "2. 轻量模型、CPU 可跑。模型参数量约 25.7 万，单首歌曲推理耗时在 1 秒以内，"
            "无需 GPU，便于在普通服务器或本地部署。",
            "",
            "3. 多格式兼容。音频解码同时支持 SoundFile 与 FFmpeg 两条通道，"
            "可处理扩展名与实际容器不一致的文件（如实际为 MP4/AAC 容器的 .mp3）。",
            "",
            "4. 长音频分块推理。按 10 秒窗、5 秒步长滑窗推理后取均值与峰值，"
            "兼顾整曲判定与片段级定位；频谱计算分块进行，控制内存占用。",
            "",
            "5. 结果可留存。技术意见书以结构化记录持久化，包含判定依据与时间戳，"
            "可作为维权举证的辅助材料。",
        ],
    ),
    (
        "九、版本说明",
        [
            f"{SOFTWARE_VERSION}（首个版本）",
            "   - 实现音频上传、四阶段检测流程与结果展示",
            "   - 实现 AI 生成概率判别（轻量 CNN 模型）",
            "   - 实现技术意见书生成与报告中心管理",
            "   - 实现工作台任务列表、统计概览与个人中心",
            "",
            "说明：当前版本中，音频指纹比对与旋律特征提取两个环节以演示数据呈现，"
            "相关接口已预留，后续版本将接入指纹库与旋律特征库。",
        ],
    ),
]


def make_manual_doc(out: Path) -> None:
    doc = Document()
    setup_section(doc)
    build_header(doc.sections[0], SOFTWARE_NAME, SOFTWARE_VERSION)

    style = doc.styles["Normal"]
    style.font.name = "宋体"
    style.font.size = Pt(10.5)
    style.element.rPr.rFonts.set(qn("w:eastAsia"), "宋体")
    fmt = style.paragraph_format
    fmt.line_spacing = 1.5
    fmt.space_before = Pt(0)
    fmt.space_after = Pt(0)

    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = title.add_run(f"{SOFTWARE_NAME}\n软件说明书")
    run.font.name = "宋体"
    run.font.size = Pt(20)
    run.bold = True
    run._element.get_or_add_rPr().get_or_add_rFonts().set(qn("w:eastAsia"), "宋体")

    sub = doc.add_paragraph()
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sub_run = sub.add_run(f"版本号：{SOFTWARE_VERSION}")
    sub_run.font.name = "宋体"
    sub_run.font.size = Pt(12)
    sub_run._element.get_or_add_rPr().get_or_add_rFonts().set(qn("w:eastAsia"), "宋体")

    # 著作权人与完成日期需与申请表一致，留给申请人填写
    for line in ("著作权人：＿＿＿＿＿＿＿＿＿＿＿＿", "开发完成日期：＿＿＿＿年＿＿月＿＿日"):
        blank = doc.add_paragraph()
        blank.alignment = WD_ALIGN_PARAGRAPH.CENTER
        br = blank.add_run(line)
        br.font.name = "宋体"
        br.font.size = Pt(12)
        br._element.get_or_add_rPr().get_or_add_rFonts().set(qn("w:eastAsia"), "宋体")

    for heading, paragraphs in MANUAL_SECTIONS:
        h = doc.add_paragraph()
        h.paragraph_format.space_before = Pt(12)
        h.paragraph_format.space_after = Pt(6)
        hr = h.add_run(heading)
        hr.font.name = "宋体"
        hr.font.size = Pt(14)
        hr.bold = True
        hr._element.get_or_add_rPr().get_or_add_rFonts().set(qn("w:eastAsia"), "宋体")

        for text in paragraphs:
            if not text:
                continue
            p = doc.add_paragraph()
            p.paragraph_format.first_line_indent = Cm(0.74) if not text.startswith(
                ("1.", "2.", "3.", "4.", "5.", "6.", "7.", "步骤", "   -", "    ", "说明")
            ) and not text.startswith("【") else Cm(0)
            r = p.add_run(text)
            r.font.name = "宋体"
            r.font.size = Pt(10.5)
            r._element.get_or_add_rPr().get_or_add_rFonts().set(qn("w:eastAsia"), "宋体")

    doc.save(out)


def main() -> None:
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    lines = build_lines()
    src_out = OUT_DIR / f"{SOFTWARE_NAME}{SOFTWARE_VERSION}_源程序.docx"
    total_pages, kept = make_source_doc(lines, src_out)
    print(f"源程序：{len(lines)} 行 → 全文 {total_pages} 页，文档内含 {kept} 页")
    print(f"  已生成 {src_out}")

    manual_out = OUT_DIR / f"{SOFTWARE_NAME}{SOFTWARE_VERSION}_软件说明书.docx"
    make_manual_doc(manual_out)
    print(f"说明书：已生成 {manual_out}")


if __name__ == "__main__":
    main()
