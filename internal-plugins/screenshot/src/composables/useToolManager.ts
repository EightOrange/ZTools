import { ref, watch, type Ref } from 'vue'
import type { Canvas as FabricCanvas, TPointerEventInfo } from 'fabric'
import { ToolType, createTool, DEFAULT_TOOL_OPTIONS } from '../tools'
import type { AnnotationTool, ToolOptions } from '../tools'

export function useToolManager(canvas: Ref<FabricCanvas | null>, onObjectModified?: () => void) {
  const currentToolType = ref<ToolType | null>(null)
  const options = ref<ToolOptions>({ ...DEFAULT_TOOL_OPTIONS })
  let activeTool: AnnotationTool | null = null

  watch(canvas, () => {
    if (activeTool && canvas.value && currentToolType.value) {
      activeTool.activate(canvas.value, options.value)
    }
  })

  function selectTool(type: ToolType | null): void {
    if (activeTool) {
      activeTool.deactivate()
      activeTool = null
    }
    currentToolType.value = type
    if (type && canvas.value) {
      activeTool = createTool(type)
      activeTool.activate(canvas.value, options.value)
    }
  }

  function updateOptions(partial: Partial<ToolOptions>): void {
    Object.assign(options.value, partial)
    if (activeTool && canvas.value) {
      activeTool.activate(canvas.value, options.value)
    }
  }

  function handleMouseDown(e: TPointerEventInfo): void {
    activeTool?.onMouseDown(e)
  }

  function handleMouseMove(e: TPointerEventInfo): void {
    activeTool?.onMouseMove(e)
  }

  function handleMouseUp(e: TPointerEventInfo): void {
    activeTool?.onMouseUp(e)
    onObjectModified?.()
  }

  function cleanup(): void {
    selectTool(null)
  }

  return {
    currentToolType,
    options,
    selectTool,
    updateOptions,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    cleanup
  }
}
