import { exec } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import { app, nativeImage } from 'electron'

interface OcrResult {
  text: string
  lines: Array<{ text: string; bounds?: { x: number; y: number; w: number; h: number } }>
  engine: 'windows-ocr' | 'tesseract'
}

class OcrService {
  private tesseractWorker: any = null
  async recognize(imageInput: string | Buffer, lang = 'zh-Hans'): Promise<OcrResult> {
    if (process.platform === 'win32') {
      try {
        return await this.recognizeWithWindowsOcr(imageInput, lang)
      } catch (error) {
        console.warn('[OCR] Windows OCR failed, trying Tesseract.js fallback:', error)
      }
    }

    return this.recognizeWithTesseract(imageInput, lang)
  }

  private async recognizeWithWindowsOcr(
    imageInput: string | Buffer,
    lang: string
  ): Promise<OcrResult> {
    let imagePath: string
    let tempCreated = false

    if (typeof imageInput === 'string') {
      if (imageInput.startsWith('data:')) {
        imagePath = await this.dataUrlToTempFile(imageInput)
        tempCreated = true
      } else {
        imagePath = imageInput
      }
    } else {
      const tempDir = path.join(app.getPath('temp'), 'ztools-ocr')
      await fs.mkdir(tempDir, { recursive: true })
      imagePath = path.join(tempDir, `ocr-${Date.now()}.png`)
      await fs.writeFile(imagePath, imageInput)
      tempCreated = true
    }

    try {
      const ocrLang = this.mapLangToWindowsOcr(lang)
      const psScript = `
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder,Windows.Foundation,ContentType=WindowsRuntime]

function Await($WinRtTask, $ResultType) {
  $asTask = $WinRtTask.AsTask()
  $asTask.Wait()
  $asTask.Result
}

$imgPath = '${imagePath.replace(/\\/g, '\\\\').replace(/'/g, "''")}'
$stream = [System.IO.File]::OpenRead($imgPath)
$raStream = [System.IO.WindowsRuntimeStreamExtensions]::AsRandomAccessStream($stream)
$decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($raStream)) ([Windows.Graphics.Imaging.BitmapDecoder])
$bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])

$ocrEngine = $null
try {
  $lang = New-Object Windows.Globalization.Language('${ocrLang}')
  if ([Windows.Media.Ocr.OcrEngine]::IsLanguageSupported($lang)) {
    $ocrEngine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($lang)
  }
} catch {}
if ($null -eq $ocrEngine) {
  $ocrEngine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
}
if ($null -eq $ocrEngine) { throw 'No OCR engine available' }

$result = Await ($ocrEngine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
$stream.Dispose()

$output = @{ text = $result.Text; lines = @() }
foreach ($line in $result.Lines) {
  $words = ($line.Words | ForEach-Object { $_.Text }) -join ' '
  $output.lines += @{ text = $words }
}
$output | ConvertTo-Json -Depth 3
`.trim()

      const result = await this.runPowerShell(psScript)
      const parsed = JSON.parse(result)
      return {
        text: parsed.text || '',
        lines: (parsed.lines || []).map((l: any) => ({ text: l.text || '' })),
        engine: 'windows-ocr'
      }
    } finally {
      if (tempCreated) {
        fs.unlink(imagePath).catch(() => {})
      }
    }
  }

  private async recognizeWithTesseract(
    imageInput: string | Buffer,
    lang: string
  ): Promise<OcrResult> {
    let Tesseract: any
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      Tesseract = globalThis.require?.('tesseract.js')
    } catch {
      throw new Error(
        'Tesseract.js is not installed. Please install it to use OCR on non-Windows platforms.'
      )
    }
    if (!Tesseract) {
      throw new Error('Tesseract.js is not available')
    }

    try {
      const tessLang = this.mapLangToTesseract(lang)
      const cachePath = path.join(app.getPath('userData'), 'tesseract-lang')
      await fs.mkdir(cachePath, { recursive: true })

      let input: string | Buffer = imageInput
      if (typeof imageInput === 'string' && imageInput.startsWith('data:')) {
        const img = nativeImage.createFromDataURL(imageInput)
        input = img.toPNG()
      }

      const result = await Tesseract.recognize(input, tessLang, {
        langPath: cachePath,
        cacheMethod: 'readOnly'
      } as any)

      return {
        text: result.data.text.trim(),
        lines: result.data.lines.map((l: any) => ({
          text: l.text.trim(),
          bounds: l.bbox
            ? { x: l.bbox.x0, y: l.bbox.y0, w: l.bbox.x1 - l.bbox.x0, h: l.bbox.y1 - l.bbox.y0 }
            : undefined
        })),
        engine: 'tesseract'
      }
    } catch (error) {
      console.error('[OCR] Tesseract.js failed:', error)
      throw new Error(
        `OCR recognition failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  private runPowerShell(script: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const encoded = Buffer.from(script, 'utf16le').toString('base64')
      exec(
        `powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`,
        { timeout: 30000, maxBuffer: 10 * 1024 * 1024 },
        (error, stdout, stderr) => {
          if (error) {
            reject(new Error(stderr || error.message))
          } else {
            resolve(stdout.trim())
          }
        }
      )
    })
  }

  private async dataUrlToTempFile(dataUrl: string): Promise<string> {
    const img = nativeImage.createFromDataURL(dataUrl)
    const tempDir = path.join(app.getPath('temp'), 'ztools-ocr')
    await fs.mkdir(tempDir, { recursive: true })
    const filePath = path.join(tempDir, `ocr-${Date.now()}.png`)
    await fs.writeFile(filePath, img.toPNG())
    return filePath
  }

  private mapLangToWindowsOcr(lang: string): string {
    const map: Record<string, string> = {
      'zh-Hans': 'zh-Hans-CN',
      'zh-Hant': 'zh-Hant-TW',
      en: 'en-US',
      ja: 'ja-JP',
      ko: 'ko-KR'
    }
    return map[lang] || lang
  }

  private mapLangToTesseract(lang: string): string {
    const map: Record<string, string> = {
      'zh-Hans': 'chi_sim+eng',
      'zh-Hant': 'chi_tra+eng',
      en: 'eng',
      ja: 'jpn+eng',
      ko: 'kor+eng'
    }
    return map[lang] || 'eng'
  }

  async cleanup(): Promise<void> {
    if (this.tesseractWorker) {
      try {
        await this.tesseractWorker.terminate()
      } catch {}
      this.tesseractWorker = null
      // tesseract worker cleaned up
    }
    try {
      const tempDir = path.join(app.getPath('temp'), 'ztools-ocr')
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch {}
  }
}

export default new OcrService()
