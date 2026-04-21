<template>
  <div class="region-selector" />
</template>

<script setup lang="ts">
interface Region {
  x: number
  y: number
  width: number
  height: number
}

defineProps<{
  screenshotFilePath: string
  scaleFactor: number
}>()

defineEmits<{
  (e: 'region-selected', region: Region, croppedDataUrl: string): void
  (e: 'cancel'): void
}>()
</script>
