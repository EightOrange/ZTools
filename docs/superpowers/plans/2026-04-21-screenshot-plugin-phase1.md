# Screenshot Plugin Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core screenshot plugin with region selection, Fabric.js annotation editor, copy/save actions, and global hotkey integration.

**Architecture:** Transparent overlay BrowserWindow captures screen via desktopCapturer, renders frozen snapshot with dark mask. User drags to select region, then annotates with Fabric.js canvas. Toolbar provides annotation tools and actions (copy/save/cancel). Main process manages window lifecycle and hotkey registration.

**Tech Stack:** Electron (BrowserWindow, desktopCapturer, globalShortcut, clipboard, nativeImage), Vue 3 + TypeScript, Fabric.js, Vite, sharp (image export)

**Design Spec:** `docs/superpowers/specs/2026-04-21-screenshot-plugin-design.md`

---

## File Structure

### New files to create

**Internal plugin (renderer side):**

```
internal-plugins/screenshot/
├── public/
│   ├── plugin.json                          # Plugin descriptor
│   └── logo.png                             # Plugin icon
├── src/
│   ├── main.ts                              # Vue app bootstrap (overlay window)
│   ├── App.vue                              # Root component - mode switcher
│   ├── components/
│   │   ├── RegionSelector.vue               # Region selection with mask
│   │   ├── AnnotationEditor.vue             # Fabric.js annotation canvas
│   │   ├── Toolbar.vue                      # Floating toolbar
│   │   ├── ToolProperties.vue               # Tool color/size properties bar
│   │   └── MagnifierWidget.vue              # Pixel magnifier near cursor
│   ├── tools/
│   │   ├── types.ts                         # Tool interfaces and enums
│   │   ├── BaseTool.ts                      # Abstract base tool
│   │   ├── RectTool.ts                      # Rectangle annotation
│   │   ├── EllipseTool.ts                   # Ellipse annotation
│   │   ├── ArrowTool.ts                     # Arrow annotation
│   │   ├── LineTool.ts                      # Straight line
│   │   ├── BrushTool.ts                     # Freehand drawing
│   │   ├── TextTool.ts                      # Text annotation
│   │   ├── MosaicTool.ts                    # Mosaic/pixelate tool
│   │   └── NumberTool.ts                    # Auto-incrementing number labels
│   ├── composables/
│   │   ├── useAnnotationHistory.ts          # Undo/redo with command pattern
│   │   └── useToolManager.ts                # Active tool state management
│   └── utils/
│       └── export.ts                        # Canvas → clipboard/file export
├── index.html                               # Overlay window HTML entry
├── package.json
├── tsconfig.json
└── vite.config.ts
```

**Main process (screenshot management):**

```
src/main/core/
├── screenshotManager.ts                     # Screenshot lifecycle orchestrator
└── screenshotIpc.ts                         # IPC handlers for screenshot plugin
```

### Files to modify

```
src/main/core/internalPlugins.ts             # Add 'screenshot' to BUNDLED_INTERNAL_PLUGIN_NAMES
src/main/api/renderer/systemCommands.ts      # Route 'screenshot' command to new manager
src/main/index.ts                            # Initialize screenshotManager
build/afterPack.js                           # Add 'screenshot' to pluginNames
package.json                                 # Add build:screenshot script
```

---

## Task 1: Scaffold the screenshot internal plugin

**Files:**

- Create: `internal-plugins/screenshot/package.json`
- Create: `internal-plugins/screenshot/tsconfig.json`
- Create: `internal-plugins/screenshot/vite.config.ts`
- Create: `internal-plugins/screenshot/index.html`
- Create: `internal-plugins/screenshot/public/plugin.json`
- Create: `internal-plugins/screenshot/src/main.ts`
- Create: `internal-plugins/screenshot/src/App.vue`

- [ ] **Step 1: Create `internal-plugins/screenshot/package.json`**

```json
{
  "name": "screenshot",
  "version": "1.0.0",
  "description": "ZTools built-in screenshot plugin",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build"
  },
  "dependencies": {
    "vue": "^3.5.13",
    "fabric": "^6.6.1"
  },
  "devDependencies": {
    "@types/node": "^25.3.5",
    "@vitejs/plugin-vue": "^5.2.1",
    "@ztools-center/ztools-api-types": "^1.0.1",
    "typescript": "^5.3.0",
    "vite": "^6.0.11",
    "vue-tsc": "^2.0.0"
  }
}
```

- [ ] **Step 2: Create `internal-plugins/screenshot/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "preserve",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "noEmit": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.vue"]
}
```

- [ ] **Step 3: Create `internal-plugins/screenshot/vite.config.ts`**

```typescript
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  base: './',
  server: {
    port: 5178,
    strictPort: true,
    open: false
  },
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
```

- [ ] **Step 4: Create `internal-plugins/screenshot/index.html`**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Screenshot</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      html,
      body {
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: transparent;
      }
      #app {
        width: 100%;
        height: 100%;
      }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 5: Create `internal-plugins/screenshot/public/plugin.json`**

```json
{
  "name": "screenshot",
  "title": "截图",
  "version": "1.0.0",
  "description": "全功能截图工具：截图、标注、OCR、长截图、悬浮窗",
  "author": "ZTools",
  "logo": "logo.png",
  "main": "index.html",
  "development": {
    "main": "http://localhost:5178"
  },
  "features": [
    {
      "code": "screenshot",
      "explain": "截图",
      "cmds": ["截图", "screenshot", "截屏", "ss"]
    }
  ]
}
```

- [ ] **Step 6: Create `internal-plugins/screenshot/src/main.ts`**

```typescript
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

- [ ] **Step 7: Create `internal-plugins/screenshot/src/App.vue`** (minimal shell)

```vue
<template>
  <div class="screenshot-overlay">
    <RegionSelector
      v-if="mode === 'select'"
      :screenshot-data-url="screenshotDataUrl"
      @region-selected="onRegionSelected"
      @cancel="onCancel"
    />
    <AnnotationEditor
      v-else-if="mode === 'annotate'"
      :image-data-url="croppedImageDataUrl"
      :region="selectedRegion"
      @done="onDone"
      @cancel="onCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import RegionSelector from './components/RegionSelector.vue'
import AnnotationEditor from './components/AnnotationEditor.vue'

interface Region {
  x: number
  y: number
  width: number
  height: number
}

const mode = ref<'select' | 'annotate'>('select')
const screenshotDataUrl = ref('')
const croppedImageDataUrl = ref('')
const selectedRegion = ref<Region>({ x: 0, y: 0, width: 0, height: 0 })

onMounted(() => {
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'screenshot-data') {
      screenshotDataUrl.value = event.data.dataUrl
    }
  })

  const ztools = (window as any).ztools
  if (ztools) {
    ztools.onPluginEnter?.((data: any) => {
      if (data?.screenshotDataUrl) {
        screenshotDataUrl.value = data.screenshotDataUrl
      }
    })
  }
})

function onRegionSelected(region: Region, croppedDataUrl: string) {
  selectedRegion.value = region
  croppedImageDataUrl.value = croppedDataUrl
  mode.value = 'annotate'
}

function onCancel() {
  const ztools = (window as any).ztools
  ztools?.hideMainWindow?.()
}

function onDone() {
  const ztools = (window as any).ztools
  ztools?.hideMainWindow?.()
}
</script>

