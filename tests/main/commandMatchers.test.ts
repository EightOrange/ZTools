import { describe, it, expect } from 'vitest'
import {
  findCommandIndex,
  filterOutCommand,
  hasCommand
} from '../../src/main/api/renderer/commandMatchers'

// ========== findCommandIndex ==========

describe('findCommandIndex', () => {
  const list = [
    { name: '原神', path: 'C:\\launcher.exe', type: 'app' },
    { name: '米哈游启动器', path: 'C:\\launcher.exe', type: 'app' },
    { name: 'Chrome', path: 'C:\\chrome.exe', type: 'app' },
    {
      name: '翻译',
      path: '/plugins/translate',
      type: 'plugin',
      featureCode: 'translate',
      pluginSource: 'installed'
    },
    {
      name: '词典',
      path: '/plugins/translate',
      type: 'plugin',
      featureCode: 'dict',
      pluginSource: 'installed'
    },
    {
      name: '翻译',
      path: '/workspace/translate',
      type: 'plugin',
      featureCode: 'translate',
      pluginSource: 'development'
    }
  ]

  describe('非插件类型', () => {
    it('应同时匹配 name 和 path', () => {
      const idx = findCommandIndex(list, 'C:\\launcher.exe', 'app', undefined, '原神')
      expect(idx).toBe(0)
    })

    it('应区分同路径不同名的应用', () => {
      const idx = findCommandIndex(list, 'C:\\launcher.exe', 'app', undefined, '米哈游启动器')
      expect(idx).toBe(1)
    })

    it('路径匹配但名称不匹配时应返回 -1', () => {
      const idx = findCommandIndex(list, 'C:\\launcher.exe', 'app', undefined, '不存在的名称')
      expect(idx).toBe(-1)
    })

    it('名称匹配但路径不匹配时应返回 -1', () => {
      const idx = findCommandIndex(list, 'C:\\other.exe', 'app', undefined, '原神')
      expect(idx).toBe(-1)
    })
  })

  describe('插件类型', () => {
    it('应匹配 path + featureCode', () => {
      const idx = findCommandIndex(
        list,
        '/plugins/translate',
        'plugin',
        'translate',
        undefined,
        'installed'
      )
      expect(idx).toBe(3)
    })

    it('应区分同路径不同 featureCode 的插件', () => {
      const idx = findCommandIndex(
        list,
        '/plugins/translate',
        'plugin',
        'dict',
        undefined,
        'installed'
      )
      expect(idx).toBe(4)
    })

    it('featureCode 不匹配时应返回 -1', () => {
      const idx = findCommandIndex(
        list,
        '/plugins/translate',
        'plugin',
        'nonexistent',
        undefined,
        'installed'
      )
      expect(idx).toBe(-1)
    })

    it('应按 pluginSource 区分安装版与开发版', () => {
      const idx = findCommandIndex(
        list,
        '/workspace/translate',
        'plugin',
        'translate',
        undefined,
        'development'
      )
      expect(idx).toBe(5)
    })
  })

  describe('旧数据兼容（name 缺失）', () => {
    it('未传 name 时应降级为仅匹配 path', () => {
      const idx = findCommandIndex(list, 'C:\\launcher.exe', 'app')
      expect(idx).toBe(0) // 匹配到第一个同路径的
    })

    it('未传 name 时对不存在的 path 应返回 -1', () => {
      const idx = findCommandIndex(list, 'C:\\nonexistent.exe', 'app')
      expect(idx).toBe(-1)
    })
  })

  it('列表为空时应返回 -1', () => {
    expect(findCommandIndex([], 'any', 'app', undefined, 'any')).toBe(-1)
  })
})

// ========== filterOutCommand ==========

