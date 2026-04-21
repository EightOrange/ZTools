<template>
  <div class="tool-properties">
    <div class="color-picker">
      <button
        v-for="c in PRESET_COLORS"
        :key="c"
        class="color-swatch"
        :class="{ active: options.color === c }"
        :style="{ background: c }"
        @click="$emit('update', { color: c })"
      />
    </div>

    <div class="size-control">
      <span class="label">粗细</span>
      <input
        type="range"
        min="1"
        max="12"
        :value="options.strokeWidth"
        @input="
          $emit('update', {
            strokeWidth: Number(($event.target as HTMLInputElement).value)
          })
        "
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { PRESET_COLORS } from '../tools'
import type { ToolOptions } from '../tools'

defineProps<{
  options: ToolOptions
}>()

defineEmits<{
  update: [partial: Partial<ToolOptions>]
}>()
</script>

<style scoped>
.tool-properties {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-picker {
  display: flex;
  gap: 3px;
}

.color-swatch {
  width: 18px;
  height: 18px;
  border: 2px solid transparent;
  border-radius: 50%;
  cursor: pointer;
  padding: 0;
}

.color-swatch.active {
  border-color: #00aeff;
}

.size-control {
  display: flex;
  align-items: center;
  gap: 4px;
}

.label {
  color: #999;
  font-size: 11px;
  white-space: nowrap;
}

input[type='range'] {
  width: 60px;
  height: 4px;
  accent-color: #00aeff;
}
</style>
