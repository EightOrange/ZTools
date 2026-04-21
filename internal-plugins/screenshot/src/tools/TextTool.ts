import { IText, type TPointerEventInfo } from 'fabric'
import { BaseTool } from './BaseTool'
import { ToolType } from './types'

export class TextTool extends BaseTool {
  readonly type = ToolType.Text

  onMouseDown(event: TPointerEventInfo): void {
    if (!this.canvas) return
    const pointer = this.canvas.getScenePoint(event.e)
    const target = this.canvas.findTarget(event.e)
    if (target instanceof IText) return

    const text = new IText('', {
      left: pointer.x,
      top: pointer.y,
      fontFamily: 'Arial, sans-serif',
      fontSize: this.options.fontSize,
      fill: this.options.color,
      selectable: true,
      evented: true,
      editable: true
    })
    this.canvas.add(text)
    this.canvas.setActiveObject(text)
    text.enterEditing()
  }

  onMouseMove(_event: TPointerEventInfo): void {}
  onMouseUp(_event: TPointerEventInfo): void {}
}