<style>
.screenshot-overlay {
  width: 100%;
  height: 100%;
  position: relative;
  user-select: none;
  cursor: crosshair;
}
</style>
```

- [ ] **Step 8: Install dependencies and verify build**

```bash
cd internal-plugins/screenshot && pnpm install
pnpm build  # Should compile without errors
```

- [ ] **Step 9: Commit**

```bash
git add internal-plugins/screenshot/
git commit -m "feat(screenshot): scaffold internal screenshot plugin"
```

---

## Task 2: Register screenshot as an internal plugin

**Files:**

- Modify: `src/main/core/internalPlugins.ts`
- Modify: `build/afterPack.js`
- Modify: `package.json`

- [ ] **Step 1: Add 'screenshot' to `BUNDLED_INTERNAL_PLUGIN_NAMES` in `src/main/core/internalPlugins.ts`**

Change:

```typescript
export const BUNDLED_INTERNAL_PLUGIN_NAMES = ['setting', 'system'] as const
```

To:

```typescript
export const BUNDLED_INTERNAL_PLUGIN_NAMES = ['setting', 'system', 'screenshot'] as const
```

Also add 'screenshot' to `INTERNAL_API_PLUGIN_NAMES`:

```typescript
export const INTERNAL_API_PLUGIN_NAMES = [
  ...BUNDLED_INTERNAL_PLUGIN_NAMES,
  'ztools-developer-plugin__dev',
  'ztools-developer-plugin'
] as const
```

(No change needed here since it spreads from `BUNDLED_INTERNAL_PLUGIN_NAMES`.)

- [ ] **Step 2: Add 'screenshot' to `afterPack.js` plugin list**

In `build/afterPack.js`, find:

```javascript
const pluginNames = ['setting', 'system']
```

Change to:

```javascript
const pluginNames = ['setting', 'system', 'screenshot']
```

- [ ] **Step 3: Add build script to root `package.json`**

Add these scripts:

```json
"build:screenshot": "cd internal-plugins/screenshot && pnpm build",
```

Update the `build` script to include screenshot:

```json
"build": "pnpm typecheck && pnpm build:setting && pnpm build:screenshot && electron-vite build",
```

- [ ] **Step 4: Run type-check to verify no breakage**

```bash
npx tsc --noEmit -p tsconfig.node.json --composite false
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/main/core/internalPlugins.ts build/afterPack.js package.json
git commit -m "feat(screenshot): register as internal plugin in build system"
```

---

## Task 3: Implement ScreenshotManager in main process

**Files:**

- Create: `src/main/core/screenshotManager.ts`
- Create: `src/main/core/screenshotIpc.ts`
- Modify: `src/main/index.ts`

- [ ] **Step 1: Create `src/main/core/screenshotManager.ts`**

```typescript
import { BrowserWindow, desktopCapturer, globalShortcut, screen, nativeImage } from 'electron'
import { is } from '@electron-toolkit/utils'
import path from 'path'
import databaseAPI from '../api/shared/database.js'

const DEFAULT_HOTKEY = 'Ctrl+Shift+A'

class ScreenshotManager {
  private overlayWindows: BrowserWindow[] = []
  private hotkey: string = DEFAULT_HOTKEY

  init(): void {
    this.registerHotkey()
  }

  private registerHotkey(): void {
    try {
      const settings = databaseAPI.dbGet('settings-general')
      this.hotkey = settings?.screenshotHotkey || DEFAULT_HOTKEY

      globalShortcut.register(this.hotkey, () => {
        this.startCapture()
      })
      console.log(`[Screenshot] Hotkey registered: ${this.hotkey}`)
    } catch (error) {
      console.error('[Screenshot] Failed to register hotkey:', error)
    }
  }

  async startCapture(): Promise<void> {
    try {
      this.closeAllOverlays()

      const displays = screen.getAllDisplays()
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: {
          width: Math.max(...displays.map((d) => d.size.width * d.scaleFactor)),
          height: Math.max(...displays.map((d) => d.size.height * d.scaleFactor))
        }
      })

      for (const display of displays) {
        const source =
          sources.find((s) => {
            const sourceDisplay = screen.getDisplayMatching({
              x: display.bounds.x,
              y: display.bounds.y,
              width: display.bounds.width,
              height: display.bounds.height
            })
            return sourceDisplay.id === display.id
          }) || sources[0]

        if (source) {
          const dataUrl = source.thumbnail.toDataURL()
          this.createOverlayWindow(display, dataUrl)
        }
      }
    } catch (error) {
      console.error('[Screenshot] Capture failed:', error)
    }
  }

  private createOverlayWindow(display: Electron.Display, screenshotDataUrl: string): void {
    const { bounds } = display

    const overlay = new BrowserWindow({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      frame: false,
      transparent: true,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      fullscreen: true,
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false
      }
    })

    overlay.setVisibleOnAllWorkspaces(true)

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      overlay.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/screenshot.html`)
    } else {
      overlay.loadFile(path.join(__dirname, '../renderer/screenshot.html'))
    }

    overlay.webContents.once('did-finish-load', () => {
      overlay.webContents.send('screenshot-init', {
        dataUrl: screenshotDataUrl,
        displayBounds: bounds,
        scaleFactor: display.scaleFactor
      })
    })

    overlay.on('closed', () => {
      const index = this.overlayWindows.indexOf(overlay)
      if (index !== -1) this.overlayWindows.splice(index, 1)
    })

    this.overlayWindows.push(overlay)
  }

  closeAllOverlays(): void {
    for (const win of this.overlayWindows) {
      if (!win.isDestroyed()) win.close()
    }
    this.overlayWindows = []
  }

  cleanup(): void {
    this.closeAllOverlays()
    if (this.hotkey) {
      try {
        globalShortcut.unregister(this.hotkey)
      } catch {
        /* ignore */
      }
    }
  }
}

export default new ScreenshotManager()
```

- [ ] **Step 2: Create `src/main/core/screenshotIpc.ts`**

```typescript
import { ipcMain, clipboard, nativeImage, dialog } from 'electron'
import { promises as fs } from 'fs'
import screenshotManager from './screenshotManager.js'

export function setupScreenshotIpc(): void {
  ipcMain.on('screenshot:cancel', () => {
    screenshotManager.closeAllOverlays()
  })

  ipcMain.handle('screenshot:copy-to-clipboard', async (_event, dataUrl: string) => {
    try {
      const image = nativeImage.createFromDataURL(dataUrl)
      clipboard.writeImage(image)
      screenshotManager.closeAllOverlays()
      return { success: true }
    } catch (error) {
      console.error('[Screenshot] Copy to clipboard failed:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('screenshot:save-to-file', async (_event, dataUrl: string) => {
    try {
      const result = await dialog.showSaveDialog({
        title: '保存截图',
        defaultPath: `screenshot-${Date.now()}.png`,
        filters: [
          { name: 'PNG', extensions: ['png'] },
          { name: 'JPEG', extensions: ['jpg', 'jpeg'] }
        ]
      })

      if (result.canceled || !result.filePath) {
        return { success: false, canceled: true }
      }

      const image = nativeImage.createFromDataURL(dataUrl)
      const ext =
        result.filePath.toLowerCase().endsWith('.jpg') ||
        result.filePath.toLowerCase().endsWith('.jpeg')
          ? 'jpeg'
          : 'png'
      const buffer = ext === 'jpeg' ? image.toJPEG(90) : image.toPNG()
      await fs.writeFile(result.filePath, buffer)

      screenshotManager.closeAllOverlays()
      return { success: true, path: result.filePath }
    } catch (error) {
      console.error('[Screenshot] Save to file failed:', error)
      return { success: false, error: String(error) }
    }
  })
}
```

