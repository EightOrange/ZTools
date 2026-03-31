/**
 * 指令匹配纯函数
 * 提取自 commands.ts 中的匹配逻辑，便于单元测试
 */

/**
 * 在列表中查找匹配项的索引
 * 插件类型匹配 path + featureCode + pluginSource；非插件类型匹配 name + path
 */
export function findCommandIndex(
  list: any[],
  appPath: string,
  type: string,
  featureCode?: string,
  name?: string,
  pluginSource?: 'installed' | 'development'
): number {
  return list.findIndex((item) => {
    if (item.type === 'plugin' && type === 'plugin') {
      if (item.featureCode !== featureCode) {
        return false
      }
      const matchesPath = item.path === appPath
      const matchesPluginName = Boolean(name && item.pluginName === name)
      if (!matchesPath && !matchesPluginName) {
        return false
      }
      if (!pluginSource || !item.pluginSource) {
        return true
      }
      return item.pluginSource === pluginSource
    }
    // 非插件类型：优先匹配 name + path，兼容旧数据（name 缺失时降级为仅匹配 path）
    if (name) {
      return item.path === appPath && item.name === name
    }
    return item.path === appPath
  })
}

/**
 * 过滤掉匹配项（用于 removeFromHistory / unpinApp）
 * 插件类型匹配 path + featureCode + pluginSource；非插件类型匹配 name + path
 */
export function filterOutCommand(
  list: any[],
  appPath: string,
  featureCode?: string,
  name?: string,
  pluginSource?: 'installed' | 'development'
): any[] {
  return list.filter((item) => {
    // 对于插件，需要同时匹配 path 和 featureCode
    if (item.type === 'plugin' && featureCode !== undefined) {
      if (item.featureCode !== featureCode) {
        return true
      }
      const matchesPath = item.path === appPath
      const matchesPluginName = Boolean(name && item.pluginName === name)
      if (!matchesPath && !matchesPluginName) {
        return true
      }
      if (!pluginSource || !item.pluginSource) {
        return false
      }
      return item.pluginSource !== pluginSource
    }
    // 非插件类型：同时匹配 name 和 path
    if (name) {
      return !(item.path === appPath && item.name === name)
    }
    return item.path !== appPath
  })
}

/**
 * 检查列表中是否已存在匹配项（用于 pinApp）
 * 插件类型匹配 path + featureCode + pluginSource；非插件类型匹配 name + path
 */
export function hasCommand(
  list: any[],
  appPath: string,
  featureCode?: string,
  name?: string,
  pluginSource?: 'installed' | 'development'
): boolean {
  return list.some((item) => {
    // 对于插件，需要同时匹配 path 和 featureCode
    if (item.type === 'plugin' && featureCode !== undefined) {
      if (item.featureCode !== featureCode) {
        return false
      }
      const matchesPath = item.path === appPath
      const matchesPluginName = Boolean(name && item.pluginName === name)
      if (!matchesPath && !matchesPluginName) {
        return false
      }
      if (!pluginSource || !item.pluginSource) {
        return true
      }
      return item.pluginSource === pluginSource
    }
    // 非插件类型：优先匹配 name + path，兼容旧数据（name 缺失时降级为仅匹配 path）
    if (name) {
      return item.path === appPath && item.name === name
    }
    return item.path === appPath
  })
}
