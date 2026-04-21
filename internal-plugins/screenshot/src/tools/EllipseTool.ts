import { Ellipse, type TPointerEventInfo } from 'fabric'
import { BaseTool } from './BaseTool'
import { ToolType } from './types'

export class EllipseTool extends BaseTool {
  readonly type = ToolType.Ellipse
  private ellipse: Ellipse | null = null
  private originX = 0
  private originY = 0

  onMouseDown(event: TPointerEventInfo): void {
    if (!this.canvas) return
    const pointer = this.canvas.getScenePoint(event.e)
    this.isDrawing = true
    this.originX = pointer.x
    this.originY = pointer.y

    this.ellipse = new Ellipse({
      left: pointer.x,
      top: pointer.y,
      rx: 0,
      ry: 0,
      stroke: this.options.color,
      strokeWidth: this.options.strokeWidth,
      fill: this.options.filled ? this.options.color + '33' : 'transparent',
      selectable: true,
      evented: true
    })
    this.canvas.add(this.ellipse)
  }

  onMouseMove(event: TPointerEventInfo): void {
    if (!this.isDrawing || !this.ellipse || !this.canvas) return
    const pointer = this.canvas.getScenePoint(event.e)
    this.ellipse.set({
      left: Math.min(this.originX, pointer.x),
      top: Math.min(this.originY, pointer.y),
      rx: Math.abs(pointer.x - this.originX) / 2,
      ry: Math.abs(pointer.y - this.originY) / 2
    })
    this.canvas.requestRenderAll()
  }

  onMouseUp(): void {
    if (!this.isDrawing || !this.ellipse || !this.canvas) return
    this.isDrawing = false
    if (this.ellipse.rx! < 3 && this.ellipse.ry! < 3) {
      this.canvas.remove(this.ellipse)
    } else {
      this.ellipse.setCoords()
    }
    this.ellipse = null
  }
}