- [ ] **Step 3: Initialize in `src/main/index.ts`**

Add import at the top:

```typescript
import screenshotManager from './core/screenshotManager'
import { setupScreenshotIpc } from './core/screenshotIpc'
```

Inside `app.whenReady().then(async () => { ... })`, after plugin initialization:

```typescript
// 初始化截图管理器
setupScreenshotIpc()
screenshotManager.init()
```

In `app.on('will-quit', () => { ... })`, add:

```typescript
screenshotManager.cleanup()
```

- [ ] **Step 4: Run type-check**

```bash
npx tsc --noEmit -p tsconfig.node.json --composite false
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/main/core/screenshotManager.ts src/main/core/screenshotIpc.ts src/main/index.ts
git commit -m "feat(screenshot): add ScreenshotManager and IPC handlers"
```

---

## Task 4: Implement RegionSelector component

**Files:**

- Create: `internal-plugins/screenshot/src/components/RegionSelector.vue`
- Create: `internal-plugins/screenshot/src/components/MagnifierWidget.vue`

- [ ] **Step 1: Create `internal-plugins/screenshot/src/components/RegionSelector.vue`**

```vue
<template>
  <div
    class="region-selector"
    @mousedown="onMouseDown"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @dblclick="onDoubleClick"
    @contextmenu.prevent="onCancel"
    @keydown.esc="onCancel"
    tabindex="0"
    ref="containerRef"
  >
    <canvas ref="canvasRef" class="screenshot-canvas" />

    <MagnifierWidget
      v-if="isDragging"
      :screenshot-data-url="screenshotDataUrl"
      :cursor-x="currentX"
      :cursor-y="currentY"
      :region="currentRegion"
    />

    <div v-if="hasSelection && !isDragging" class="selection-info" :style="selectionInfoStyle">
      {{ Math.round(selectionRegion.width) }} × {{ Math.round(selectionRegion.height) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import MagnifierWidget from './MagnifierWidget.vue'

interface Region {
  x: number
  y: number
  width: number
  height: number
}

const props = defineProps<{
  screenshotDataUrl: string
}>()

const emit = defineEmits<{
  (e: 'region-selected', region: Region, croppedDataUrl: string): void
  (e: 'cancel'): void
}>()

const containerRef = ref<HTMLDivElement>()
const canvasRef = ref<HTMLCanvasElement>()
const isDragging = ref(false)
const hasSelection = ref(false)
const startX = ref(0)
const startY = ref(0)
const currentX = ref(0)
const currentY = ref(0)
const selectionRegion = ref<Region>({ x: 0, y: 0, width: 0, height: 0 })

let screenshotImage: HTMLImageElement | null = null
let ctx: CanvasRenderingContext2D | null = null

const currentRegion = computed<Region>(() => {
  if (!isDragging.value) return selectionRegion.value
  const x = Math.min(startX.value, currentX.value)
  const y = Math.min(startY.value, currentY.value)
  const width = Math.abs(currentX.value - startX.value)
  const height = Math.abs(currentY.value - startY.value)
  return { x, y, width, height }
})

const selectionInfoStyle = computed(() => {
  const r = selectionRegion.value
  let top = r.y - 28
  if (top < 0) top = r.y + r.height + 4
  return {
    left: `${r.x}px`,
    top: `${top}px`
  }
})

onMounted(async () => {
  await nextTick()
  containerRef.value?.focus()

  const canvas = canvasRef.value!
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  ctx = canvas.getContext('2d')!

  screenshotImage = new Image()
  screenshotImage.onload = () => drawCanvas()
  screenshotImage.src = props.screenshotDataUrl
})

function drawCanvas(region?: Region) {
  if (!ctx || !screenshotImage) return
  const { width, height } = ctx.canvas

  ctx.drawImage(screenshotImage, 0, 0, width, height)

  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
  ctx.fillRect(0, 0, width, height)

  if (region && region.width > 0 && region.height > 0) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(region.x, region.y, region.width, region.height)
    ctx.clip()
    ctx.drawImage(screenshotImage, 0, 0, width, height)
    ctx.restore()

    ctx.strokeStyle = '#1890ff'
    ctx.lineWidth = 1
    ctx.strokeRect(region.x, region.y, region.width, region.height)
  }
}

function onMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  isDragging.value = true
  hasSelection.value = false
  startX.value = e.clientX
  startY.value = e.clientY
  currentX.value = e.clientX
  currentY.value = e.clientY
}

function onMouseMove(e: MouseEvent) {
  currentX.value = e.clientX
  currentY.value = e.clientY
  if (isDragging.value) {
    drawCanvas(currentRegion.value)
  }
}

function onMouseUp(e: MouseEvent) {
  if (!isDragging.value) return
  isDragging.value = false

  const region = currentRegion.value
  if (region.width < 5 || region.height < 5) {
    hasSelection.value = false
    drawCanvas()
    return
  }

  selectionRegion.value = { ...region }
  hasSelection.value = true
  drawCanvas(region)
}

function onDoubleClick() {
  if (hasSelection.value) {
    finishSelection()
  }
}

function finishSelection() {
  const region = selectionRegion.value
  if (region.width < 5 || region.height < 5) return

  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = region.width
  tempCanvas.height = region.height
  const tempCtx = tempCanvas.getContext('2d')!
  tempCtx.drawImage(
    screenshotImage!,
    region.x,
    region.y,
    region.width,
    region.height,
    0,
    0,
    region.width,
    region.height
  )
  const croppedDataUrl = tempCanvas.toDataURL('image/png')
  emit('region-selected', region, croppedDataUrl)
}

function onCancel() {
  if (hasSelection.value) {
    hasSelection.value = false
    drawCanvas()
  } else {
    emit('cancel')
  }
}

defineExpose({ finishSelection })
</script>

<style scoped>
.region-selector {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  outline: none;
}
.screenshot-canvas {
  position: absolute;
  top: 0;
  left: 0;
}
.selection-info {
  position: absolute;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 2px;
  pointer-events: none;
  white-space: nowrap;
}
</style>
```

- [ ] **Step 2: Create `internal-plugins/screenshot/src/components/MagnifierWidget.vue`**

