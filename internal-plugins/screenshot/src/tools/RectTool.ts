import { Rect, type TPointerEventInfo } from 'fabric'
import { BaseTool } from './BaseTool'
import { ToolType } from './types'

export class RectTool extends BaseTool {
  readonly type = ToolType.Rect
  private rect: Rect | null = null
  private originX = 0
  private originY = 0

  onMouseDown(event: TPointerEventInfo): void {
    if (!this.canvas) return
    const pointer = this.canvas.getScenePoint(event.e)
    this.isDrawing = true
    this.originX = pointer.x
    this.originY = pointer.y

    this.rect = new Rect({
      left: pointer.x,
      top: pointer.y,
      width: 0,
      height: 0,
      stroke: this.options.color,
      strokeWidth: this.options.strokeWidth,
      fill: this.options.filled ? this.options.color + '33' : 'transparent',
      selectable: true,
      evented: true
    })
    this.canvas.add(this.rect)
  }

  onMouseMove(event: TPointerEventInfo): void {
    if (!this.isDrawing || !this.rect || !this.canvas) return
    const pointer = this.canvas.getScenePoint(event.e)
    this.rect.set({
      left: Math.min(this.originX, pointer.x),
      top: Math.min(this.originY, pointer.y),
      width: Math.abs(pointer.x - this.originX),
      height: Math.abs(pointer.y - this.originY)
    })
    this.canvas.requestRenderAll()
  }

  onMouseUp(): void {
    if (!this.isDrawing || !this.rect || !this.canvas) return
    this.isDrawing = false
    if (this.rect.width! < 3 && this.rect.height! < 3) {
      this.canvas.remove(this.rect)
    } else {
      this.rect.setCoords()
    }
    this.rect = null
  }
}
