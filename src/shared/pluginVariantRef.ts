export type PluginSource = 'installed' | 'development'

/**
 * 用于唯一标识某个插件变体。
 */
export interface PluginVariantRef {
  /** 插件 `plugin.json.name` 标识。 */
  pluginName: string
  /** 当前指向的变体来源。 */
  source: PluginSource
}

type PluginVariantRefLike = PluginVariantRef | string | null | undefined

type PluginLike = {
  /** 插件内部唯一名称。 */
  name?: string | null
  /** 是否为开发中的插件。 */
  isDevelopment?: boolean | null
  /** 插件当前实际运行路径。 */
  path?: string | null
}

/**
 * 校验给定值是否为受支持的插件来源。
 */
export function isPluginSource(value: unknown): value is PluginSource {
  return value === 'installed' || value === 'development'
}

/**
 * 根据开发标记推导统一的插件来源枚举。
 */
export function getPluginSource(isDevelopment?: boolean | null): PluginSource {
  return isDevelopment ? 'development' : 'installed'
}

/**
 * 构造一个标准化的插件变体引用。
 */
export function buildPluginVariantRef(pluginName: string, source: PluginSource): PluginVariantRef {
  return {
    pluginName,
    source
  }
}

/**
 * 从插件对象中提取变体引用。
 */
export function buildPluginVariantRefFromPlugin(
  plugin: PluginLike | null | undefined
): PluginVariantRef | null {
  if (!plugin?.name) {
    return null
  }

  return buildPluginVariantRef(plugin.name, getPluginSource(plugin.isDevelopment))
}

/**
 * 将字符串、旧格式对象或标准对象统一归一化为变体引用。
 */
export function normalizePluginVariantRef(
  value: PluginVariantRefLike,
  fallbackSource: PluginSource = 'installed'
): PluginVariantRef | null {
  if (typeof value === 'string') {
    const pluginName = value.trim()
    if (!pluginName) {
      return null
    }
    return buildPluginVariantRef(pluginName, fallbackSource)
  }

  if (!value || typeof value !== 'object') {
    return null
  }

  const pluginName = typeof value.pluginName === 'string' ? value.pluginName.trim() : ''
  if (!pluginName) {
    return null
  }

  return buildPluginVariantRef(
    pluginName,
    isPluginSource(value.source) ? value.source : fallbackSource
  )
}

/**
 * 判断两个插件引用是否指向同一个安装/开发变体。
 */
export function isSamePluginVariantRef(
  left: PluginVariantRefLike,
  right: PluginVariantRefLike,
  fallbackSource: PluginSource = 'installed'
): boolean {
  const normalizedLeft = normalizePluginVariantRef(left, fallbackSource)
  const normalizedRight = normalizePluginVariantRef(right, fallbackSource)

  if (!normalizedLeft || !normalizedRight) {
    return false
  }

  return (
    normalizedLeft.pluginName === normalizedRight.pluginName &&
    normalizedLeft.source === normalizedRight.source
  )
}

/**
 * 将任意列表清洗为去重后的标准变体引用数组。
 */
function normalizePluginVariantRefList(
  list: unknown,
  fallbackSource: PluginSource = 'installed'
): PluginVariantRef[] {
  if (!Array.isArray(list)) {
    return []
  }

  const result: PluginVariantRef[] = []
  for (const item of list) {
    const normalized = normalizePluginVariantRef(item as PluginVariantRefLike, fallbackSource)
    if (
      normalized &&
      !result.some((existing) => isSamePluginVariantRef(existing, normalized, fallbackSource))
    ) {
      result.push(normalized)
    }
  }

  return result
}

/**
 * 判断列表中是否已包含目标插件变体。
 */
export function includesPluginVariantRef(
  list: unknown,
  target: PluginVariantRefLike,
  fallbackSource: PluginSource = 'installed'
): boolean {
  if (!Array.isArray(list)) {
    return false
  }

  return list.some((item) =>
    isSamePluginVariantRef(item as PluginVariantRefLike, target, fallbackSource)
  )
}