```vue
<template>
  <div class="magnifier" :style="magnifierStyle">
    <canvas ref="magCanvas" :width="magSize" :height="magSize" />
    <div class="mag-info">
      <span>{{ cursorX }}, {{ cursorY }}</span>
      <span v-if="pixelColor" :style="{ color: pixelColor }">{{ pixelColor }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

interface Region {
  x: number
  y: number
  width: number
  height: number
}

const props = defineProps<{
  screenshotDataUrl: string
  cursorX: number
  cursorY: number
  region: Region
}>()

const magCanvas = ref<HTMLCanvasElement>()
const pixelColor = ref('')
const magSize = 120
const zoom = 8
const sampleSize = Math.floor(magSize / zoom)

let screenshotImage: HTMLImageElement | null = null

const magnifierStyle = computed(() => {
  let left = props.cursorX + 20
  let top = props.cursorY + 20
  if (left + magSize + 10 > window.innerWidth) left = props.cursorX - magSize - 20
  if (top + magSize + 30 > window.innerHeight) top = props.cursorY - magSize - 50
  return { left: `${left}px`, top: `${top}px` }
})

onMounted(() => {
  screenshotImage = new Image()
  screenshotImage.src = props.screenshotDataUrl
})

watch(
  () => [props.cursorX, props.cursorY],
  () => drawMagnifier()
)

function drawMagnifier() {
  if (!magCanvas.value || !screenshotImage) return
  const ctx = magCanvas.value.getContext('2d')!
  const halfSample = Math.floor(sampleSize / 2)

  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, magSize, magSize)
  ctx.drawImage(
    screenshotImage,
    props.cursorX - halfSample,
    props.cursorY - halfSample,
    sampleSize,
    sampleSize,
    0,
    0,
    magSize,
    magSize
  )

  ctx.strokeStyle = '#ff4444'
  ctx.lineWidth = 1
  const center = magSize / 2
  ctx.beginPath()
  ctx.moveTo(center, 0)
  ctx.lineTo(center, magSize)
  ctx.moveTo(0, center)
  ctx.lineTo(magSize, center)
  ctx.stroke()

  try {
    const pixel = ctx.getImageData(center, center, 1, 1).data
    pixelColor.value = `#${pixel[0].toString(16).padStart(2, '0')}${pixel[1].toString(16).padStart(2, '0')}${pixel[2].toString(16).padStart(2, '0')}`
  } catch {
    pixelColor.value = ''
  }
}
</script>

<style scoped>
.magnifier {
  position: fixed;
  border: 2px solid #1890ff;
  border-radius: 4px;
  background: #000;
  pointer-events: none;
  z-index: 9999;
}
.magnifier canvas {
  display: block;
}
.mag-info {
  display: flex;
  justify-content: space-between;
  padding: 2px 6px;
  font-size: 10px;
  color: #fff;
  background: rgba(0, 0, 0, 0.8);
}
</style>
```

- [ ] **Step 3: Verify build**

```bash
cd internal-plugins/screenshot && pnpm build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add internal-plugins/screenshot/src/components/RegionSelector.vue
git add internal-plugins/screenshot/src/components/MagnifierWidget.vue
git commit -m "feat(screenshot): implement region selector with magnifier"
```

---

## Task 5: Implement annotation tool types and base tool

**Files:**

- Create: `internal-plugins/screenshot/src/tools/types.ts`
- Create: `internal-plugins/screenshot/src/tools/BaseTool.ts`

- [ ] **Step 1: Create `internal-plugins/screenshot/src/tools/types.ts`**

```typescript
import type { Canvas as FabricCanvas } from 'fabric'

export enum ToolType {
  Rect = 'rect',
  Ellipse = 'ellipse',
  Arrow = 'arrow',
  Line = 'line',
  Brush = 'brush',
  Text = 'text',
  Mosaic = 'mosaic',
  Number = 'number'
}

export interface ToolOptions {
  color: string
  strokeWidth: number
  fontSize: number
  filled: boolean
}

export const DEFAULT_TOOL_OPTIONS: ToolOptions = {
  color: '#ff0000',
  strokeWidth: 2,
  fontSize: 16,
  filled: false
}

export const PRESET_COLORS = ['#ff0000', '#00cc00', '#0066ff', '#ffcc00', '#ffffff', '#000000']

export interface AnnotationTool {
  readonly type: ToolType
  activate(canvas: FabricCanvas, options: ToolOptions): void
  deactivate(): void
  onMouseDown(event: fabric.TPointerEventInfo): void
  onMouseMove(event: fabric.TPointerEventInfo): void
  onMouseUp(event: fabric.TPointerEventInfo): void
}
```

- [ ] **Step 2: Create `internal-plugins/screenshot/src/tools/BaseTool.ts`**

```typescript
import type { Canvas as FabricCanvas } from 'fabric'
import type { AnnotationTool, ToolOptions, ToolType } from './types'

export abstract class BaseTool implements AnnotationTool {
  abstract readonly type: ToolType
  protected canvas: FabricCanvas | null = null
  protected options: ToolOptions = { color: '#ff0000', strokeWidth: 2, fontSize: 16, filled: false }
  protected isDrawing = false

  activate(canvas: FabricCanvas, options: ToolOptions): void {
    this.canvas = canvas
    this.options = { ...options }
    canvas.isDrawingMode = false
    canvas.selection = false
    canvas.defaultCursor = 'crosshair'
    this.onActivate()
  }

  deactivate(): void {
    if (this.canvas) {
      this.canvas.selection = true
      this.canvas.defaultCursor = 'default'
    }
    this.isDrawing = false
    this.onDeactivate()
  }

  protected onActivate(): void {}
  protected onDeactivate(): void {}

  abstract onMouseDown(event: fabric.TPointerEventInfo): void
  abstract onMouseMove(event: fabric.TPointerEventInfo): void
  abstract onMouseUp(event: fabric.TPointerEventInfo): void
}
```

- [ ] **Step 3: Commit**

```bash
git add internal-plugins/screenshot/src/tools/
git commit -m "feat(screenshot): add annotation tool types and base class"
```

---

## Task 6: Implement concrete annotation tools

**Files:**

- Create: `internal-plugins/screenshot/src/tools/RectTool.ts`
- Create: `internal-plugins/screenshot/src/tools/EllipseTool.ts`
- Create: `internal-plugins/screenshot/src/tools/ArrowTool.ts`
- Create: `internal-plugins/screenshot/src/tools/LineTool.ts`
- Create: `internal-plugins/screenshot/src/tools/BrushTool.ts`
- Create: `internal-plugins/screenshot/src/tools/TextTool.ts`
- Create: `internal-plugins/screenshot/src/tools/MosaicTool.ts`
- Create: `internal-plugins/screenshot/src/tools/NumberTool.ts`

This task creates all 8 annotation tools. Each tool follows the same pattern: extends `BaseTool`, implements mouse event handlers to create/resize Fabric.js objects.

- [ ] **Step 1: Create RectTool.ts**

```typescript
import { Rect } from 'fabric'
import { BaseTool } from './BaseTool'
import { ToolType } from './types'

export class RectTool extends BaseTool {
  readonly type = ToolType.Rect
  private rect: Rect | null = null
  private originX = 0
  private originY = 0

  onMouseDown(event: fabric.TPointerEventInfo): void {
    if (!this.canvas) return
    const pointer = this.canvas.getScenePoint(event.e)
    this.isDrawing = true
    this.originX = pointer.x
    this.originY = pointer.y

    this.rect = new Rect({
      left: pointer.x,
      top: pointer.y,
      width: 0,
      height: 0,
      stroke: this.options.color,
      strokeWidth: this.options.strokeWidth,
      fill: this.options.filled ? this.options.color + '33' : 'transparent',
      selectable: true,
      evented: true
    })
    this.canvas.add(this.rect)
  }

  onMouseMove(event: fabric.TPointerEventInfo): void {
    if (!this.isDrawing || !this.rect || !this.canvas) return
    const pointer = this.canvas.getScenePoint(event.e)
    const left = Math.min(this.originX, pointer.x)
    const top = Math.min(this.originY, pointer.y)
    this.rect.set({
      left,
      top,
      width: Math.abs(pointer.x - this.originX),
      height: Math.abs(pointer.y - this.originY)
    })
    this.canvas.requestRenderAll()
  }

  onMouseUp(): void {
    if (!this.isDrawing || !this.rect || !this.canvas) return
    this.isDrawing = false
    if (this.rect.width! < 3 && this.rect.height! < 3) {
      this.canvas.remove(this.rect)
    } else {
      this.rect.setCoords()
    }
    this.rect = null
  }
}
```

- [ ] **Step 2: Create EllipseTool.ts**

```typescript
import { Ellipse } from 'fabric'
import { BaseTool } from './BaseTool'
import { ToolType } from './types'

