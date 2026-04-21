<template>
  <div class="long-screenshot-guide">
    <div
      v-if="phase === 'select'"
      class="guide-overlay"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
    >
      <canvas ref="previewCanvas" class="preview-canvas" />
      <div v-if="hasSelection" class="selection-box" :style="selectionStyle">
        <div class="selection-border" />
      </div>
      <div class="guide-bar" :style="guideBarStyle">
        <span class="guide-text">拖拽选择要滚动截图的区域</span>
        <template v-if="hasSelection">
          <span class="guide-dim">{{ regionWidth }} × {{ regionHeight }}</span>
          <div class="guide-controls">
            <label class="control-label">
              滚动速度
              <select v-model.number="scrollDelta" class="control-select">
                <option :value="1">慢 (1x)</option>
                <option :value="3">中 (3x)</option>
                <option :value="5">快 (5x)</option>
              </select>
            </label>
            <label class="control-label">
              帧间隔
              <select v-model.number="frameDelay" class="control-select">
                <option :value="200">200ms</option>
                <option :value="400">400ms</option>
                <option :value="600">600ms</option>
              </select>
            </label>
            <button class="guide-btn primary" @click="startCapture">开始采集</button>
          </div>
        </template>
        <button class="guide-btn cancel" @click="$emit('cancel')">取消</button>
      </div>
    </div>

    <div v-else-if="phase === 'capturing'" class="capture-overlay">
      <div class="capture-status">
        <div class="status-icon spinning">⟳</div>
        <div class="status-text">
          <div class="status-title">正在采集第 {{ progress.frameCount }} 帧</div>
          <div class="status-sub">{{ statusText }}</div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }" />
        </div>
        <button class="guide-btn stop" @click="stopCapture">停止采集</button>
      </div>
    </div>

    <div v-else-if="phase === 'stitching'" class="capture-overlay">
      <div class="capture-status">
        <div class="status-icon spinning">⟳</div>
        <div class="status-text">
          <div class="status-title">正在拼接 {{ progress.frameCount }} 帧图像...</div>
        </div>
      </div>
    </div>

    <div v-else-if="phase === 'error'" class="capture-overlay">
      <div class="capture-status error">
        <div class="status-icon">✕</div>
        <div class="status-text">
          <div class="status-title">采集失败</div>
          <div class="status-sub">{{ errorMessage }}</div>
        </div>
        <button class="guide-btn cancel" @click="$emit('cancel')">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'

const props = defineProps<{
  screenshotFilePath: string
  scaleFactor: number
}>()

const emit = defineEmits<{
  done: [dataUrl: string]
  cancel: []
}>()

const bridge = (window as any).__screenshotBridge

const phase = ref<'select' | 'capturing' | 'stitching' | 'error'>('select')
const previewCanvas = ref<HTMLCanvasElement>()

const isDragging = ref(false)
const hasSelection = ref(false)
const startX = ref(0)
const startY = ref(0)
const endX = ref(0)
const endY = ref(0)

const scrollDelta = ref(3)
const frameDelay = ref(400)
const errorMessage = ref('')

const progress = ref({ frameCount: 0, maxFrames: 50, status: 'capturing' as string })

let bgImage: HTMLImageElement | null = null

const selX = computed(() => Math.min(startX.value, endX.value))
const selY = computed(() => Math.min(startY.value, endY.value))
const selW = computed(() => Math.abs(endX.value - startX.value))
const selH = computed(() => Math.abs(endY.value - startY.value))

const regionWidth = computed(() => Math.round(selW.value * props.scaleFactor))
const regionHeight = computed(() => Math.round(selH.value * props.scaleFactor))

const selectionStyle = computed(() => ({
  left: selX.value + 'px',
  top: selY.value + 'px',
  width: selW.value + 'px',
  height: selH.value + 'px'
}))

const guideBarStyle = computed(() => {
  if (hasSelection.value) {
    const top = selY.value + selH.value + 8
    return {
      top: (top + 60 > window.innerHeight ? Math.max(0, selY.value - 60) : top) + 'px',
      left: Math.max(0, selX.value) + 'px'
    }
  }
  return { bottom: '20px', left: '50%', transform: 'translateX(-50%)' }
})

const progressPercent = computed(() => {
  return Math.min(100, (progress.value.frameCount / progress.value.maxFrames) * 100)
})

const statusText = computed(() => {
  if (progress.value.status === 'capturing') return '自动滚动中，到达底部会自动停止'
  if (progress.value.status === 'stitching') return '正在拼接图像...'
  return ''
})

onMounted(async () => {
  await nextTick()
  loadPreview()

  if (bridge?.onLongScreenshotProgress) {
    bridge.onLongScreenshotProgress((p: any) => {
      progress.value = p
      if (p.status === 'stitching') phase.value = 'stitching'
    })
  }
})

