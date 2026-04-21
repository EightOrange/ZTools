import { Circle, FabricText, Group, type TPointerEventInfo } from 'fabric'
import { BaseTool } from './BaseTool'
import { ToolType } from './types'

let globalCounter = 1

export class NumberTool extends BaseTool {
  readonly type = ToolType.Number

  static resetCounter(): void {
    globalCounter = 1
  }

  onMouseDown(event: TPointerEventInfo): void {
    if (!this.canvas) return
    const pointer = this.canvas.getScenePoint(event.e)
    const radius = Math.max(12, this.options.fontSize * 0.8)
    const num = globalCounter++

    const circle = new Circle({
      radius,
      fill: this.options.color,
      originX: 'center',
      originY: 'center'
    })

    const text = new FabricText(String(num), {
      fontSize: radius,
      fill: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      originX: 'center',
      originY: 'center'
    })

    const group = new Group([circle, text], {
      left: pointer.x,
      top: pointer.y,
      originX: 'center',
      originY: 'center',
      selectable: true,
      evented: true
    })
    this.canvas.add(group)
  }

  onMouseMove(_event: TPointerEventInfo): void {}
  onMouseUp(_event: TPointerEventInfo): void {}
}