export class EllipseTool extends BaseTool {
  readonly type = ToolType.Ellipse
  private ellipse: Ellipse | null = null
  private originX = 0
  private originY = 0

  onMouseDown(event: fabric.TPointerEventInfo): void {
    if (!this.canvas) return
    const pointer = this.canvas.getScenePoint(event.e)
    this.isDrawing = true
    this.originX = pointer.x
    this.originY = pointer.y

    this.ellipse = new Ellipse({
      left: pointer.x,
      top: pointer.y,
      rx: 0,
      ry: 0,
      stroke: this.options.color,
      strokeWidth: this.options.strokeWidth,
      fill: this.options.filled ? this.options.color + '33' : 'transparent',
      selectable: true,
      evented: true
    })
    this.canvas.add(this.ellipse)
  }

  onMouseMove(event: fabric.TPointerEventInfo): void {
    if (!this.isDrawing || !this.ellipse || !this.canvas) return
    const pointer = this.canvas.getScenePoint(event.e)
    const rx = Math.abs(pointer.x - this.originX) / 2
    const ry = Math.abs(pointer.y - this.originY) / 2
    this.ellipse.set({
      left: Math.min(this.originX, pointer.x),
      top: Math.min(this.originY, pointer.y),
      rx,
      ry
    })
    this.canvas.requestRenderAll()
  }

  onMouseUp(): void {
    if (!this.isDrawing || !this.ellipse || !this.canvas) return
    this.isDrawing = false
    if (this.ellipse.rx! < 3 && this.ellipse.ry! < 3) {
      this.canvas.remove(this.ellipse)
    } else {
      this.ellipse.setCoords()
    }
    this.ellipse = null
  }
}
```

- [ ] **Step 3: Create ArrowTool.ts**

```typescript
import { Line, Triangle, Group } from 'fabric'
import { BaseTool } from './BaseTool'
import { ToolType } from './types'

export class ArrowTool extends BaseTool {
  readonly type = ToolType.Arrow
  private line: Line | null = null
  private startX = 0
  private startY = 0

  onMouseDown(event: fabric.TPointerEventInfo): void {
    if (!this.canvas) return
    const pointer = this.canvas.getScenePoint(event.e)
    this.isDrawing = true
    this.startX = pointer.x
    this.startY = pointer.y

    this.line = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
      stroke: this.options.color,
      strokeWidth: this.options.strokeWidth,
      selectable: false,
      evented: false
    })
    this.canvas.add(this.line)
  }

  onMouseMove(event: fabric.TPointerEventInfo): void {
    if (!this.isDrawing || !this.line || !this.canvas) return
    const pointer = this.canvas.getScenePoint(event.e)
    this.line.set({ x2: pointer.x, y2: pointer.y })
    this.canvas.requestRenderAll()
  }

  onMouseUp(event: fabric.TPointerEventInfo): void {
    if (!this.isDrawing || !this.line || !this.canvas) return
    this.isDrawing = false
    const pointer = this.canvas.getScenePoint(event.e)

    const dx = pointer.x - this.startX
    const dy = pointer.y - this.startY
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len < 5) {
      this.canvas.remove(this.line)
      this.line = null
      return
    }

    this.canvas.remove(this.line)

    const angle = Math.atan2(dy, dx) * (180 / Math.PI)
    const headSize = Math.max(10, this.options.strokeWidth * 4)

    const shaft = new Line([this.startX, this.startY, pointer.x, pointer.y], {
      stroke: this.options.color,
      strokeWidth: this.options.strokeWidth
    })

    const head = new Triangle({
      left: pointer.x,
      top: pointer.y,
      width: headSize,
      height: headSize,
      fill: this.options.color,
      angle: angle + 90,
      originX: 'center',
      originY: 'center'
    })

    const group = new Group([shaft, head], { selectable: true, evented: true })
    this.canvas.add(group)
    this.line = null
  }
}
```

- [ ] **Step 4: Create LineTool.ts**

```typescript
import { Line } from 'fabric'
import { BaseTool } from './BaseTool'
import { ToolType } from './types'

export class LineTool extends BaseTool {
  readonly type = ToolType.Line
  private line: Line | null = null

  onMouseDown(event: fabric.TPointerEventInfo): void {
    if (!this.canvas) return
    const pointer = this.canvas.getScenePoint(event.e)
    this.isDrawing = true
    this.line = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
      stroke: this.options.color,
      strokeWidth: this.options.strokeWidth,
      selectable: true,
      evented: true
    })
    this.canvas.add(this.line)
  }

  onMouseMove(event: fabric.TPointerEventInfo): void {
    if (!this.isDrawing || !this.line || !this.canvas) return
    const pointer = this.canvas.getScenePoint(event.e)
    this.line.set({ x2: pointer.x, y2: pointer.y })
    this.canvas.requestRenderAll()
  }

  onMouseUp(): void {
    if (!this.isDrawing || !this.line || !this.canvas) return
    this.isDrawing = false
    const dx = (this.line.x2 ?? 0) - (this.line.x1 ?? 0)
    const dy = (this.line.y2 ?? 0) - (this.line.y1 ?? 0)
    if (Math.sqrt(dx * dx + dy * dy) < 5) {
      this.canvas.remove(this.line)
    }
    this.line = null
  }
}
```

- [ ] **Step 5: Create BrushTool.ts**

```typescript
import { PencilBrush } from 'fabric'
import type { Canvas as FabricCanvas } from 'fabric'
import { BaseTool } from './BaseTool'
import { ToolType, type ToolOptions } from './types'

export class BrushTool extends BaseTool {
  readonly type = ToolType.Brush

  protected onActivate(): void {
    if (!this.canvas) return
    this.canvas.isDrawingMode = true
    const brush = new PencilBrush(this.canvas)
    brush.color = this.options.color
    brush.width = this.options.strokeWidth
    this.canvas.freeDrawingBrush = brush
  }

  protected onDeactivate(): void {
    if (this.canvas) {
      this.canvas.isDrawingMode = false
    }
  }

  activate(canvas: FabricCanvas, options: ToolOptions): void {
    this.canvas = canvas
    this.options = { ...options }
    canvas.selection = false
    this.onActivate()
  }

  onMouseDown(): void {}
  onMouseMove(): void {}
  onMouseUp(): void {}
}
```

- [ ] **Step 6: Create TextTool.ts**

```typescript
import { IText } from 'fabric'
import { BaseTool } from './BaseTool'
import { ToolType } from './types'

export class TextTool extends BaseTool {
  readonly type = ToolType.Text

  onMouseDown(event: fabric.TPointerEventInfo): void {
    if (!this.canvas) return
    const pointer = this.canvas.getScenePoint(event.e)
    const target = this.canvas.findTarget(event.e)
    if (target instanceof IText) return

    const text = new IText('', {
      left: pointer.x,
      top: pointer.y,
      fontFamily: 'Arial, sans-serif',
      fontSize: this.options.fontSize,
      fill: this.options.color,
      selectable: true,
      evented: true,
      editable: true
    })
    this.canvas.add(text)
    this.canvas.setActiveObject(text)
    text.enterEditing()
  }