function loadPreview() {
  const canvas = previewCanvas.value
  if (!canvas) return
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight

  bgImage = new Image()
  bgImage.onload = () => {
    const ctx = canvas.getContext('2d')
    if (!ctx || !bgImage) return
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  if (props.screenshotFilePath.startsWith('data:')) {
    bgImage.src = props.screenshotFilePath
  } else {
    bgImage.src = 'file://' + props.screenshotFilePath.replace(/\\/g, '/')
  }
}

function onMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  isDragging.value = true
  hasSelection.value = false
  startX.value = e.clientX
  startY.value = e.clientY
  endX.value = e.clientX
  endY.value = e.clientY
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging.value) return
  endX.value = e.clientX
  endY.value = e.clientY
  drawSelectionPreview()
}

function onMouseUp() {
  if (!isDragging.value) return
  isDragging.value = false
  if (selW.value > 20 && selH.value > 20) {
    hasSelection.value = true
  }
}

function drawSelectionPreview() {
  const canvas = previewCanvas.value
  if (!canvas || !bgImage) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  if (selW.value > 0 && selH.value > 0) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(selX.value, selY.value, selW.value, selH.value)
    ctx.clip()
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height)
    ctx.restore()

    ctx.strokeStyle = '#ff6b00'
    ctx.lineWidth = 2
    ctx.setLineDash([6, 3])
    ctx.strokeRect(selX.value, selY.value, selW.value, selH.value)
    ctx.setLineDash([])
  }
}

async function startCapture() {
  if (!bridge?.longScreenshotStart) {
    errorMessage.value = '长截图功能不可用'
    phase.value = 'error'
    return
  }

  phase.value = 'capturing'
  progress.value = { frameCount: 0, maxFrames: 50, status: 'capturing' }

  try {
    const region = {
      x: Math.round(selX.value),
      y: Math.round(selY.value),
      width: Math.round(selW.value),
      height: Math.round(selH.value)
    }

    const result = await bridge.longScreenshotStart({
      region,
      scrollDelta: scrollDelta.value,
      frameDelay: frameDelay.value,
      maxFrames: 50
    })

    if (result.success && result.dataUrl) {
      emit('done', result.dataUrl)
    } else {
      errorMessage.value = result.error || '采集失败'
      phase.value = 'error'
    }
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : '未知错误'
    phase.value = 'error'
  }
}

function stopCapture() {
  bridge?.longScreenshotStop()
}
</script>

<style scoped>
.long-screenshot-guide {
  position: fixed;
  inset: 0;
  z-index: 10;
}

.guide-overlay {
  position: absolute;
  inset: 0;
  cursor: crosshair;
}

.preview-canvas {
  position: absolute;
  top: 0;
  left: 0;
}

.selection-box {
  position: absolute;
  pointer-events: none;
}

.selection-border {
  width: 100%;
  height: 100%;
  border: 2px dashed #ff6b00;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.15);
}

.guide-bar {
  position: fixed;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: rgba(30, 30, 30, 0.92);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(12px);
  z-index: 100;
  color: #ddd;
  font-size: 13px;
  user-select: none;
}

.guide-text {
  white-space: nowrap;
}

.guide-dim {
  color: #888;
  font-size: 12px;
}

.guide-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.control-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #aaa;
}

.control-select {
  background: #444;
  color: #ddd;
  border: 1px solid #555;
  border-radius: 4px;
  padding: 2px 4px;
  font-size: 12px;
}

.guide-btn {
  padding: 5px 14px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}

.guide-btn.primary {
  background: #ff6b00;
  color: #fff;
}

.guide-btn.primary:hover {
  background: #e05e00;
}

.guide-btn.cancel {
  background: #555;
  color: #ddd;
}

.guide-btn.cancel:hover {
  background: #666;
}

.guide-btn.stop {
  background: #cc3333;
  color: #fff;
}

.guide-btn.stop:hover {
  background: #aa2222;
}

.capture-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
}

.capture-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px 48px;
  background: rgba(30, 30, 30, 0.95);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  min-width: 280px;
}

.capture-status.error .status-icon {
  color: #ff4444;
  font-size: 32px;
}

.status-icon {
  font-size: 36px;
  color: #ff6b00;
}

.status-icon.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.status-text {
  text-align: center;
}

.status-title {
  color: #eee;
  font-size: 16px;
  font-weight: 500;
}

.status-sub {
  color: #888;
  font-size: 13px;
  margin-top: 4px;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: #444;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #ff6b00;
  border-radius: 2px;
  transition: width 0.3s ease;
}
</style>
