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

onMounted(() => {
  const { ipcRenderer } = (window as any).electron || {}
  if (ipcRenderer) {
    ipcRenderer.on('screenshot-init', (_event: unknown, data: any) => {
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
  const ztools = (window as any).ztools
  if (ztools) {
    ztools.send?.('screenshot:cancel')
  }
}

function onDone() {
  const ztools = (window as any).ztools
  if (ztools) {
    ztools.send?.('screenshot:cancel')
  }
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