  onMouseMove(): void {}
  onMouseUp(): void {}
}
```

- [ ] **Step 7: Create MosaicTool.ts**

```typescript
import { Rect, type Canvas as FabricCanvas } from 'fabric'
import { BaseTool } from './BaseTool'
import { ToolType } from './types'

export class MosaicTool extends BaseTool {
  readonly type = ToolType.Mosaic
  private rects: Rect[] = []
  private backgroundImageData: ImageData | null = null

  protected onActivate(): void {
    this.captureBackground()
  }

  private captureBackground(): void {
    if (!this.canvas) return
    const canvasEl = this.canvas.getElement() as HTMLCanvasElement
    const ctx = canvasEl.getContext('2d')
    if (ctx) {
      this.backgroundImageData = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height)
    }
  }

  onMouseDown(event: fabric.TPointerEventInfo): void {
    if (!this.canvas) return
    this.isDrawing = true
    this.rects = []
    this.addMosaicBlock(event)
  }

  onMouseMove(event: fabric.TPointerEventInfo): void {
    if (!this.isDrawing) return
    this.addMosaicBlock(event)
  }

  onMouseUp(): void {
    this.isDrawing = false
  }

  private addMosaicBlock(event: fabric.TPointerEventInfo): void {
    if (!this.canvas || !this.backgroundImageData) return
    const pointer = this.canvas.getScenePoint(event.e)
    const blockSize = Math.max(8, this.options.strokeWidth * 4)
    const bx = Math.floor(pointer.x / blockSize) * blockSize
    const by = Math.floor(pointer.y / blockSize) * blockSize

    if (this.rects.some((r) => r.left === bx && r.top === by)) return

    const avgColor = this.getAverageColor(bx, by, blockSize)
    const rect = new Rect({
      left: bx,
      top: by,
      width: blockSize,
      height: blockSize,
      fill: avgColor,
      selectable: false,
      evented: false,
      strokeWidth: 0
    })
    this.canvas.add(rect)
    this.rects.push(rect)
  }

  private getAverageColor(x: number, y: number, size: number): string {
    if (!this.backgroundImageData) return '#888888'
    const { data, width } = this.backgroundImageData
    let r = 0,
      g = 0,
      b = 0,
      count = 0
    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        const px = x + dx
        const py = y + dy
        if (px < 0 || py < 0 || px >= width || py >= this.backgroundImageData.height) continue
        const i = (py * width + px) * 4
        r += data[i]
        g += data[i + 1]
        b += data[i + 2]
        count++
      }
    }
    if (count === 0) return '#888888'
    return `rgb(${Math.round(r / count)},${Math.round(g / count)},${Math.round(b / count)})`
  }
}
```

- [ ] **Step 8: Create NumberTool.ts**

```typescript
import { Circle, FabricText, Group } from 'fabric'
import { BaseTool } from './BaseTool'
import { ToolType } from './types'

let globalCounter = 1

export class NumberTool extends BaseTool {
  readonly type = ToolType.Number

  static resetCounter(): void {
    globalCounter = 1
  }

  onMouseDown(event: fabric.TPointerEventInfo): void {
    if (!this.canvas) return
    const pointer = this.canvas.getScenePoint(event.e)
    const radius = Math.max(12, this.options.fontSize * 0.8)
    const num = globalCounter++

    const circle = new Circle({
      radius,
      fill: this.options.color,
      originX: 'center',
      originY: 'center'
    })

    const text = new FabricText(String(num), {
      fontSize: radius,
      fill: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      originX: 'center',
      originY: 'center'
    })

    const group = new Group([circle, text], {
      left: pointer.x,
      top: pointer.y,
      originX: 'center',
      originY: 'center',
      selectable: true,
      evented: true
    })
    this.canvas.add(group)
  }

  onMouseMove(): void {}
  onMouseUp(): void {}
}
```

- [ ] **Step 9: Commit**

```bash
git add internal-plugins/screenshot/src/tools/
git commit -m "feat(screenshot): implement all 8 annotation tools"
```

---

## Task 7: Implement composables (history & tool manager)

**Files:**

- Create: `internal-plugins/screenshot/src/composables/useAnnotationHistory.ts`
- Create: `internal-plugins/screenshot/src/composables/useToolManager.ts`
- Create: `internal-plugins/screenshot/src/utils/export.ts`

- [ ] **Step 1: Create `useAnnotationHistory.ts`**

```typescript
import { ref } from 'vue'
import type { Canvas as FabricCanvas } from 'fabric'

const MAX_HISTORY = 50

export function useAnnotationHistory() {
  const canUndo = ref(false)
  const canRedo = ref(false)

  let canvas: FabricCanvas | null = null
  const undoStack: string[] = []
  const redoStack: string[] = []
  let isRestoring = false

  function init(fabricCanvas: FabricCanvas) {
    canvas = fabricCanvas
    saveState()

    canvas.on('object:added', () => {
      if (!isRestoring) saveState()
    })
    canvas.on('object:modified', () => {
      if (!isRestoring) saveState()
    })
    canvas.on('object:removed', () => {
      if (!isRestoring) saveState()
    })
  }

  function saveState() {
    if (!canvas) return
    const json = JSON.stringify(canvas.toJSON())
    undoStack.push(json)
    if (undoStack.length > MAX_HISTORY) undoStack.shift()
    redoStack.length = 0
    updateFlags()
  }

  function undo() {
    if (!canvas || undoStack.length <= 1) return
    isRestoring = true
    const current = undoStack.pop()!
    redoStack.push(current)
    const prev = undoStack[undoStack.length - 1]
    canvas.loadFromJSON(prev).then(() => {
      canvas!.requestRenderAll()
      isRestoring = false
      updateFlags()
    })
  }

  function redo() {
    if (!canvas || redoStack.length === 0) return
    isRestoring = true
    const next = redoStack.pop()!
    undoStack.push(next)
    canvas.loadFromJSON(next).then(() => {
      canvas!.requestRenderAll()
      isRestoring = false
      updateFlags()
    })
  }

  function updateFlags() {
    canUndo.value = undoStack.length > 1
    canRedo.value = redoStack.length > 0
  }

  return { init, undo, redo, canUndo, canRedo }
}
```

- [ ] **Step 2: Create `useToolManager.ts`**

```typescript
import { ref, shallowRef } from 'vue'
import type { Canvas as FabricCanvas } from 'fabric'
import {
  ToolType,
  DEFAULT_TOOL_OPTIONS,
  type ToolOptions,
  type AnnotationTool
} from '../tools/types'
import { RectTool } from '../tools/RectTool'
import { EllipseTool } from '../tools/EllipseTool'
import { ArrowTool } from '../tools/ArrowTool'
import { LineTool } from '../tools/LineTool'
import { BrushTool } from '../tools/BrushTool'
import { TextTool } from '../tools/TextTool'
import { MosaicTool } from '../tools/MosaicTool'
import { NumberTool } from '../tools/NumberTool'

const toolInstances: Record<ToolType, AnnotationTool> = {
  [ToolType.Rect]: new RectTool(),
  [ToolType.Ellipse]: new EllipseTool(),
  [ToolType.Arrow]: new ArrowTool(),
  [ToolType.Line]: new LineTool(),
  [ToolType.Brush]: new BrushTool(),
  [ToolType.Text]: new TextTool(),
  [ToolType.Mosaic]: new MosaicTool(),
  [ToolType.Number]: new NumberTool()
}

