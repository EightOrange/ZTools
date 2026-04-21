<template>
  <div class="screenshot-overlay">
    <RegionSelector
      v-if="mode === 'select'"
      :screenshot-data-url="screenshotDataUrl"
      :scale-factor="scaleFactor"
      @region-selected="onRegionSelected"
      @cancel="onCancel"
    />
    <AnnotationEditor
      v-else-if="mode === 'annotate'"
      :image-data-url="croppedImageDataUrl"
      :region="selectedRegion"
      @done="onDone"
      @cancel="onCancel"
      @long-screenshot="onEnterLongScreenshot"
    />
    <LongScreenshotGuide
      v-else-if="mode === 'long-screenshot'"
      :screenshot-data-url="screenshotDataUrl"
      :scale-factor="scaleFactor"
      @done="onLongScreenshotDone"
      @cancel="onCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import RegionSelector from './components/RegionSelector.vue'
import AnnotationEditor from './components/AnnotationEditor.vue'
import LongScreenshotGuide from './components/LongScreenshotGuide.vue'

interface Region {
  x: number
  y: number
  width: number
  height: number
}

const mode = ref<'select' | 'annotate' | 'long-screenshot'>('select')
const screenshotDataUrl = ref('')
const scaleFactor = ref(1)
const croppedImageDataUrl = ref('')
const selectedRegion = ref<Region>({ x: 0, y: 0, width: 0, height: 0 })

const bridge = (window as any).__screenshotBridge

onMounted(() => {
  if (bridge) {
    bridge.onInit((data: any) => {
      scaleFactor.value = data.scaleFactor || 1
      if (data.filePath && bridge.readFileAsDataUrl) {
        screenshotDataUrl.value = bridge.readFileAsDataUrl(data.filePath)
      }
    })
  }
})

function onRegionSelected(region: Region, croppedDataUrl: string) {
  selectedRegion.value = region
  croppedImageDataUrl.value = croppedDataUrl
  mode.value = 'annotate'
}

function onEnterLongScreenshot() {
  mode.value = 'long-screenshot'
}

function onLongScreenshotDone(dataUrl: string) {
  croppedImageDataUrl.value = dataUrl
  selectedRegion.value = {
    x: 0,
    y: 0,
    width: window.innerWidth,
    height: Math.min(window.innerHeight, 800)
  }
  mode.value = 'annotate'
}

function onCancel() {
  if (bridge) {
    bridge.cancel()
  } else {
    window.close()
  }
}

function onDone() {
  if (bridge) {
    bridge.cancel()
  } else {
    window.close()
  }
}
</script>

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
}

.screenshot-overlay {
  width: 100%;
  height: 100%;
  position: relative;
  user-select: none;
  cursor: crosshair;
}
</style>
