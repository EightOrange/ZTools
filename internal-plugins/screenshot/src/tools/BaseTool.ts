import type { Canvas as FabricCanvas, TPointerEventInfo } from 'fabric'
import type { AnnotationTool, ToolOptions, ToolType } from './types'

export abstract class BaseTool implements AnnotationTool {
  abstract readonly type: ToolType
  protected canvas: FabricCanvas | null = null
  protected options: ToolOptions = {
    color: '#ff0000',
    strokeWidth: 2,
    fontSize: 16,
    filled: false
  }
  protected isDrawing = false

  activate(canvas: FabricCanvas, options: ToolOptions): void {
    this.canvas = canvas
    this.options = { ...options }
    canvas.isDrawingMode = false
    canvas.selection = false
    canvas.defaultCursor = 'crosshair'
    this.onActivate()
  }

  deactivate(): void {
    if (this.canvas) {
      this.canvas.selection = true
      this.canvas.defaultCursor = 'default'
    }
    this.isDrawing = false
    this.onDeactivate()
  }

  protected onActivate(): void {}
  protected onDeactivate(): void {}

  abstract onMouseDown(event: TPointerEventInfo): void
  abstract onMouseMove(event: TPointerEventInfo): void
  abstract onMouseUp(event: TPointerEventInfo): void
}