export function useToolManager() {
  const activeToolType = ref<ToolType | null>(null)
  const activeTool = shallowRef<AnnotationTool | null>(null)
  const toolOptions = ref<ToolOptions>({ ...DEFAULT_TOOL_OPTIONS })

  let canvas: FabricCanvas | null = null

  function init(fabricCanvas: FabricCanvas) {
    canvas = fabricCanvas
  }

  function selectTool(type: ToolType) {
    if (activeTool.value) {
      activeTool.value.deactivate()
    }

    if (activeToolType.value === type) {
      activeToolType.value = null
      activeTool.value = null
      if (canvas) {
        canvas.selection = true
        canvas.defaultCursor = 'default'
      }
      return
    }

    const tool = toolInstances[type]
    if (tool && canvas) {
      tool.activate(canvas, toolOptions.value)
      activeToolType.value = type
      activeTool.value = tool
    }
  }

  function updateOptions(opts: Partial<ToolOptions>) {
    Object.assign(toolOptions.value, opts)
    if (activeTool.value && canvas) {
      activeTool.value.activate(canvas, toolOptions.value)
    }
  }

  return { activeToolType, activeTool, toolOptions, init, selectTool, updateOptions }
}
```

- [ ] **Step 3: Create `export.ts`**

```typescript
export async function canvasToDataUrl(
  fabricCanvas: fabric.Canvas,
  format: 'png' | 'jpeg' = 'png',
  quality = 0.9
): Promise<string> {
  return fabricCanvas.toDataURL({
    format,
    quality,
    multiplier: 1
  })
}

export async function copyToClipboard(dataUrl: string): Promise<boolean> {
  const ztools = (window as any).ztools
  if (ztools) {
    const result = await ztools.invoke('screenshot:copy-to-clipboard', dataUrl)
    return result?.success ?? false
  }
  return false
}

export async function saveToFile(dataUrl: string): Promise<boolean> {
  const ztools = (window as any).ztools
  if (ztools) {
    const result = await ztools.invoke('screenshot:save-to-file', dataUrl)
    return result?.success ?? false
  }
  return false
}
```

- [ ] **Step 4: Commit**

```bash
git add internal-plugins/screenshot/src/composables/ internal-plugins/screenshot/src/utils/
git commit -m "feat(screenshot): add history, tool manager, and export utilities"
```

---

## Task 8: Implement AnnotationEditor and Toolbar components

**Files:**

- Create: `internal-plugins/screenshot/src/components/AnnotationEditor.vue`
- Create: `internal-plugins/screenshot/src/components/Toolbar.vue`
- Create: `internal-plugins/screenshot/src/components/ToolProperties.vue`

- [ ] **Step 1: Create `AnnotationEditor.vue`**

```vue
<template>
  <div class="annotation-editor" :style="editorStyle">
    <canvas ref="fabricCanvasEl" />
    <Toolbar
      :region="region"
      :active-tool="activeToolType"
      :tool-options="toolOptions"
      :can-undo="canUndo"
      :can-redo="canRedo"
      @select-tool="selectTool"
      @update-options="updateOptions"
      @undo="undo"
      @redo="redo"
      @copy="onCopy"
      @save="onSave"
      @cancel="$emit('cancel')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Canvas as FabricCanvas, FabricImage } from 'fabric'
import Toolbar from './Toolbar.vue'
import { useAnnotationHistory } from '../composables/useAnnotationHistory'
import { useToolManager } from '../composables/useToolManager'
import { canvasToDataUrl, copyToClipboard, saveToFile } from '../utils/export'
import { ToolType } from '../tools/types'

interface Region {
  x: number
  y: number
  width: number
  height: number
}

const props = defineProps<{
  imageDataUrl: string
  region: Region
}>()

const emit = defineEmits<{
  (e: 'done'): void
  (e: 'cancel'): void
}>()

const fabricCanvasEl = ref<HTMLCanvasElement>()
let fabricCanvas: FabricCanvas | null = null

const { init: initHistory, undo, redo, canUndo, canRedo } = useAnnotationHistory()
const {
  activeToolType,
  activeTool,
  toolOptions,
  init: initTools,
  selectTool,
  updateOptions
} = useToolManager()

const editorStyle = {
  position: 'absolute' as const,
  left: `${props.region.x}px`,
  top: `${props.region.y}px`,
  width: `${props.region.width}px`,
  height: `${props.region.height}px`
}

onMounted(async () => {
  if (!fabricCanvasEl.value) return

  fabricCanvas = new FabricCanvas(fabricCanvasEl.value, {
    width: props.region.width,
    height: props.region.height,
    selection: true
  })

  const bgImage = await FabricImage.fromURL(props.imageDataUrl)
  bgImage.scaleToWidth(props.region.width)
  bgImage.scaleToHeight(props.region.height)
  fabricCanvas.backgroundImage = bgImage
  fabricCanvas.requestRenderAll()

  initHistory(fabricCanvas)
  initTools(fabricCanvas)

  fabricCanvas.on('mouse:down', (e) => activeTool.value?.onMouseDown(e))
  fabricCanvas.on('mouse:move', (e) => activeTool.value?.onMouseMove(e))
  fabricCanvas.on('mouse:up', (e) => activeTool.value?.onMouseUp(e))

  window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  fabricCanvas?.dispose()
})

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('cancel')
    return
  }
  if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
    e.preventDefault()
    undo()
  }
  if (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
    e.preventDefault()
    redo()
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    const active = fabricCanvas?.getActiveObject()
    if (active && !(active as any).isEditing) {
      fabricCanvas?.remove(active)
    }
  }
  if (e.key === 'Enter' && !e.shiftKey) {
    onCopy()
  }
  if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    onSave()
  }
}

async function onCopy() {
  if (!fabricCanvas) return
  fabricCanvas.discardActiveObject()
  const dataUrl = await canvasToDataUrl(fabricCanvas)
  await copyToClipboard(dataUrl)
  emit('done')
}

async function onSave() {
  if (!fabricCanvas) return
  fabricCanvas.discardActiveObject()
  const dataUrl = await canvasToDataUrl(fabricCanvas)
  await saveToFile(dataUrl)
  emit('done')
}
</script>

<style scoped>
.annotation-editor {
  z-index: 100;
  border: 1px solid #1890ff;
}
</style>
```

- [ ] **Step 2: Create `Toolbar.vue`**

```vue
<template>
  <div class="toolbar" :style="toolbarStyle">
    <div class="tool-group">
      <button
        v-for="tool in tools"
        :key="tool.type"
        :class="['tool-btn', { active: activeTool === tool.type }]"
        :title="tool.label"
        @click="$emit('select-tool', tool.type)"
      >
        {{ tool.icon }}
      </button>
    </div>
    <div class="separator" />
    <div class="tool-group">
      <button class="tool-btn" :disabled="!canUndo" title="撤销 (Ctrl+Z)" @click="$emit('undo')">
        ↶
      </button>
      <button
        class="tool-btn"
        :disabled="!canRedo"
        title="重做 (Ctrl+Shift+Z)"
        @click="$emit('redo')"
      >
        ↷
      </button>
    </div>
    <div class="separator" />
    <div class="tool-group">
      <button class="tool-btn action" title="复制 (Enter)" @click="$emit('copy')">📋</button>
      <button class="tool-btn action" title="保存 (Ctrl+S)" @click="$emit('save')">💾</button>
      <button class="tool-btn cancel" title="关闭 (ESC)" @click="$emit('cancel')">✕</button>
    </div>

    <ToolProperties
      v-if="activeTool"
      :options="toolOptions"
      @update="$emit('update-options', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ToolType, type ToolOptions } from '../tools/types'
