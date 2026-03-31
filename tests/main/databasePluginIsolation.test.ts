import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockAttachmentDb = vi.hoisted(() => ({
  getRange: vi.fn(),
  get: vi.fn(),
  removeSync: vi.fn()
}))

const mockMetaDb = vi.hoisted(() => ({
  getRange: vi.fn(),
  removeSync: vi.fn()
}))

const mockLmdb = vi.hoisted(() => ({
  allDocs: vi.fn(),
  get: vi.fn(),
  remove: vi.fn(),
  getAttachmentDb: vi.fn(() => mockAttachmentDb),
  getMetaDb: vi.fn(() => mockMetaDb)
}))

const mockPluginWindowManager = vi.hoisted(() => ({
  getPluginNameByWebContentsId: vi.fn(),
  getPluginPathByWebContentsId: vi.fn()
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

vi.mock('../../src/main/core/pluginWindowManager', () => ({
  default: mockPluginWindowManager
}))

import { DatabaseAPI } from '../../src/main/api/shared/database'

describe('database plugin isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPluginWindowManager.getPluginNameByWebContentsId.mockReturnValue(null)
    mockPluginWindowManager.getPluginPathByWebContentsId.mockReturnValue(null)
    mockLmdb.allDocs.mockReturnValue([])
    mockLmdb.get.mockReturnValue(null)
    mockLmdb.remove.mockReturnValue({ ok: true })
    mockAttachmentDb.getRange.mockReturnValue([])
    mockAttachmentDb.get.mockReturnValue(null)
    mockMetaDb.getRange.mockReturnValue([])
  })

  it('separates installed and development data stats for the same plugin name', async () => {
    mockLmdb.allDocs.mockImplementation((prefix: string) => {
      if (prefix === 'PLUGIN/') {
        return [{ _id: 'PLUGIN/demo/settings' }, { _id: 'PLUGIN/demo__dev/settings' }]
      }
      if (prefix === 'ZTOOLS/') {
        return []
      }
      return []
    })

    mockAttachmentDb.getRange.mockImplementation(({ start }: { start: string }) => {
      if (start === 'attachment-ext:PLUGIN/') {
        return [
          { key: 'attachment-ext:PLUGIN/demo/logo' },
          { key: 'attachment-ext:PLUGIN/demo__dev/logo' }
        ]
      }
      return []
    })

    mockLmdb.get.mockImplementation((key: string) => {
      if (key === 'ZTOOLS/plugins') {
        return {
          data: [
            {
              name: 'demo',
              title: 'Demo Installed',
              isDevelopment: false,
              logo: 'installed.png'
            },
            {
              name: 'demo',
              title: 'Demo Dev',
              isDevelopment: true,
              logo: 'dev.png'
            }
          ]
        }
      }
      return null
    })

    const database = new DatabaseAPI()
    const result = await database.getPluginDataStats()

    expect(result).toEqual({
      success: true,
      data: [
        {
          pluginName: 'demo',
          pluginTitle: 'Demo Installed',
          pluginSource: 'installed',
          isDevelopment: false,
          docCount: 1,
          attachmentCount: 1,
          logo: 'installed.png'
        },
        {
          pluginName: 'demo',
          pluginTitle: 'Demo Dev',
          pluginSource: 'development',
          isDevelopment: true,
          docCount: 1,
          attachmentCount: 1,
          logo: 'dev.png'
        }
      ]
    })
  })

  it('reads development doc keys from the development runtime namespace', async () => {
    mockLmdb.allDocs.mockImplementation((prefix: string) => {
      if (prefix === 'PLUGIN/demo__dev/') {
        return [{ _id: 'PLUGIN/demo__dev/settings' }]
      }
      return []
    })

    mockAttachmentDb.getRange.mockImplementation(({ start }: { start: string }) => {
      if (start === 'attachment-ext:PLUGIN/demo__dev/') {
        return [{ key: 'attachment-ext:PLUGIN/demo__dev/logo' }]
      }
      return []
    })

    const database = new DatabaseAPI()
    const result = await database.getPluginDocKeys({
      pluginName: 'demo',
      source: 'development'
    } as any)

    expect(mockLmdb.allDocs).toHaveBeenCalledWith('PLUGIN/demo__dev/')
    expect(result).toEqual({
      success: true,
      data: [
        { key: 'settings', type: 'document' },
        { key: 'logo', type: 'attachment' }
      ]
    })
  })

  it('clears only the selected development namespace data', async () => {
    mockLmdb.allDocs.mockImplementation((prefix: string) => {
      if (prefix === 'PLUGIN/demo__dev/') {
        return [{ _id: 'PLUGIN/demo__dev/settings' }]
      }
      return []
    })

    mockMetaDb.getRange.mockImplementation(({ start }: { start: string }) => {
      if (start === 'PLUGIN/demo__dev/') {
        return [{ key: 'PLUGIN/demo__dev/settings' }]
      }
      return []
    })

    mockAttachmentDb.getRange.mockImplementation(({ start }: { start: string }) => {
      if (start === 'attachment:PLUGIN/demo__dev/') {
        return [{ key: 'attachment:PLUGIN/demo__dev/logo' }]
      }
      if (start === 'attachment-ext:PLUGIN/demo__dev/') {
        return [{ key: 'attachment-ext:PLUGIN/demo__dev/logo' }]
      }
      return []
    })

    const database = new DatabaseAPI()
    const result = await database.clearPluginData({
      pluginName: 'demo',
      source: 'development'
    } as any)

    expect(mockLmdb.allDocs).toHaveBeenCalledWith('PLUGIN/demo__dev/')
    expect(mockLmdb.remove).toHaveBeenCalledWith('PLUGIN/demo__dev/settings')
    expect(mockMetaDb.removeSync).toHaveBeenCalledWith('PLUGIN/demo__dev/settings')
    expect(mockAttachmentDb.removeSync).toHaveBeenCalledWith('attachment:PLUGIN/demo__dev/logo')
    expect(mockAttachmentDb.removeSync).toHaveBeenCalledWith('attachment-ext:PLUGIN/demo__dev/logo')
    expect(result).toEqual({
      success: true,
      deletedCount: 2
    })
  })

  it('derives plugin prefix from child window session partition when webContents is not a main view', () => {
    const database = new DatabaseAPI()
    ;(database as any).pluginManager = {
      getPluginInfoByWebContents: vi.fn().mockReturnValue(null)
    }

    const prefix = (database as any).getPluginPrefix({
      sender: {
        id: 99,
        session: {
          partition: 'persist:demo__dev'
        }
      }
    })

    expect(prefix).toBe('PLUGIN/demo__dev/')
  })
})
