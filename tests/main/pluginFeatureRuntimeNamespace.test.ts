import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockLmdb = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  remove: vi.fn()
}))

vi.mock('electron', () => ({
  ipcMain: {
    on: vi.fn(),
    handle: vi.fn()
  }
}))

vi.mock('../../src/main/core/lmdb/lmdbInstance', () => ({
  default: mockLmdb
}))

vi.mock('../../src/main/managers/windowManager', () => ({
  default: {
    getMainWindow: vi.fn(() => null)
  }
}))

import { PluginFeatureAPI } from '../../src/main/api/plugin/feature'

describe('plugin feature runtime namespace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLmdb.get.mockReturnValue(null)
    mockLmdb.put.mockReturnValue({ ok: true })
    mockLmdb.remove.mockReturnValue({ ok: true })
  })

  it('loads development dynamic features from the dev namespace', () => {
    mockLmdb.get.mockImplementation((key: string) => {
      if (key === 'PLUGIN/demo__dev/dynamic-features') {
        return {
          data: JSON.stringify({
            features: [{ code: 'demo.dev', cmds: ['开发版指令'] }]
          })
        }
      }
      return null
    })

    const api = new PluginFeatureAPI()
    const features = api.loadDynamicFeatures('demo', 'development' as any)

    expect(mockLmdb.get).toHaveBeenCalledWith('PLUGIN/demo__dev/dynamic-features')
    expect(features).toEqual([{ code: 'demo.dev', cmds: ['开发版指令'] }])
  })

  it('saves development dynamic features into the dev namespace', () => {
    const api = new PluginFeatureAPI()
    ;(api as any).saveDynamicFeatures('demo', 'development', [
      { code: 'demo.dev', cmds: ['开发版'] }
    ])

    expect(mockLmdb.put).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: 'PLUGIN/demo__dev/dynamic-features'
      })
    )
  })

  it('clears development dynamic features by the dev namespace key', () => {
    mockLmdb.get.mockImplementation((key: string) => {
      if (key === 'PLUGIN/demo__dev/dynamic-features') {
        return { _id: key, _rev: '1-a' }
      }
      return null
    })

    const api = new PluginFeatureAPI()
    api.clearPluginFeatures('demo', 'development' as any)

    expect(mockLmdb.get).toHaveBeenCalledWith('PLUGIN/demo__dev/dynamic-features')
    expect(mockLmdb.remove).toHaveBeenCalledWith('PLUGIN/demo__dev/dynamic-features')
  })
})