import ToolProperties from './ToolProperties.vue'

interface Region {
  x: number
  y: number
  width: number
  height: number
}

const props = defineProps<{
  region: Region
  activeTool: ToolType | null
  toolOptions: ToolOptions
  canUndo: boolean
  canRedo: boolean
}>()

defineEmits<{
  (e: 'select-tool', type: ToolType): void
  (e: 'update-options', opts: Partial<ToolOptions>): void
  (e: 'undo'): void
  (e: 'redo'): void
  (e: 'copy'): void
  (e: 'save'): void
  (e: 'cancel'): void
}>()

const tools = [
  { type: ToolType.Rect, icon: '▭', label: '矩形' },
  { type: ToolType.Ellipse, icon: '◯', label: '椭圆' },
  { type: ToolType.Arrow, icon: '→', label: '箭头' },
  { type: ToolType.Line, icon: '╱', label: '直线' },
  { type: ToolType.Brush, icon: '✎', label: '画笔' },
  { type: ToolType.Text, icon: 'T', label: '文字' },
  { type: ToolType.Mosaic, icon: '▦', label: '马赛克' },
  { type: ToolType.Number, icon: '①', label: '序号' }
]

const toolbarStyle = computed(() => {
  const r = props.region
  const toolbarH = 40
  let top = r.height + 8
  if (r.y + r.height + toolbarH + 16 > window.innerHeight) {
    top = -toolbarH - 8
  }
  return { top: `${top}px`, left: '0px' }
})
</script>

<style scoped>
.toolbar {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 2px;
  background: rgba(30, 30, 30, 0.9);
  border-radius: 6px;
  padding: 4px 6px;
  backdrop-filter: blur(10px);
  z-index: 200;
}
.tool-group {
  display: flex;
  gap: 2px;
}
.separator {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.2);
  margin: 0 4px;
}
.tool-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #ddd;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.tool-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}
.tool-btn.active {
  background: #1890ff;
  color: #fff;
}
.tool-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.tool-btn.cancel:hover {
  background: #ff4444;
  color: #fff;
}
</style>
```

- [ ] **Step 3: Create `ToolProperties.vue`**

```vue
<template>
  <div class="tool-properties">
    <div class="color-picker">
      <button
        v-for="c in colors"
        :key="c"
        :class="['color-btn', { active: options.color === c }]"
        :style="{ background: c }"
        @click="$emit('update', { color: c })"
      />
    </div>
    <div class="size-picker">
      <button
        v-for="s in sizes"
        :key="s.value"
        :class="['size-btn', { active: options.strokeWidth === s.value }]"
        @click="$emit('update', { strokeWidth: s.value })"
      >
        <span class="size-dot" :style="{ width: s.value * 2 + 'px', height: s.value * 2 + 'px' }" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PRESET_COLORS, type ToolOptions } from '../tools/types'

defineProps<{ options: ToolOptions }>()
defineEmits<{ (e: 'update', opts: Partial<ToolOptions>): void }>()

const colors = PRESET_COLORS
const sizes = [
  { value: 2, label: '细' },
  { value: 4, label: '中' },
  { value: 8, label: '粗' }
]
</script>

<style scoped>
.tool-properties {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  display: flex;
  gap: 8px;
  background: rgba(30, 30, 30, 0.9);
  border-radius: 6px;
  padding: 6px 8px;
  backdrop-filter: blur(10px);
}
.color-picker,
.size-picker {
  display: flex;
  gap: 4px;
  align-items: center;
}
.color-btn {
  width: 20px;
  height: 20px;
  border: 2px solid transparent;
  border-radius: 50%;
  cursor: pointer;
}
.color-btn.active {
  border-color: #fff;
}
.size-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.size-btn.active {
  background: rgba(255, 255, 255, 0.2);
}
.size-dot {
  background: #ddd;
  border-radius: 50%;
}
</style>
```

- [ ] **Step 4: Verify build**

```bash
cd internal-plugins/screenshot && pnpm build
```

- [ ] **Step 5: Commit**

```bash
git add internal-plugins/screenshot/src/components/
git commit -m "feat(screenshot): implement annotation editor with toolbar"
```

---

## Task 9: Wire screenshot to electron-vite and system command

**Files:**

- Modify: `electron.vite.config.ts`
- Modify: `src/main/api/renderer/systemCommands.ts`

- [ ] **Step 1: Add screenshot.html entry to `electron.vite.config.ts`**

Check the existing config to understand the multi-page setup, then add a `screenshot.html` entry to the renderer input configuration. The overlay window loads this HTML file.

Create `src/renderer/screenshot.html`:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Screenshot</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      html,
      body,
      #app {
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: transparent;
      }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="./src/screenshot-main.ts"></script>
  </body>
</html>
```

Create `src/renderer/src/screenshot-main.ts`:

```typescript
import { createApp } from 'vue'
// The screenshot overlay loads the internal plugin directly in dev mode.
// In production, screenshotManager loads the plugin HTML from the internal plugin server.

const app = document.getElementById('app')!
const { ipcRenderer } = window.require?.('electron') || {}

ipcRenderer?.on('screenshot-init', (_event: any, data: any) => {
  app.setAttribute('data-screenshot', JSON.stringify(data))
  app.dispatchEvent(new CustomEvent('screenshot-init', { detail: data }))
})
```

- [ ] **Step 2: Route 'screenshot' system command to ScreenshotManager**

In `src/main/api/renderer/systemCommands.ts`, modify `handleScreenshot`:

```typescript
import screenshotManager from '../../core/screenshotManager.js'

async function handleScreenshot(ctx: SystemCommandContext): Promise<any> {
  console.log('[SystemCmd] 执行截图（新版截图管理器）')
  try {
    await screenshotManager.startCapture()
    return { success: true }
  } catch (error) {
    console.error('[SystemCmd] 截图失败:', error)
    return { success: false, error: error instanceof Error ? error.message : '截图失败' }
  }
}
```

- [ ] **Step 3: Run full type-check and build**

```bash
npx tsc --noEmit -p tsconfig.node.json --composite false
cd internal-plugins/screenshot && pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add electron.vite.config.ts src/renderer/screenshot.html src/renderer/src/screenshot-main.ts
git add src/main/api/renderer/systemCommands.ts
git commit -m "feat(screenshot): wire to electron-vite and system command"
```

---

## Task 10: Integration test and polish

- [ ] **Step 1: Run the dev server and test the screenshot flow**

```bash
pnpm dev
```

Test checklist:

1. Press `Ctrl+Shift+A` → overlay appears with screen snapshot
2. Drag to select region → region highlighted, magnifier shows
3. Release → toolbar appears below selection
4. Click annotation tools → draw on canvas
5. Press Enter → image copied to clipboard
6. Press ESC → overlay closes

- [ ] **Step 2: Fix any issues found during testing**

Common issues to look for:

- Transparent window not rendering correctly on Windows (may need `backgroundColor: '#00000000'`)
- desktopCapturer returning low-resolution thumbnails (check `thumbnailSize`)
- Fabric.js mouse coordinates offset (DPI scaling)
- Toolbar positioning near screen edges

- [ ] **Step 3: Run lint and type-check**

```bash
pnpm lint
npx tsc --noEmit -p tsconfig.node.json --composite false
```

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(screenshot): Phase 1 complete - core screenshot with annotation"
```
