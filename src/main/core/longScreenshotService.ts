import { desktopCapturer, screen } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import { app } from 'electron'

interface CaptureRegion {
  x: number
  y: number
  width: number
  height: number
}

interface LongScreenshotOptions {
  region: CaptureRegion
  scrollDelta?: number
  frameDelay?: number
  maxFrames?: number
  similarityThreshold?: number
}

interface CaptureProgress {
  frameCount: number
  maxFrames: number
  status: 'capturing' | 'stitching' | 'done' | 'error'
}

type ProgressCallback = (progress: CaptureProgress) => void

class LongScreenshotService {
  private isCapturing = false
  private shouldStop = false
  private tempDir = ''

  async startCapture(
    options: LongScreenshotOptions,
    onProgress?: ProgressCallback
  ): Promise<string> {
    if (this.isCapturing) {
      throw new Error('A long screenshot capture is already in progress')
    }

    const {
      region,
      scrollDelta = 3,
      frameDelay = 400,
      maxFrames = 50,
      similarityThreshold = 0.98
    } = options

    this.isCapturing = true
    this.shouldStop = false
    this.tempDir = path.join(app.getPath('temp'), 'ztools-longshot', `session-${Date.now()}`)
    await fs.mkdir(this.tempDir, { recursive: true })

    const framePaths: string[] = []

    try {
      const display = this.findDisplayForRegion(region)
      const scaleFactor = display.scaleFactor

      const physicalRegion: CaptureRegion = {
        x: Math.round(region.x * scaleFactor),
        y: Math.round(region.y * scaleFactor),
        width: Math.round(region.width * scaleFactor),
        height: Math.round(region.height * scaleFactor)
      }

      for (let i = 0; i < maxFrames; i++) {
        if (this.shouldStop) break

        onProgress?.({
          frameCount: i + 1,
          maxFrames,
          status: 'capturing'
        })

        const framePath = await this.captureFrame(display, physicalRegion, i)
        framePaths.push(framePath)

        if (framePaths.length >= 2) {
          const isDuplicate = await this.framesAreSimilar(
            framePaths[framePaths.length - 2],
            framePaths[framePaths.length - 1],
            similarityThreshold
          )
          if (isDuplicate) {
            framePaths.pop()
            await fs.unlink(framePaths[framePaths.length])
            break
          }
        }

        if (i < maxFrames - 1 && !this.shouldStop) {
          await this.simulateScroll(region, scrollDelta)
          await this.delay(frameDelay)
        }
      }

      onProgress?.({
        frameCount: framePaths.length,
        maxFrames,
        status: 'stitching'
      })

      const resultPath = await this.stitchFrames(framePaths)

      onProgress?.({
        frameCount: framePaths.length,
        maxFrames,
        status: 'done'
      })

      return resultPath
    } catch (error) {
      onProgress?.({
        frameCount: framePaths.length,
        maxFrames,
        status: 'error'
      })
      throw error
    } finally {
      this.isCapturing = false
    }
  }

  stop(): void {
    this.shouldStop = true
  }

  private findDisplayForRegion(region: CaptureRegion): Electron.Display {
    const centerX = region.x + region.width / 2
    const centerY = region.y + region.height / 2
    return screen.getDisplayNearestPoint({ x: centerX, y: centerY })
  }

