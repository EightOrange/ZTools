import { describe, expect, it } from 'vitest'
import {
  includesPluginVariantRef,
  normalizePluginVariantRef,
  resolvePluginByVariantRef,
  resolvePluginVariantRefFromPlugins,
  togglePluginVariantRef
} from '../../src/shared/pluginVariantRef'

describe('pluginVariantRef', () => {
  it('normalizes legacy string refs to installed source', () => {
    expect(normalizePluginVariantRef('excellent-todo')).toEqual({
      pluginName: 'excellent-todo',
      source: 'installed'
    })
  })

  it('checks mixed legacy and new refs correctly', () => {
    const refs = [
      'excellent-todo',
      { pluginName: 'excellent-todo', source: 'development' as const }
    ]

    expect(
      includesPluginVariantRef(refs, {
        pluginName: 'excellent-todo',
        source: 'installed'
      })
    ).toBe(true)
    expect(
      includesPluginVariantRef(refs, {
        pluginName: 'excellent-todo',
        source: 'development'
      })
    ).toBe(true)
  })

  it('toggles refs without removing another source variant', () => {
    const refs = togglePluginVariantRef(['excellent-todo'], {
      pluginName: 'excellent-todo',
      source: 'development'
    })

    expect(refs).toEqual([
      { pluginName: 'excellent-todo', source: 'installed' },
      { pluginName: 'excellent-todo', source: 'development' }
    ])
  })

  it('resolves legacy refs to installed plugin first', () => {
    const plugins = [
      { name: 'excellent-todo', isDevelopment: true, path: '/workspace/excellent-todo' },
      { name: 'excellent-todo', isDevelopment: false, path: '/Applications/ExcellentTodo' }
    ]

    expect(resolvePluginByVariantRef(plugins, 'excellent-todo')?.path).toBe(
      '/Applications/ExcellentTodo'
    )
  })

  it('resolves variant ref by path when current plugin path is known', () => {
    const plugins = [
      { name: 'excellent-todo', isDevelopment: false, path: '/Applications/ExcellentTodo' },
      { name: 'excellent-todo', isDevelopment: true, path: '/workspace/excellent-todo' }
    ]

    expect(
      resolvePluginVariantRefFromPlugins(plugins, {
        pluginName: 'excellent-todo',
        pluginPath: '/workspace/excellent-todo'
      })
    ).toEqual({
      pluginName: 'excellent-todo',
      source: 'development'
    })
  })
})
