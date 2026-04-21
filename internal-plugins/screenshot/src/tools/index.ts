import type { AnnotationTool } from './types'
import { ToolType } from './types'
import { RectTool } from './RectTool'
import { EllipseTool } from './EllipseTool'
import { ArrowTool } from './ArrowTool'
import { LineTool } from './LineTool'
import { BrushTool } from './BrushTool'
import { TextTool } from './TextTool'
import { MosaicTool } from './MosaicTool'
import { NumberTool } from './NumberTool'

export { ToolType } from './types'
export type { AnnotationTool, ToolOptions } from './types'
export { DEFAULT_TOOL_OPTIONS, PRESET_COLORS } from './types'

const TOOL_CONSTRUCTORS: Record<ToolType, new () => AnnotationTool> = {
  [ToolType.Rect]: RectTool,
  [ToolType.Ellipse]: EllipseTool,
  [ToolType.Arrow]: ArrowTool,
  [ToolType.Line]: LineTool,
  [ToolType.Brush]: BrushTool,
  [ToolType.Text]: TextTool,
  [ToolType.Mosaic]: MosaicTool,
  [ToolType.Number]: NumberTool
}

export function createTool(type: ToolType): AnnotationTool {
  const Ctor = TOOL_CONSTRUCTORS[type]
  return new Ctor()
}

export const TOOL_LABELS: Record<ToolType, string> = {
  [ToolType.Rect]: '矩形',
  [ToolType.Ellipse]: '椭圆',
  [ToolType.Arrow]: '箭头',
  [ToolType.Line]: '直线',
  [ToolType.Brush]: '画笔',
  [ToolType.Text]: '文字',
  [ToolType.Mosaic]: '马赛克',
  [ToolType.Number]: '序号'
}

export const TOOL_ICONS: Record<ToolType, string> = {
  [ToolType.Rect]: '▭',
  [ToolType.Ellipse]: '◯',
  [ToolType.Arrow]: '➝',
  [ToolType.Line]: '╱',
  [ToolType.Brush]: '✎',
  [ToolType.Text]: 'T',
  [ToolType.Mosaic]: '▦',
  [ToolType.Number]: '#'
}