  private async captureFrame(
    display: Electron.Display,
    physicalRegion: CaptureRegion,
    index: number
  ): Promise<string> {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: display.size.width * display.scaleFactor,
        height: display.size.height * display.scaleFactor
      }
    })

    const source = sources.find((s) => s.display_id === String(display.id)) || sources[0]
    if (!source) {
      throw new Error('No screen source available')
    }

    const fullImage = source.thumbnail
    const cropped = fullImage.crop({
      x: physicalRegion.x - display.bounds.x * display.scaleFactor,
      y: physicalRegion.y - display.bounds.y * display.scaleFactor,
      width: physicalRegion.width,
      height: physicalRegion.height
    })

    const framePath = path.join(this.tempDir, `frame-${String(index).padStart(4, '0')}.png`)
    await fs.writeFile(framePath, cropped.toPNG())
    return framePath
  }

  private async framesAreSimilar(
    pathA: string,
    pathB: string,
    threshold: number
  ): Promise<boolean> {
    try {
      const sharp = require('sharp')
      const bufA = await sharp(pathA).raw().toBuffer({ resolveWithObject: true })
      const bufB = await sharp(pathB).raw().toBuffer({ resolveWithObject: true })

      if (bufA.info.width !== bufB.info.width || bufA.info.height !== bufB.info.height) {
        return false
      }

      const pixelCount = bufA.info.width * bufA.info.height
      const channels = bufA.info.channels
      let matchCount = 0

      const sampleStep = Math.max(1, Math.floor(pixelCount / 10000))

      for (let i = 0; i < pixelCount; i += sampleStep) {
        const offset = i * channels
        let diff = 0
        for (let c = 0; c < channels; c++) {
          diff += Math.abs(bufA.data[offset + c] - bufB.data[offset + c])
        }
        if (diff / channels < 10) matchCount++
      }

      const similarity = matchCount / Math.ceil(pixelCount / sampleStep)
      return similarity >= threshold
    } catch {
      return false
    }
  }

  private async stitchFrames(framePaths: string[]): Promise<string> {
    if (framePaths.length === 0) {
      throw new Error('No frames to stitch')
    }

    if (framePaths.length === 1) {
      const resultPath = path.join(this.tempDir, 'result.png')
      await fs.copyFile(framePaths[0], resultPath)
      return resultPath
    }

    const sharp = require('sharp')
    const firstMeta = await sharp(framePaths[0]).metadata()
    const frameWidth = firstMeta.width!
    const frameHeight = firstMeta.height!

    const strips: { path: string; yStart: number; yEnd: number }[] = []
    strips.push({ path: framePaths[0], yStart: 0, yEnd: frameHeight })

    let totalHeight = frameHeight

    for (let i = 1; i < framePaths.length; i++) {
      const overlap = await this.findOverlap(
        framePaths[i - 1],
        framePaths[i],
        frameWidth,
        frameHeight
      )
      const uniqueHeight = frameHeight - overlap
      if (uniqueHeight <= 0) continue

      strips.push({
        path: framePaths[i],
        yStart: overlap,
        yEnd: frameHeight
      })
      totalHeight += uniqueHeight
    }

    const compositeInputs: Array<{ input: Buffer; top: number; left: number }> = []
    let currentY = 0

    for (const strip of strips) {
      const stripHeight = strip.yEnd - strip.yStart
      const buf = await sharp(strip.path)
        .extract({
          left: 0,
          top: strip.yStart,
          width: frameWidth,
          height: stripHeight
        })
        .toBuffer()

      compositeInputs.push({ input: buf, top: currentY, left: 0 })
      currentY += stripHeight
    }

    const resultPath = path.join(this.tempDir, 'result.png')
    await sharp({
      create: {
        width: frameWidth,
        height: totalHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite(compositeInputs)
      .png()
      .toFile(resultPath)

    return resultPath
  }

  private async findOverlap(
    prevPath: string,
    currPath: string,
    width: number,
    height: number
  ): Promise<number> {
    const sharp = require('sharp')
    const templateFraction = 0.2
    const searchFraction = 0.8
    const templateHeight = Math.round(height * templateFraction)
    const searchHeight = Math.round(height * searchFraction)

    const templateBuf = await sharp(prevPath)
      .extract({
        left: 0,
        top: height - templateHeight,
        width,
        height: templateHeight
      })
      .greyscale()
      .raw()
      .toBuffer()

    const searchBuf = await sharp(currPath)
      .extract({
        left: 0,
        top: 0,
        width,
        height: searchHeight
      })
      .greyscale()
      .raw()
      .toBuffer()

    let bestOffset = 0
    let bestScore = Infinity

    const rowBytes = width
    const sampleCols = Math.min(width, 200)
    const colStep = Math.max(1, Math.floor(width / sampleCols))

    for (let offset = 0; offset <= searchHeight - templateHeight; offset += 2) {
      let totalDiff = 0
      const rowsToCheck = [
        0,
        Math.floor(templateHeight / 4),
        Math.floor(templateHeight / 2),
        templateHeight - 1
      ]

      for (const row of rowsToCheck) {
        const tRowStart = row * rowBytes
        const sRowStart = (offset + row) * rowBytes

        for (let col = 0; col < width; col += colStep) {
          totalDiff += Math.abs(templateBuf[tRowStart + col] - searchBuf[sRowStart + col])
        }
      }

      if (totalDiff < bestScore) {
        bestScore = totalDiff
        bestOffset = offset
      }
    }

    const matchQuality = bestScore / (4 * sampleCols)
    if (matchQuality > 30) {
      return Math.round(height * 0.1)
    }

    return bestOffset + templateHeight
  }

  private async simulateScroll(region: CaptureRegion, delta: number): Promise<void> {
    if (process.platform === 'win32') {
      await this.simulateScrollWindows(region, delta)
    } else if (process.platform === 'darwin') {
      await this.simulateScrollMac(region, delta)
    } else {
      await this.simulateScrollLinux(region, delta)
    }
  }

  private simulateScrollWindows(region: CaptureRegion, delta: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const targetX = Math.round(region.x + region.width / 2)
      const targetY = Math.round(region.y + region.height / 2)
      const wheelAmount = -120 * delta

      const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinInput {
  [DllImport("user32.dll")]
  public static extern bool SetCursorPos(int X, int Y);
  [DllImport("user32.dll")]
  public static extern void mouse_event(uint dwFlags, uint dx, uint dy, int dwData, IntPtr dwExtraInfo);
  public const uint MOUSEEVENTF_WHEEL = 0x0800;
  public static void ScrollAt(int x, int y, int amount) {
    SetCursorPos(x, y);
    System.Threading.Thread.Sleep(50);
    mouse_event(MOUSEEVENTF_WHEEL, 0, 0, amount, IntPtr.Zero);
  }
}
"@
[WinInput]::ScrollAt(${targetX}, ${targetY}, ${wheelAmount})
`
      const { exec } = require('child_process')
      exec(
        `powershell -NoProfile -NonInteractive -Command "${script.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`,
        { timeout: 5000 },
        (err: any) => {
          if (err) reject(err)
          else resolve()
        }
      )
    })
  }

  private simulateScrollMac(_region: CaptureRegion, delta: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = `
tell application "System Events"
  scroll down ${delta}
end tell`
      const { exec } = require('child_process')
      exec(`osascript -e '${script}'`, { timeout: 5000 }, (err: any) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  private simulateScrollLinux(_region: CaptureRegion, delta: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const { exec } = require('child_process')
      const clicks = delta
      let cmd = ''
      for (let i = 0; i < clicks; i++) {
        cmd += 'xdotool click 5; '
      }
      exec(cmd.trim(), { timeout: 5000 }, (err: any) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async cleanup(): Promise<void> {
    try {
      const baseDir = path.join(app.getPath('temp'), 'ztools-longshot')
      await fs.rm(baseDir, { recursive: true, force: true })
    } catch {
      // best-effort
    }
  }
}

export default new LongScreenshotService()
