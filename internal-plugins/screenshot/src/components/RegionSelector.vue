<template>
  <div
    ref="containerRef"
    class="region-selector"
    @mousedown="onMouseDown"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @keydown.escape="$emit('cancel')"
    tabindex="0"
  >
    <canvas ref="bgCanvasRef" class="bg-canvas" />

    <div v-if="isDragging || hasSelection" class="selection-mask">
      <div class="dim dim-top" :style="dimTopStyle" />
      <div class="dim dim-bottom" :style="dimBottomStyle" />
      <div class="dim dim-left" :style="dimLeftStyle" />
      <div class="dim dim-right" :style="dimRightStyle" />
    </div>

    <div v-if="isDragging || hasSelection" class="selection-border" :style="selectionStyle">
      <div class="size-label">{{ sizeLabel }}</div>
    </div>

    <MagnifierWidget
      v-if="!hasSelection && bgCanvasRef"
      :canvas="bgCanvasRef"
      :x="mouseX"
      :y="mouseY"
      :scale-factor="scaleFactor"
    />

    <div v-if="!isDragging && !hasSelection" class="crosshair-h" :style="{ top: mouseY + 'px' }" />
    <div v-if="!isDragging && !hasSelection" class="crosshair-v" :style="{ left: mouseX + 'px' }" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import MagnifierWidget from './MagnifierWidget.vue'

const props = defineProps<{
  screenshotFilePath: string
  scaleFactor: number
}>()

const emit = defineEmits<{
  'region-selected': [region: { x: number; y: number; width: number; height: number }]
  cancel: []
}>()

const containerRef = ref<HTMLDivElement>()
const bgCanvasRef = ref<HTMLCanvasElement>()

const mouseX = ref(0)
const mouseY = ref(0)
const isDragging = ref(false)
const hasSelection = ref(false)
const startX = ref(0)
const startY = ref(0)
const selX = ref(0)
const selY = ref(0)
const selW = ref(0)
const selH = ref(0)

const sizeLabel = computed(() => {
  const w = Math.round(selW.value * props.scaleFactor)
  const h = Math.round(selH.value * props.scaleFactor)
  return `${w} × ${h}`
})

const selectionStyle = computed(() => ({
  left: selX.value + 'px',
  top: selY.value + 'px',
  width: selW.value + 'px',
  height: selH.value + 'px'
}))

const dimTopStyle = computed(() => ({
  left: '0',
  top: '0',
  right: '0',
  height: selY.value + 'px'
}))

const dimBottomStyle = computed(() => ({
  left: '0',
  right: '0',
  bottom: '0',
  top: selY.value + selH.value + 'px'
}))

const dimLeftStyle = computed(() => ({
  left: '0',
  top: selY.value + 'px',
  width: selX.value + 'px',
  height: selH.value + 'px'
}))

const dimRightStyle = computed(() => ({
  right: '0',
  top: selY.value + 'px',
  left: selX.value + selW.value + 'px',
  height: selH.value + 'px'
}))

onMounted(async () => {
  await nextTick()
  containerRef.value?.focus()
  loadBackground()
})

function loadBackground(): void {
  const canvas = bgCanvasRef.value
  if (!canvas || !props.screenshotFilePath) return
  const img = new Image()
  img.onload = () => {
    canvas.width = window.innerWidth * props.scaleFactor
    canvas.height = window.innerHeight * props.scaleFactor
    canvas.style.width = window.innerWidth + 'px'
    canvas.style.height = window.innerHeight + 'px'
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    }
  }
  img.src = `file://${props.screenshotFilePath}`
}

function onMouseDown(e: MouseEvent): void {
  if (hasSelection.value) {
    const inBounds =
      e.clientX >= selX.value &&
      e.clientX <= selX.value + selW.value &&
      e.clientY >= selY.value &&
      e.clientY <= selY.value + selH.value

    if (inBounds) {
      const region = {
        x: Math.round(selX.value * props.scaleFactor),
        y: Math.round(selY.value * props.scaleFactor),
        width: Math.round(selW.value * props.scaleFactor),
        height: Math.round(selH.value * props.scaleFactor)
      }
      const croppedDataUrl = cropRegion(region)
      emit('region-selected', region, croppedDataUrl)
      return
    }
    hasSelection.value = false
  }

  isDragging.value = true
  startX.value = e.clientX
  startY.value = e.clientY
  selX.value = e.clientX
  selY.value = e.clientY
  selW.value = 0
  selH.value = 0
}

function onMouseMove(e: MouseEvent): void {
  mouseX.value = e.clientX
  mouseY.value = e.clientY
  if (!isDragging.value) return
  selX.value = Math.min(startX.value, e.clientX)
  selY.value = Math.min(startY.value, e.clientY)
  selW.value = Math.abs(e.clientX - startX.value)
  selH.value = Math.abs(e.clientY - startY.value)
}

function onMouseUp(): void {
  if (!isDragging.value) return
  isDragging.value = false
  if (selW.value > 5 && selH.value > 5) {
    hasSelection.value = true
  }
}

function cropRegion(region: { x: number; y: number; width: number; height: number }): string {
  const canvas = bgCanvasRef.value
  if (!canvas) return ''
  const cropCanvas = document.createElement('canvas')
  cropCanvas.width = region.width
  cropCanvas.height = region.height
  const ctx = cropCanvas.getContext('2d')
  if (!ctx) return ''
  ctx.drawImage(
    canvas,
    region.x,
    region.y,
    region.width,
    region.height,
    0,
    0,
    region.width,
    region.height
  )
  return cropCanvas.toDataURL('image/png')
}
</script>

<style scoped>
.region-selector {
  position: fixed;
  inset: 0;
  cursor: crosshair;
  outline: none;
  z-index: 1;
}

.bg-canvas {
  position: absolute;
  inset: 0;
}

.dim {
  position: absolute;
  background: rgba(0, 0, 0, 0.45);
  pointer-events: none;
}

.selection-border {
  position: absolute;
  border: 2px solid #00aeff;
  pointer-events: none;
  z-index: 2;
}

.size-label {
  position: absolute;
  top: -24px;
  left: 0;
  background: #00aeff;
  color: #fff;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 2px;
  white-space: nowrap;
  user-select: none;
}

.crosshair-h,
.crosshair-v {
  position: fixed;
  pointer-events: none;
  z-index: 3;
}

.crosshair-h {
  left: 0;
  right: 0;
  height: 1px;
  background: rgba(0, 174, 255, 0.6);
}

.crosshair-v {
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(0, 174, 255, 0.6);
}
</style>
