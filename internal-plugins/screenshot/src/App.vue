<template>
  <div class="screenshot-overlay">
    <RegionSelector
      v-if="mode === 'select'"
      :screenshot-file-path="screenshotFilePath"
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
const screenshotFilePath = ref('')
const scaleFactor = ref(1)
const croppedImageDataUrl = ref('')
const selectedRegion = ref<Region>({ x: 0, y: 0, width: 0, height: 0 })

const bridge = (window as any).__screenshotBridge

onMounted(() => {
  if (bridge) {
    bridge.onInit((data: any) => {
      screenshotFilePath.value = data.filePath
      scaleFactor.value = data.scaleFactor || 1
    })
  }
})

function onRegionSelected(region: Region, croppedDataUrl: string) {
  selectedRegion.value = region
  croppedImageDataUrl.value = croppedDataUrl
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
