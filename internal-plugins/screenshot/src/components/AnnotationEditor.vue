<template>
  <div class="annotation-editor">
    <div class="canvas-wrapper" :style="canvasStyle">
      <canvas ref="fabricCanvasRef" />
    </div>
    <Toolbar
      :current-tool="toolManager.currentToolType.value"
      :options="toolManager.options.value"
      :can-undo="history.canUndo.value"
      :can-redo="history.canRedo.value"
      :toolbar-top="toolbarTop"
      :toolbar-left="toolbarLeft"
      @select-tool="toolManager.selectTool"
      @update-options="toolManager.updateOptions"
      @undo="history.undo"
      @redo="history.redo"
      @copy="onCopy"
      @save="onSave"
      @ocr="onOcr"
      @pin="onPin"
      @cancel="$emit('cancel')"
    />
    <OcrResultPanel
      v-if="showOcr"
      :text="ocrText"
      :loading="ocrLoading"
      :error="ocrError"
      :engine="ocrEngine"
      @close="showOcr = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { Canvas as FabricCanvas, FabricImage } from 'fabric'
import Toolbar from './Toolbar.vue'
import OcrResultPanel from './OcrResultPanel.vue'
import { useAnnotationHistory } from '../composables/useAnnotationHistory'
import { useToolManager } from '../composables/useToolManager'
import { canvasToDataUrl, copyToClipboard, saveToFile } from '../utils/export'

const bridge = (window as any).__screenshotBridge

const props = defineProps<{
  imageDataUrl: string
  region: { x: number; y: number; width: number; height: number }
}>()

const emit = defineEmits<{
  done: [dataUrl: string]
  cancel: []
}>()

const fabricCanvasRef = ref<HTMLCanvasElement>()
let fabricCanvas: FabricCanvas | null = null

const fabricCanvasRef2 = ref<FabricCanvas | null>(null)

const history = useAnnotationHistory(() => fabricCanvasRef2.value)
const toolManager = useToolManager(fabricCanvasRef2, () => history.saveState())

const showOcr = ref(false)
const ocrText = ref('')
const ocrLoading = ref(false)
const ocrError = ref('')
const ocrEngine = ref('')

const canvasStyle = computed(() => ({
  left: props.region.x + 'px',
  top: props.region.y + 'px',
  width: props.region.width + 'px',
  height: props.region.height + 'px'
}))

const toolbarTop = computed(() => {
  const below = props.region.y + props.region.height + 8
  return below + 50 > window.innerHeight ? Math.max(0, props.region.y - 50) : below
})

const toolbarLeft = computed(() => Math.max(0, props.region.x))

onMounted(async () => {
  await nextTick()
  initCanvas()
})

onUnmounted(() => {
  toolManager.cleanup()
  history.clear()
  if (fabricCanvas) {
    fabricCanvas.dispose()
    fabricCanvas = null
  }
})

async function initCanvas(): Promise<void> {
  const el = fabricCanvasRef.value
  if (!el) return

  fabricCanvas = new FabricCanvas(el, {
    width: props.region.width,
    height: props.region.height,
    selection: false
  })

  fabricCanvasRef2.value = fabricCanvas

  const img = await FabricImage.fromURL(props.imageDataUrl)
  img.set({ selectable: false, evented: false })
  fabricCanvas.backgroundImage = img
  fabricCanvas.requestRenderAll()

  fabricCanvas.on('mouse:down', (e) => toolManager.handleMouseDown(e))
  fabricCanvas.on('mouse:move', (e) => toolManager.handleMouseMove(e))
  fabricCanvas.on('mouse:up', (e) => toolManager.handleMouseUp(e))
  fabricCanvas.on('object:modified', () => history.saveState())

  history.saveState()
}

async function onCopy(): Promise<void> {
  if (!fabricCanvas) return
  const dataUrl = canvasToDataUrl(fabricCanvas)
  const ok = await copyToClipboard(dataUrl)
  if (ok) emit('done', dataUrl)
}

async function onSave(): Promise<void> {
  if (!fabricCanvas) return
  const dataUrl = canvasToDataUrl(fabricCanvas)
  await saveToFile(dataUrl)
}

async function onOcr(): Promise<void> {
  if (!fabricCanvas) return
  showOcr.value = true
  ocrLoading.value = true
  ocrError.value = ''
  ocrText.value = ''
  ocrEngine.value = ''

  try {
    const dataUrl = canvasToDataUrl(fabricCanvas)
    if (bridge?.ocr) {
      const result = await bridge.ocr(dataUrl)
      if (result.success) {
        ocrText.value = result.text
        ocrEngine.value = result.engine || ''
      } else {
        ocrError.value = result.error || '识别失败'
      }
    } else {
      ocrError.value = 'OCR 功能不可用'
    }
  } catch (err) {
    ocrError.value = err instanceof Error ? err.message : '未知错误'
  } finally {
    ocrLoading.value = false
  }
}

async function onPin(): Promise<void> {
  if (!fabricCanvas) return
  const dataUrl = canvasToDataUrl(fabricCanvas)
  if (bridge?.pin) {
    await bridge.pin(dataUrl)
  }
  emit('done', dataUrl)
}
</script>

<style scoped>
.annotation-editor {
  position: fixed;
  inset: 0;
  z-index: 5;
  background: rgba(0, 0, 0, 0.45);
}

.canvas-wrapper {
  position: absolute;
  box-shadow: 0 0 0 2px #00aeff;
}
</style>
