<template>
  <div class="toolbar" :style="toolbarStyle" @mousedown.stop>
    <div class="tool-group">
      <button
        v-for="tool in allTools"
        :key="tool.type"
        class="tool-btn"
        :class="{ active: currentTool === tool.type }"
        :title="tool.label"
        @click="$emit('select-tool', currentTool === tool.type ? null : tool.type)"
      >
        {{ tool.icon }}
      </button>
    </div>

    <div class="separator" />

    <ToolProperties
      v-if="currentTool"
      :options="options"
      @update="$emit('update-options', $event)"
    />

    <div v-if="currentTool" class="separator" />

    <div class="action-group">
      <button class="action-btn" title="撤销" :disabled="!canUndo" @click="$emit('undo')">↶</button>
      <button class="action-btn" title="重做" :disabled="!canRedo" @click="$emit('redo')">↷</button>
      <div class="separator" />
      <button class="action-btn save" title="保存" @click="$emit('save')">💾</button>
      <button class="action-btn primary" title="复制到剪贴板" @click="$emit('copy')">✓</button>
      <button class="action-btn cancel" title="取消" @click="$emit('cancel')">✕</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ToolType, TOOL_LABELS, TOOL_ICONS } from '../tools'
import type { ToolOptions } from '../tools'
import ToolProperties from './ToolProperties.vue'

const props = defineProps<{
  currentTool: ToolType | null
  options: ToolOptions
  canUndo: boolean
  canRedo: boolean
  toolbarTop: number
  toolbarLeft: number
}>()

defineEmits<{
  'select-tool': [type: ToolType | null]
  'update-options': [partial: Partial<ToolOptions>]
  undo: []
  redo: []
  copy: []
  save: []
  cancel: []
}>()

const allTools = Object.values(ToolType).map((type) => ({
  type,
  label: TOOL_LABELS[type],
  icon: TOOL_ICONS[type]
}))

const toolbarStyle = computed(() => ({
  top: Math.min(props.toolbarTop, window.innerHeight - 60) + 'px',
  left: Math.max(0, props.toolbarLeft) + 'px'
}))
</script>

<style scoped>
.toolbar {
  position: fixed;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #2a2a2a;
  border-radius: 6px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
  z-index: 100;
  user-select: none;
}

.tool-group,
.action-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.separator {
  width: 1px;
  height: 24px;
  background: #555;
  margin: 0 4px;
}

.tool-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #ccc;
  font-size: 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
}

.tool-btn:hover {
  background: #444;
}

.tool-btn.active {
  background: #00aeff;
  color: #fff;
}

.action-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #ccc;
  font-size: 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
}

.action-btn:hover:not(:disabled) {
  background: #444;
}

.action-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.action-btn.primary {
  background: #00aeff;
  color: #fff;
}

.action-btn.primary:hover {
  background: #0099dd;
}

.action-btn.cancel {
  color: #ff4444;
}

.action-btn.save:hover {
  background: #444;
}
</style>
