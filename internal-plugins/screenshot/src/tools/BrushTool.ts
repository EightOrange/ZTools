import { PencilBrush, type Canvas as FabricCanvas, type TPointerEventInfo } from 'fabric'
import { BaseTool } from './BaseTool'
import { ToolType, type ToolOptions } from './types'

export class BrushTool extends BaseTool {
  readonly type = ToolType.Brush

  protected onActivate(): void {
    if (!this.canvas) return
    this.canvas.isDrawingMode = true
    const brush = new PencilBrush(this.canvas)
    brush.color = this.options.color
    brush.width = this.options.strokeWidth
    this.canvas.freeDrawingBrush = brush
  }

  protected onDeactivate(): void {
    if (this.canvas) {
      this.canvas.isDrawingMode = false
    }
  }

  activate(canvas: FabricCanvas, options: ToolOptions): void {
    this.canvas = canvas
    this.options = { ...options }
    canvas.selection = false
    this.onActivate()
  }

  onMouseDown(_event: TPointerEventInfo): void {}
  onMouseMove(_event: TPointerEventInfo): void {}
  onMouseUp(_event: TPointerEventInfo): void {}
}
