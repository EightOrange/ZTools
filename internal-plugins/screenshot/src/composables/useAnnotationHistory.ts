import { ref } from 'vue'
import type { Canvas as FabricCanvas } from 'fabric'

interface HistoryState {
  json: string
}

export function useAnnotationHistory(canvas: () => FabricCanvas | null) {
  const undoStack = ref<HistoryState[]>([])
  const redoStack = ref<HistoryState[]>([])
  const canUndo = ref(false)
  const canRedo = ref(false)
  let saving = false

  function saveState(): void {
    const c = canvas()
    if (!c || saving) return
    saving = true
    try {
      const json = JSON.stringify(c.toJSON())
      undoStack.value.push({ json })
      redoStack.value = []
      canUndo.value = undoStack.value.length > 1
      canRedo.value = false
    } finally {
      saving = false
    }
  }

  function undo(): void {
    const c = canvas()
    if (!c || undoStack.value.length <= 1) return
    const current = undoStack.value.pop()!
    redoStack.value.push(current)
    const prev = undoStack.value[undoStack.value.length - 1]
    saving = true
    c.loadFromJSON(prev.json).then(() => {
      c.requestRenderAll()
      saving = false
      canUndo.value = undoStack.value.length > 1
      canRedo.value = redoStack.value.length > 0
    })
  }

  function redo(): void {
    const c = canvas()
    if (!c || redoStack.value.length === 0) return
    const next = redoStack.value.pop()!
    undoStack.value.push(next)
    saving = true
    c.loadFromJSON(next.json).then(() => {
      c.requestRenderAll()
      saving = false
      canUndo.value = undoStack.value.length > 1
      canRedo.value = redoStack.value.length > 0
    })
  }

  function clear(): void {
    undoStack.value = []
    redoStack.value = []
    canUndo.value = false
    canRedo.value = false
  }

  return { saveState, undo, redo, canUndo, canRedo, clear }
}
