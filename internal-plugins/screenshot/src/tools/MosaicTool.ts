import { Rect, type TPointerEventInfo } from 'fabric'
import { BaseTool } from './BaseTool'
import { ToolType } from './types'

export class MosaicTool extends BaseTool {
  readonly type = ToolType.Mosaic
  private rects: Rect[] = []
  private backgroundImageData: ImageData | null = null

  protected onActivate(): void {
    this.captureBackground()
  }

  private captureBackground(): void {
    if (!this.canvas) return
    const canvasEl = (this.canvas as any).lowerCanvasEl as HTMLCanvasElement | undefined
    if (!canvasEl) return
    const ctx = canvasEl.getContext('2d')
    if (ctx) {
      this.backgroundImageData = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height)
    }
  }

  onMouseDown(event: TPointerEventInfo): void {
    if (!this.canvas) return
    this.isDrawing = true
    this.rects = []
    this.addMosaicBlock(event)
  }

  onMouseMove(event: TPointerEventInfo): void {
    if (!this.isDrawing) return
    this.addMosaicBlock(event)
  }

  onMouseUp(_event: TPointerEventInfo): void {
    this.isDrawing = false
  }

  private addMosaicBlock(event: TPointerEventInfo): void {
    if (!this.canvas || !this.backgroundImageData) return
    const pointer = this.canvas.getScenePoint(event.e)
    const blockSize = Math.max(8, this.options.strokeWidth * 4)
    const bx = Math.floor(pointer.x / blockSize) * blockSize
    const by = Math.floor(pointer.y / blockSize) * blockSize

    if (this.rects.some((r) => r.left === bx && r.top === by)) return

    const avgColor = this.getAverageColor(bx, by, blockSize)
    const rect = new Rect({
      left: bx,
      top: by,
      width: blockSize,
      height: blockSize,
      fill: avgColor,
      selectable: false,
      evented: false,
      strokeWidth: 0
    })
    this.canvas.add(rect)
    this.rects.push(rect)
  }

  private getAverageColor(x: number, y: number, size: number): string {
    if (!this.backgroundImageData) return '#888888'
    const { data, width, height } = this.backgroundImageData
    let r = 0,
      g = 0,
      b = 0,
      count = 0
    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        const px = x + dx
        const py = y + dy
        if (px < 0 || py < 0 || px >= width || py >= height) continue
        const i = (py * width + px) * 4
        r += data[i]
        g += data[i + 1]
        b += data[i + 2]
        count++
      }
    }
    if (count === 0) return '#888888'
    return `rgb(${Math.round(r / count)},${Math.round(g / count)},${Math.round(b / count)})`
  }
}
