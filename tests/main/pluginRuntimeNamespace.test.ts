import { describe, expect, it } from 'vitest'
import {
  DEVELOPMENT_RUNTIME_NAMESPACE_SUFFIX,
  buildPluginDataVariantRecord,
  getDetachedWindowSizeKey,
  getPluginDataPrefix,
  getPluginDocId,
  getPluginRuntimeNamespace,
  getPluginSessionPartition,
  getPluginZBrowserPartition,
  parsePluginRuntimeNamespace
} from '../../src/shared/pluginRuntimeNamespace'

describe('pluginRuntimeNamespace', () => {
  it('keeps installed plugins on the original namespace', () => {
    expect(getPluginRuntimeNamespace('demo', 'installed')).toBe('demo')
    expect(getPluginDataPrefix('demo', 'installed')).toBe('PLUGIN/demo/')
    expect(getPluginDocId('demo', 'installed', 'settings')).toBe('PLUGIN/demo/settings')
  })

  it('adds the dev suffix for development plugins', () => {
    expect(getPluginRuntimeNamespace('demo', 'development')).toBe(
      `demo${DEVELOPMENT_RUNTIME_NAMESPACE_SUFFIX}`
    )
    expect(getPluginSessionPartition('demo', 'development')).toBe('persist:demo__dev')
    expect(getPluginZBrowserPartition('demo', 'development')).toBe('demo__dev.zbrowser')
    expect(getDetachedWindowSizeKey('demo', 'development')).toBe('demo__dev')
  })

  it('parses runtime namespaces back to plugin variants', () => {
    expect(parsePluginRuntimeNamespace('demo')).toEqual({
      pluginName: 'demo',
      pluginSource: 'installed'
    })
    expect(parsePluginRuntimeNamespace('demo__dev')).toEqual({
      pluginName: 'demo',
      pluginSource: 'development'
    })
  })

  it('marks development data records for the setting data page', () => {
    expect(
      buildPluginDataVariantRecord({
        pluginName: 'demo',
        pluginTitle: 'Demo',
        pluginSource: 'development',
        docCount: 2,
        attachmentCount: 1,
        logo: null
      })
    ).toMatchObject({
      pluginName: 'demo',
      pluginSource: 'development',
      isDevelopment: true
    })
  })
})
