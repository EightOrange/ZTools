import type { Canvas as FabricCanvas, TPointerEventInfo } from 'fabric'

export enum ToolType {
  Rect = 'rect',
  Ellipse = 'ellipse',
  Arrow = 'arrow',
  Line = 'line',
  Brush = 'brush',
  Text = 'text',
  Mosaic = 'mosaic',
  Number = 'number'
}

export interface ToolOptions {
  color: string
  strokeWidth: number
  fontSize: number
  filled: boolean
}

export const DEFAULT_TOOL_OPTIONS: ToolOptions = {
  color: '#ff0000',
  strokeWidth: 2,
  fontSize: 16,
  filled: false
}

export const PRESET_COLORS = ['#ff0000', '#00cc00', '#0066ff', '#ffcc00', '#ffffff', '#000000']

export interface AnnotationTool {
  readonly type: ToolType
  activate(canvas: FabricCanvas, options: ToolOptions): void
  deactivate(): void
  onMouseDown(event: TPointerEventInfo): void
  onMouseMove(event: TPointerEventInfo): void
  onMouseUp(event: TPointerEventInfo): void
}
