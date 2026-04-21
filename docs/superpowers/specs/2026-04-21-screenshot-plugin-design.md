# ZTools 全功能截图插件设计文档

**Issue**: [#411 增加全功能截图插件](https://github.com/ZToolsCenter/ZTools/issues/411)
**日期**: 2026-04-21
**状态**: 已审批，待实现

---

## 概述

实现一个内置的全功能截图插件，提供：截图采集、区域选取、标注编辑、复制/保存、OCR 文字识别、长截图（滚动截图）、悬浮窗（钉图）等功能。

### 关键决策

| 维度     | 决定                                | 理由                                 |
| -------- | ----------------------------------- | ------------------------------------ |
| 插件类型 | 内置插件                            | 截图是核心功能，所有用户默认可用     |
| 首发平台 | Windows                             | 用户群体最大，现有 native addon 支持 |
| 架构方案 | 透明覆盖窗口                        | 成熟截图工具的标准架构               |
| 标注引擎 | Fabric.js                           | 功能丰富、自带对象编辑/序列化        |
| OCR      | Windows OCR API + Tesseract.js 回退 | 兼顾性能与跨平台                     |
| 唤出方式 | 全局快捷键 + 搜索框命令             | 两种主流使用习惯                     |

---

## 1. 核心架构

### 模块总览

```
主进程 (Main Process)
├── ScreenshotManager      — 截图总控（创建覆盖窗口、协调流程）
├── CaptureService         — 屏幕采集（desktopCapturer / native addon）
├── LongScreenshotService  — 长截图（滚动模拟 + 多帧采集 + 拼接）
├── OcrService             — OCR（Windows OCR API + Tesseract.js 回退）
├── PinWindowManager       — 悬浮窗管理（创建/销毁/置顶小窗口）
└── ScreenshotHotkeyMgr    — 全局快捷键注册

渲染进程 (Renderer - 覆盖窗口)
├── RegionSelector         — 区域选取（十字线、拖拽框选、尺寸提示）
├── AnnotationEditor       — Fabric.js 标注编辑器
├── Toolbar                — 工具栏（标注工具 + 动作按钮）
└── MagnifierWidget        — 像素放大镜（精确选取时的辅助）

渲染进程 (Renderer - 悬浮窗)
└── PinWindow              — 悬浮截图窗口（可拖拽/缩放/透明度调节）
```

### 目录结构

```
internal-plugins/screenshot/
├── public/
│   └── plugin.json              # 插件描述文件
├── src/
│   ├── main.ts                  # Vue app 入口（覆盖窗口）
│   ├── pin-main.ts              # Vue app 入口（悬浮窗）
│   ├── components/
│   │   ├── RegionSelector.vue   # 区域选取
│   │   ├── AnnotationEditor.vue # Fabric.js 标注编辑器
│   │   ├── Toolbar.vue          # 工具栏
│   │   ├── MagnifierWidget.vue  # 放大镜
│   │   └── PinView.vue          # 悬浮窗视图
│   ├── tools/                   # 标注工具实现
│   │   ├── BaseTool.ts          # 工具基类
│   │   ├── RectTool.ts          # 矩形
│   │   ├── EllipseTool.ts       # 椭圆
│   │   ├── ArrowTool.ts         # 箭头
│   │   ├── BrushTool.ts         # 画笔
│   │   ├── TextTool.ts          # 文字
│   │   ├── MosaicTool.ts        # 马赛克/模糊
│   │   └── NumberTool.ts        # 序号标注
│   └── utils/
│       ├── history.ts           # 撤销/重做管理
│       └── export.ts            # 导出（剪贴板/文件）
├── index.html                   # 覆盖窗口 HTML
├── pin.html                     # 悬浮窗 HTML
├── vite.config.ts
└── package.json

src/main/core/
├── screenshotManager.ts         # 截图总控（新增）
├── longScreenshot.ts            # 长截图服务（新增）
├── ocrService.ts                # OCR 服务（新增）
└── screenCapture.ts             # 现有文件（保留兼容）
```

### 数据流

```
用户按快捷键 / 执行命令
  → ScreenshotManager.startCapture()
    → CaptureService: desktopCapturer 获取所有显示器快照
    → 创建透明全屏 BrowserWindow（覆盖层）
    → 将屏幕快照作为背景渲染
    → 用户拖拽框选区域
    → 进入标注模式（Fabric.js 加载选区图像）
    → 用户操作工具栏：标注 / OCR / 悬浮 / 复制 / 保存
    → 完成后销毁覆盖窗口
```

---

## 2. 截图采集与区域选取

### 屏幕采集

1. 触发截图时，调用 `desktopCapturer.getSources()` 获取所有显示器的完整快照
2. 对每个显示器创建一个全屏透明 BrowserWindow（多显示器支持），将快照渲染为背景
3. 覆盖层在快照之上添加半透明暗色遮罩（表示"未选中"状态）

### 区域选取交互

| 交互            | 行为                                                 |
| --------------- | ---------------------------------------------------- |
| 鼠标按下 + 拖拽 | 绘制选区矩形，选区内显示原始亮度，选区外保持暗色遮罩 |
| 拖拽过程        | 实时显示选区尺寸（像素）和放大镜                     |
| 释放鼠标        | 确认选区，显示 8 个控制点（可调整大小）+ 工具栏      |
| 右键 / ESC      | 取消截图，关闭覆盖窗口                               |
| 双击            | 快速截图选区并复制到剪贴板                           |
| 无拖拽直接释放  | 自动识别光标下的窗口，智能选取窗口区域               |

### 智能窗口识别

利用 Windows API 获取光标下的窗口 bounds，当用户单击（不拖拽）时自动框选该窗口区域。

### 放大镜组件

选区拖拽时在光标附近显示一个放大镜面板：

- 显示光标周围 ~20x20 像素区域的 8 倍放大
- 显示当前像素的颜色值（HEX）
- 显示光标坐标

---

## 3. 标注编辑器（Fabric.js）

### 编辑器生命周期

1. 用户确认选区后，截取选区内的图像数据
2. 覆盖窗口从"选区模式"切换到"编辑模式"
3. 在选区位置初始化 Fabric.js Canvas，背景为截取的图像
4. 工具栏出现在选区下方（空间不足时上方）

### 标注工具集

| 工具   | Fabric.js 对象                         | 说明                         |
| ------ | -------------------------------------- | ---------------------------- |
| 矩形   | `fabric.Rect`                          | 可调边框颜色/粗细，空心/填充 |
| 椭圆   | `fabric.Ellipse`                       | 同上                         |
| 箭头   | 自定义 `fabric.Line` + 三角箭头        | 单向箭头，可调粗细           |
| 直线   | `fabric.Line`                          | 可调颜色/粗细                |
| 画笔   | `fabric.PencilBrush`                   | 自由绘画                     |
| 文字   | `fabric.IText`                         | 点击输入，可调字号/颜色      |
| 马赛克 | 自定义像素化处理                       | 对选中区域进行像素化模糊     |
| 序号   | 自定义 `fabric.Circle` + `fabric.Text` | 自动递增数字标注             |

### 工具属性面板

选中工具后，工具栏下方显示属性条：

- **颜色选择器**：红/绿/蓝/黄/白/黑 预设 + 自定义
- **粗细/大小**：3 档滑块（细/中/粗）
- 文字工具额外：字号选择

### 撤销/重做

- 使用命令模式（Command Pattern）维护操作历史栈
- 每次添加/修改/删除标注对象记录一条命令
- `Ctrl+Z` 撤销，`Ctrl+Shift+Z` 重做
- 最多保留 50 步历史

### 对象交互

- 已绘制的标注对象可以点击选中、拖拽移动、调整大小
- 选中对象可按 `Delete` 删除
- 支持 `Ctrl+A` 全选

---

## 4. 工具栏与动作

### 工具栏布局

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [矩形][椭圆][箭头][直线][画笔][文字][马赛克][序号] │ [撤销][重做] │ [复制][保存][OCR][悬浮][长截图][关闭] │
└──────────────────────────────────────────────────────────────────────────────┘
                     ↑ 标注工具区                    ↑ 编辑区       ↑ 动作区
```

### 动作按钮

| 动作   | 快捷键             | 行为                                   |
| ------ | ------------------ | -------------------------------------- |
| 复制   | `Enter` / `Ctrl+C` | 合并标注后写入剪贴板，关闭覆盖窗口     |
| 保存   | `Ctrl+S`           | 弹出系统保存对话框，支持 PNG/JPG       |
| OCR    | 无                 | 识别选区内文字，弹出结果面板（可复制） |
| 悬浮   | `Ctrl+T`           | 将当前截图（含标注）钉到桌面为悬浮窗   |
| 长截图 | 无                 | 切换到长截图模式                       |
| 关闭   | `ESC`              | 取消并关闭                             |

### 工具栏定位逻辑

- 默认出现在选区**下方** 8px 处
- 如果下方空间不足，改为选区**上方**
- 如果上方也不足，贴在选区**内部底部**
- 工具栏水平居中于选区，超出屏幕时向内偏移

---

## 5. 悬浮窗（Pin Window）

### 创建流程

1. 用户点击"悬浮"按钮 → 主进程 `PinWindowManager.createPinWindow(imageDataUrl, bounds)`
2. 创建新的 `BrowserWindow`：alwaysOnTop, frameless, resizable
3. 加载 `pin.html`，渲染截图图像

### 悬浮窗交互

| 交互          | 行为                             |
| ------------- | -------------------------------- |
| 拖拽          | 移动窗口位置                     |
| 鼠标滚轮      | 调整窗口大小（缩放）             |
| `Ctrl + 滚轮` | 调整窗口不透明度（30%~100%）     |
| 右键菜单      | 复制到剪贴板 / 保存到文件 / 关闭 |
| 双击          | 恢复原始大小                     |
| ESC           | 关闭当前悬浮窗                   |

### 多悬浮窗管理

- `PinWindowManager` 维护一个悬浮窗列表
- 支持同时存在多个悬浮窗
- 提供"关闭所有悬浮窗"的命令

---

## 6. OCR 集成

### Windows OCR API（首选）

通过 PowerShell 调用 Windows 内置的 `Windows.Media.Ocr` API：

- 零额外依赖、速度快
- 支持中日英等多语言（随系统语言包安装）
- 仅 Windows 10+

### Tesseract.js 回退（跨平台）

当 Windows OCR 不可用时使用 Tesseract.js：

- WASM 运行时，无需安装外部软件
- 语言包按需下载（中文 ~15MB，英文 ~4MB），缓存到 `userData` 目录
- 识别速度较慢，但离线可用

### OCR 交互流程

1. 用户点击"OCR"按钮 → 显示加载指示器
2. 将选区图像发送到主进程 → `OcrService.recognize(imageBuffer, lang)`
3. 主进程尝试 Windows OCR → 失败则回退 Tesseract.js
4. 返回结果后在覆盖窗口内显示识别文本面板（可选择、可复制）

### OCR 语言

- 默认识别：简体中文 + 英文
- 后续可在设置中配置其他语言

---

## 7. 长截图（滚动截图）

### 工作流程

1. 用户点击"长截图" → 覆盖窗口缩小为引导提示条
2. 用户点击目标窗口区域 → 记录滚动采集区域
3. 点击"开始" → 自动滚动采集：
   - 模拟鼠标滚轮向下
   - 等待渲染（~300ms）
   - 截取采集区域快照
   - 检测是否到底（连续两帧像素差异 < 阈值）
4. 采集完成 → 智能拼接

### 智能拼接算法

```
对于每对相邻帧 (frame[i], frame[i+1]):
  1. 取 frame[i] 底部 20% 区域作为"模板"
  2. 在 frame[i+1] 顶部 80% 区域中搜索最佳匹配位置
  3. 找到重叠区域 → 去除重复部分 → 拼接
```

- 使用 `sharp` 进行图像裁剪和拼接（主进程侧）
- 行级 hash 对比（先粗匹配再精匹配）

### 边界情况处理

| 情况          | 处理                                |
| ------------- | ----------------------------------- |
| 固定头部/底部 | 检测连续不变行，拼接时裁除          |
| 滚动动画/淡入 | 每帧等待时间可配置（默认 300ms）    |
| 到底检测失败  | 最大帧数限制（50 帧）+ 手动停止按钮 |
| 超长页面      | 分段处理，避免内存溢出              |

### 结果处理

拼接完成后自动进入标注编辑模式。

---

## 8. 全局快捷键与插件注册

### plugin.json

```json
{
  "name": "screenshot",
  "title": "截图",
  "version": "1.0.0",
  "description": "全功能截图工具：截图、标注、OCR、长截图、悬浮窗",
  "author": "ZTools",
  "logo": "logo.png",
  "main": "index.html",
  "features": [
    {
      "code": "screenshot",
      "explain": "截图",
      "cmds": ["截图", "screenshot", "截屏", "ss"]
    },
    {
      "code": "ocr",
      "explain": "OCR 文字识别",
      "cmds": ["OCR", "文字识别", "ocr"]
    },
    {
      "code": "long-screenshot",
      "explain": "长截图",
      "cmds": ["长截图", "滚动截图", "long screenshot"]
    },
    {
      "code": "pin-manager",
      "explain": "管理悬浮截图",
      "cmds": ["悬浮截图", "钉图", "pin"]
    }
  ]
}
```

### 全局快捷键

- 通过 `globalShortcut.register()` 注册截图快捷键
- 默认快捷键：`Ctrl+Shift+A`（可在设置中自定义）
- 快捷键设置存储在数据库 `settings-general` 中

### 与现有系统集成

- 替换现有 `screenshot` 系统命令，路由到新的 `ScreenshotManager`
- 保持 `screenCapture()` API 向后兼容
- 将 `screenshot` 加入 `BUNDLED_INTERNAL_PLUGIN_NAMES`

### 新增依赖

| 依赖           | 用途              | 体积                     |
| -------------- | ----------------- | ------------------------ |
| `fabric`       | Canvas 标注编辑器 | ~300KB (min+gzip)        |
| `tesseract.js` | 跨平台 OCR 回退   | ~800KB core + 按需语言包 |

---

## 实现优先级（建议分期）

### Phase 1：核心截图 + 标注

- ScreenshotManager + CaptureService
- 透明覆盖窗口 + 区域选取
- Fabric.js 标注编辑器（矩形、椭圆、箭头、画笔、文字、马赛克）
- 工具栏 + 复制/保存
- 全局快捷键 + 搜索框命令

### Phase 2：OCR + 悬浮窗

- OcrService（Windows OCR API + Tesseract.js 回退）
- PinWindowManager + 悬浮窗 UI
- 序号标注工具

### Phase 3：长截图

- LongScreenshotService
- 滚动模拟 + 多帧采集
- 智能拼接算法
- 固定头部/底部检测

### Phase 4：优化 + 跨平台

- 性能优化（窗口预创建、图像处理优化）
- macOS 支持
- Linux 支持
- 多显示器完整支持
