<template>
  <div class="annotation-editor" />
</template>

<script setup lang="ts">
interface Region {
  x: number
  y: number
  width: number
  height: number
}

defineProps<{
  imageDataUrl: string
  region: Region
}>()

defineEmits<{
  (e: 'done'): void
  (e: 'cancel'): void
}>()
</script>
