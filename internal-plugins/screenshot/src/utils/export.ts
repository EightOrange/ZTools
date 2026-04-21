import type { Canvas as FabricCanvas } from 'fabric'

const bridge = (window as any).__screenshotBridge

export function canvasToDataUrl(
  canvas: FabricCanvas,
  format: 'png' | 'jpeg' = 'png',
  quality = 1
): string {
  return canvas.toDataURL({
    format,
    quality,
    multiplier: 1
  })
}

export async function copyToClipboard(dataUrl: string): Promise<boolean> {
  if (bridge?.copyToClipboard) {
    const result = await bridge.copyToClipboard(dataUrl)
    return result?.success ?? false
  }
  try {
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
    return true
  } catch {
    return false
  }
}

export async function saveToFile(dataUrl: string): Promise<boolean> {
  if (bridge?.saveToFile) {
    const result = await bridge.saveToFile(dataUrl)
    return result?.success ?? false
  }
  return false
}
