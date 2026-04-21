import { Line, Triangle, Group, type TPointerEventInfo } from 'fabric'
import { BaseTool } from './BaseTool'
import { ToolType } from './types'

export class ArrowTool extends BaseTool {
  readonly type = ToolType.Arrow
  private line: Line | null = null
  private startX = 0
  private startY = 0

  onMouseDown(event: TPointerEventInfo): void {
    if (!this.canvas) return
    const pointer = this.canvas.getScenePoint(event.e)
    this.isDrawing = true
    this.startX = pointer.x
    this.startY = pointer.y

    this.line = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
      stroke: this.options.color,
      strokeWidth: this.options.strokeWidth,
      selectable: false,
      evented: false
    })
    this.canvas.add(this.line)
  }

  onMouseMove(event: TPointerEventInfo): void {
    if (!this.isDrawing || !this.line || !this.canvas) return
    const pointer = this.canvas.getScenePoint(event.e)
    this.line.set({ x2: pointer.x, y2: pointer.y })
    this.canvas.requestRenderAll()
  }

  onMouseUp(event: TPointerEventInfo): void {
    if (!this.isDrawing || !this.line || !this.canvas) return
    this.isDrawing = false
    const pointer = this.canvas.getScenePoint(event.e)

    const dx = pointer.x - this.startX
    const dy = pointer.y - this.startY
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len < 5) {
      this.canvas.remove(this.line)
      this.line = null
      return
    }

    this.canvas.remove(this.line)

    const angle = Math.atan2(dy, dx) * (180 / Math.PI)
    const headSize = Math.max(10, this.options.strokeWidth * 4)

    const shaft = new Line([this.startX, this.startY, pointer.x, pointer.y], {
      stroke: this.options.color,
      strokeWidth: this.options.strokeWidth
    })

    const head = new Triangle({
      left: pointer.x,
      top: pointer.y,
      width: headSize,
      height: headSize,
      fill: this.options.color,
      angle: angle + 90,
      originX: 'center',
      originY: 'center'
    })

    const group = new Group([shaft, head], { selectable: true, evented: true })
    this.canvas.add(group)
    this.line = null
  }
}
