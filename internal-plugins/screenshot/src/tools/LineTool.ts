import { Line, type TPointerEventInfo } from 'fabric'
import { BaseTool } from './BaseTool'
import { ToolType } from './types'

export class LineTool extends BaseTool {
  readonly type = ToolType.Line
  private line: Line | null = null

  onMouseDown(event: TPointerEventInfo): void {
    if (!this.canvas) return
    const pointer = this.canvas.getScenePoint(event.e)
    this.isDrawing = true
    this.line = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
      stroke: this.options.color,
      strokeWidth: this.options.strokeWidth,
      selectable: true,
      evented: true
    })
    this.canvas.add(this.line)
  }

  onMouseMove(event: TPointerEventInfo): void {
    if (!this.isDrawing || !this.line || !this.canvas) return
    const pointer = this.canvas.getScenePoint(event.e)
    this.line.set({ x2: pointer.x, y2: pointer.y })
    this.canvas.requestRenderAll()
  }

  onMouseUp(): void {
    if (!this.isDrawing || !this.line || !this.canvas) return
    this.isDrawing = false
    const dx = (this.line.x2 ?? 0) - (this.line.x1 ?? 0)
    const dy = (this.line.y2 ?? 0) - (this.line.y1 ?? 0)
    if (Math.sqrt(dx * dx + dy * dy) < 5) {
      this.canvas.remove(this.line)
    }
    this.line = null
  }
}
