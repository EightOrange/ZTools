<template>
  <div class="magnifier" :style="positionStyle">
    <canvas ref="magCanvasRef" width="120" height="120" class="mag-canvas" />
    <div class="crosshair mag-h" />
    <div class="crosshair mag-v" />
    <div class="color-info">
      <span class="color-swatch" :style="{ background: pixelColor }" />
      <span class="color-text">{{ pixelColor }}</span>
    </div>
    <div class="coord-info">{{ coordText }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

const props = defineProps<{
  canvas: HTMLCanvasElement
  x: number
  y: number
  scaleFactor: number
}>()

const magCanvasRef = ref<HTMLCanvasElement>()
const pixelColor = ref('#000000')

const ZOOM = 6
const MAG_SIZE = 120
const RADIUS = MAG_SIZE / 2 / ZOOM

const coordText = computed(() => {
  const sx = Math.round(props.x * props.scaleFactor)
  const sy = Math.round(props.y * props.scaleFactor)
  return `${sx}, ${sy}`
})

const positionStyle = computed(() => {
  const offset = 20
  let left = props.x + offset
  let top = props.y + offset
  if (left + MAG_SIZE + 10 > window.innerWidth) left = props.x - MAG_SIZE - offset
  if (top + MAG_SIZE + 40 > window.innerHeight) top = props.y - MAG_SIZE - 40 - offset
  return { left: left + 'px', top: top + 'px' }
})

onMounted(() => drawMagnifier())

watch(
  () => [props.x, props.y],
  () => drawMagnifier()
)

function drawMagnifier(): void {
  const magCanvas = magCanvasRef.value
  const srcCanvas = props.canvas
  if (!magCanvas || !srcCanvas) return
  const ctx = magCanvas.getContext('2d')
  const srcCtx = srcCanvas.getContext('2d')
  if (!ctx || !srcCtx) return

  ctx.imageSmoothingEnabled = false

  const sx = props.x * props.scaleFactor - RADIUS
  const sy = props.y * props.scaleFactor - RADIUS

  ctx.clearRect(0, 0, MAG_SIZE, MAG_SIZE)
  ctx.drawImage(srcCanvas, sx, sy, RADIUS * 2, RADIUS * 2, 0, 0, MAG_SIZE, MAG_SIZE)

  const px = Math.round(props.x * props.scaleFactor)
  const py = Math.round(props.y * props.scaleFactor)
  if (px >= 0 && py >= 0 && px < srcCanvas.width && py < srcCanvas.height) {
    const data = srcCtx.getImageData(px, py, 1, 1).data
    pixelColor.value = `#${data[0].toString(16).padStart(2, '0')}${data[1].toString(16).padStart(2, '0')}${data[2].toString(16).padStart(2, '0')}`
  }
}
</script>

<style scoped>
.magnifier {
  position: fixed;
  width: 120px;
  border: 2px solid #00aeff;
  border-radius: 4px;
  overflow: hidden;
  pointer-events: none;
  z-index: 10;
  background: #000;
}

.mag-canvas {
  display: block;
}

.crosshair {
  position: absolute;
  background: rgba(0, 174, 255, 0.6);
}

.mag-h {
  left: 0;
  right: 0;
  top: 59px;
  height: 1px;
}

.mag-v {
  top: 0;
  bottom: 0;
  left: 59px;
  width: 1px;
}

.color-info {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  font-size: 11px;
  font-family: monospace;
}

.color-swatch {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 1px solid #555;
  border-radius: 2px;
}

.coord-info {
  padding: 2px 4px;
  background: rgba(0, 0, 0, 0.8);
  color: #aaa;
  font-size: 10px;
  font-family: monospace;
  text-align: center;
}
</style>