describe('filterOutCommand', () => {
  describe('非插件类型', () => {
    it('应只过滤匹配 name + path 的项', () => {
      const list = [
        { name: '原神', path: 'C:\\launcher.exe', type: 'app' },
        { name: '米哈游启动器', path: 'C:\\launcher.exe', type: 'app' },
        { name: 'Chrome', path: 'C:\\chrome.exe', type: 'app' }
      ]
      const result = filterOutCommand(list, 'C:\\launcher.exe', undefined, '原神')
      expect(result).toHaveLength(2)
      expect(result.map((i) => i.name)).toEqual(['米哈游启动器', 'Chrome'])
    })

    it('不应误删同路径不同名的应用', () => {
      const list = [
        { name: '原神', path: 'C:\\launcher.exe', type: 'app' },
        { name: '米哈游启动器', path: 'C:\\launcher.exe', type: 'app' }
      ]
      const result = filterOutCommand(list, 'C:\\launcher.exe', undefined, '原神')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('米哈游启动器')
    })

    it('没有 name 参数时应按纯路径匹配（兼容旧逻辑）', () => {
      const list = [
        { name: '原神', path: 'C:\\launcher.exe', type: 'app' },
        { name: '米哈游启动器', path: 'C:\\launcher.exe', type: 'app' }
      ]
      const result = filterOutCommand(list, 'C:\\launcher.exe')
      expect(result).toHaveLength(0)
    })
  })

  describe('插件类型', () => {
    it('应只过滤匹配 path + featureCode 的插件', () => {
      const list = [
        {
          name: '翻译',
          path: '/plugins/translate',
          type: 'plugin',
          featureCode: 'translate',
          pluginSource: 'installed'
        },
        {
          name: '词典',
          path: '/plugins/translate',
          type: 'plugin',
          featureCode: 'dict',
          pluginSource: 'installed'
        }
      ]
      const result = filterOutCommand(
        list,
        '/plugins/translate',
        'translate',
        undefined,
        'installed'
      )
      expect(result).toHaveLength(1)
      expect(result[0].featureCode).toBe('dict')
    })

    it('应在 pluginSource 不匹配时保留另一变体', () => {
      const list = [
        {
          name: '优秀待办',
          path: '/Applications/ExcellentTodo',
          type: 'plugin',
          featureCode: 'open',
          pluginSource: 'installed'
        },
        {
          name: '优秀待办',
          path: '/workspace/excellent-todo',
          type: 'plugin',
          featureCode: 'open',
          pluginSource: 'development'
        }
      ]
      const result = filterOutCommand(
        list,
        '/workspace/excellent-todo',
        'open',
        undefined,
        'development'
      )
      expect(result).toHaveLength(1)
      expect(result[0].pluginSource).toBe('installed')
    })
  })
})

// ========== hasCommand ==========

describe('hasCommand', () => {
  const list = [
    { name: '原神', path: 'C:\\launcher.exe', type: 'app' },
    { name: '米哈游启动器', path: 'C:\\launcher.exe', type: 'app' },
    {
      name: '翻译',
      path: '/plugins/translate',
      type: 'plugin',
      featureCode: 'translate',
      pluginSource: 'installed'
    },
    {
      name: '翻译',
      path: '/workspace/translate',
      type: 'plugin',
      featureCode: 'translate',
      pluginSource: 'development'
    }
  ]

  it('应找到匹配 name + path 的非插件项', () => {
    expect(hasCommand(list, 'C:\\launcher.exe', undefined, '原神')).toBe(true)
  })

  it('应区分同路径不同名的应用', () => {
    expect(hasCommand(list, 'C:\\launcher.exe', undefined, '米哈游启动器')).toBe(true)
    expect(hasCommand(list, 'C:\\launcher.exe', undefined, '不存在')).toBe(false)
  })

  it('应找到匹配 path + featureCode 的插件项', () => {
    expect(hasCommand(list, '/plugins/translate', 'translate', undefined, 'installed')).toBe(true)
    expect(hasCommand(list, '/plugins/translate', 'nonexistent', undefined, 'installed')).toBe(
      false
    )
  })

  it('应按 pluginSource 区分不同插件变体', () => {
    expect(hasCommand(list, '/workspace/translate', 'translate', undefined, 'development')).toBe(
      true
    )
    expect(hasCommand(list, '/workspace/translate', 'translate', undefined, 'installed')).toBe(
      false
    )
  })

  describe('旧数据兼容（name 缺失）', () => {
    it('未传 name 时应降级为仅匹配 path', () => {
      expect(hasCommand(list, 'C:\\launcher.exe')).toBe(true)
    })

    it('未传 name 时对不存在的 path 应返回 false', () => {
      expect(hasCommand(list, 'C:\\nonexistent.exe')).toBe(false)
    })
  })

  it('列表为空时应返回 false', () => {
    expect(hasCommand([], 'any', undefined, 'any')).toBe(false)
  })
})

describe('plugin variant matching', () => {
  const list = [
    {
      name: '优秀待办',
      path: '/Applications/ExcellentTodo',
      type: 'plugin',
      pluginName: 'excellent-todo',
      pluginSource: 'installed',
      featureCode: 'open'
    },
    {
      name: '优秀待办',
      path: '/workspace/excellent-todo',
      type: 'plugin',
      pluginName: 'excellent-todo',
      pluginSource: 'development',
      featureCode: 'open'
    }
  ]

  it('matches plugin commands by path + featureCode + pluginSource', () => {
    const index = findCommandIndex(
      list,
      '/workspace/excellent-todo',
      'plugin',
      'open',
      '优秀待办',
      'development'
    )
    expect(index).toBe(1)
  })

  it('keeps old records readable when pluginSource is missing', () => {
    expect(
      hasCommand(
        [{ path: '/Applications/ExcellentTodo', type: 'plugin', featureCode: 'open' }],
        '/Applications/ExcellentTodo',
        'open',
        '优秀待办',
        'installed'
      )
    ).toBe(true)
  })

  it('matches plugin variants by pluginName when path changes', () => {
    expect(
      hasCommand(
        [
          {
            path: '/old/workspace/excellent-todo',
            type: 'plugin',
            pluginName: 'excellent-todo',
            pluginSource: 'development',
            featureCode: 'open'
          }
        ],
        '/new/workspace/excellent-todo',
        'open',
        'excellent-todo',
        'development'
      )
    ).toBe(true)
  })
})
