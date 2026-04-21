/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, any>
  export default component
}

interface Window {
  __screenshotBridge?: {
    onInit: (callback: (data: any) => void) => void
    cancel: () => void
    copyToClipboard: (dataUrl: string) => Promise<{ success: boolean }>
    saveToFile: (dataUrl: string) => Promise<{ success: boolean; path?: string }>
  }
}
