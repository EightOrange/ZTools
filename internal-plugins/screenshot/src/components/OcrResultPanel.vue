<template>
  <div class="ocr-panel" @mousedown.stop>
    <div class="ocr-header">
      <span class="ocr-title">OCR 识别结果</span>
      <span v-if="engine" class="ocr-engine">{{ engine }}</span>
      <button class="ocr-close" @click="$emit('close')">✕</button>
    </div>
    <div v-if="loading" class="ocr-loading">
      <div class="spinner" />
      <span>正在识别...</span>
    </div>
    <div v-else-if="error" class="ocr-error">
      <span>识别失败: {{ error }}</span>
    </div>
    <div v-else class="ocr-body">
      <textarea ref="textareaRef" class="ocr-text" readonly :value="text" />
      <div class="ocr-actions">
        <button class="ocr-btn primary" @click="copyText">复制文本</button>
        <span v-if="copied" class="copied-tip">已复制</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'

const props = defineProps<{
  text: string
  loading: boolean
  error: string
  engine: string
}>()

defineEmits<{ close: [] }>()

const textareaRef = ref<HTMLTextAreaElement>()
const copied = ref(false)

watch(
  () => props.text,
  async () => {
    await nextTick()
    if (textareaRef.value) {
      textareaRef.value.scrollTop = 0
    }
  }
)

async function copyText(): void {
  if (!props.text) return
  try {
    await navigator.clipboard.writeText(props.text)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    const ta = textareaRef.value
    if (ta) {
      ta.select()
      document.execCommand('copy')
      copied.value = true
      setTimeout(() => (copied.value = false), 2000)
    }
  }
}
</script>

<style scoped>
.ocr-panel {
  position: fixed;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  width: 320px;
  max-height: 400px;
  background: #2a2a2a;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  z-index: 200;
  overflow: hidden;
}

.ocr-header {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #444;
  gap: 8px;
}

.ocr-title {
  font-size: 13px;
  color: #eee;
  font-weight: 500;
  flex: 1;
}

.ocr-engine {
  font-size: 10px;
  color: #888;
  background: #383838;
  padding: 2px 6px;
  border-radius: 3px;
}

.ocr-close {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: #999;
  font-size: 14px;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ocr-close:hover {
  background: #444;
  color: #fff;
}

.ocr-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px;
  color: #aaa;
  font-size: 13px;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #555;
  border-top-color: #00aeff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.ocr-error {
  padding: 16px;
  color: #ff6b6b;
  font-size: 12px;
  text-align: center;
}

.ocr-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.ocr-text {
  flex: 1;
  min-height: 120px;
  max-height: 280px;
  padding: 10px 12px;
  background: #1e1e1e;
  color: #ddd;
  border: none;
  font-size: 13px;
  line-height: 1.5;
  resize: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.ocr-text:focus {
  outline: none;
}

.ocr-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid #444;
}

.ocr-btn {
  padding: 4px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.ocr-btn.primary {
  background: #00aeff;
  color: #fff;
}

.ocr-btn.primary:hover {
  background: #0099dd;
}

.copied-tip {
  font-size: 11px;
  color: #4caf50;
}
</style>
