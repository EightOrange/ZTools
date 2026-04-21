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
      @cancel="$emit('cancel')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { Canvas as FabricCanvas, FabricImage } from 'fabric'
import Toolbar from './Toolbar.vue'
import { useAnnotationHistory } from '../composables/useAnnotationHistory'
import { useToolManager } from '../composables/useToolManager'
import { canvasToDataUrl, copyToClipboard, saveToFile } from '../utils/export'

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