/**
 * 在列表中切换某个插件变体的选中状态。
 */
export function togglePluginVariantRef(
  list: unknown,
  target: PluginVariantRefLike,
  fallbackSource: PluginSource = 'installed'
): PluginVariantRef[] {
  const normalizedTarget = normalizePluginVariantRef(target, fallbackSource)
  const normalizedList = normalizePluginVariantRefList(list, fallbackSource)

  if (!normalizedTarget) {
    return normalizedList
  }

  if (includesPluginVariantRef(normalizedList, normalizedTarget, fallbackSource)) {
    return normalizedList.filter(
      (item) => !isSamePluginVariantRef(item, normalizedTarget, fallbackSource)
    )
  }

  return [...normalizedList, normalizedTarget]
}

/**
 * 从列表中移除指定插件变体，并返回清洗后的结果。
 */
export function removePluginVariantRef(
  list: unknown,
  target: PluginVariantRefLike,
  fallbackSource: PluginSource = 'installed'
): PluginVariantRef[] {
  const normalizedTarget = normalizePluginVariantRef(target, fallbackSource)
  if (!normalizedTarget) {
    return normalizePluginVariantRefList(list, fallbackSource)
  }

  return normalizePluginVariantRefList(list, fallbackSource).filter(
    (item) => !isSamePluginVariantRef(item, normalizedTarget, fallbackSource)
  )
}

/**
 * 依据插件变体引用，从插件集合中解析出对应插件实例。
 */
export function resolvePluginByVariantRef<T extends PluginLike>(
  plugins: T[],
  ref: PluginVariantRefLike,
  fallbackSource: PluginSource = 'installed'
): T | undefined {
  if (!Array.isArray(plugins)) {
    return undefined
  }

  const normalizedRef = normalizePluginVariantRef(ref, fallbackSource)
  if (!normalizedRef) {
    return undefined
  }

  const exactMatch = plugins.find(
    (plugin) =>
      plugin?.name === normalizedRef.pluginName &&
      getPluginSource(plugin?.isDevelopment) === normalizedRef.source
  )
  if (exactMatch) {
    return exactMatch
  }

  if (typeof ref === 'string') {
    return plugins.find((plugin) => plugin?.name === normalizedRef.pluginName)
  }

  return undefined
}

/**
 * 根据名称、路径或来源，从插件集合推导当前最合适的变体引用。
 */
export function resolvePluginVariantRefFromPlugins<T extends PluginLike>(
  plugins: T[],
  options: {
    pluginName?: string | null
    pluginPath?: string | null
    source?: PluginSource
  }
): PluginVariantRef | null {
  if (Array.isArray(plugins)) {
    if (options.pluginPath) {
      const exactPathMatch = plugins.find((plugin) => plugin?.path === options.pluginPath)
      if (exactPathMatch) {
        return buildPluginVariantRefFromPlugin(exactPathMatch)
      }
    }

    if (options.pluginName && options.source) {
      const exactVariantMatch = plugins.find(
        (plugin) =>
          plugin?.name === options.pluginName &&
          getPluginSource(plugin?.isDevelopment) === options.source
      )
      if (exactVariantMatch) {
        return buildPluginVariantRefFromPlugin(exactVariantMatch)
      }
    }

    if (options.pluginName) {
      const installedMatch = plugins.find(
        (plugin) => plugin?.name === options.pluginName && !plugin?.isDevelopment
      )
      if (installedMatch) {
        return buildPluginVariantRefFromPlugin(installedMatch)
      }

      const firstMatch = plugins.find((plugin) => plugin?.name === options.pluginName)
      if (firstMatch) {
        return buildPluginVariantRefFromPlugin(firstMatch)
      }
    }
  }

  if (options.pluginName) {
    return buildPluginVariantRef(options.pluginName, options.source || 'installed')
  }

  return null
}
