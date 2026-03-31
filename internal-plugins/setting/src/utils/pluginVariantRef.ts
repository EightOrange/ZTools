export type PluginSource = 'installed' | 'development'

/**
 * 设置插件侧使用的插件变体引用。
 */
export interface PluginVariantRef {
  /** 插件 `plugin.json.name` 标识。 */
  pluginName: string
  /** 当前指向的变体来源。 */
  source: PluginSource
  /** 当前设备解析出的插件路径。 */
  path?: string
}

/**
 * 根据插件的开发态标记推导来源枚举。
 */
export function getPluginSource(isDevelopment?: boolean | null): PluginSource {
  return isDevelopment ? 'development' : 'installed'
}

/**
 * 兼容旧数据并归一化设置页使用的插件引用结构。
 */
export function normalizePluginVariantRef(value: unknown): PluginVariantRef | null {
  if (typeof value === 'string') {
    const pluginName = value.trim()
    if (!pluginName) {
      return null
    }
    return {
      pluginName,
      source: 'installed'
    }
  }

  if (!value || typeof value !== 'object') {
    return null
  }

  const pluginName =
    typeof (value as PluginVariantRef).pluginName === 'string'
      ? (value as PluginVariantRef).pluginName.trim()
      : ''
  if (!pluginName) {
    return null
  }

  return {
    pluginName,
    source:
      (value as PluginVariantRef).source === 'development' ||
      (value as { pluginSource?: PluginSource }).pluginSource === 'development'
        ? 'development'
        : 'installed',
    path:
      typeof (value as PluginVariantRef).path === 'string'
        ? (value as PluginVariantRef).path
        : undefined
  }
}

/**
 * 判断列表中是否已包含目标插件变体。
 */
export function includesPluginVariantRef(list: unknown, target: unknown): boolean {
  const normalizedTarget = normalizePluginVariantRef(target)
  if (!normalizedTarget || !Array.isArray(list)) {
    return false
  }

  return list.some((item) => {
    const normalizedItem = normalizePluginVariantRef(item)
    if (!normalizedItem) {
      return false
    }

    return (
      normalizedItem.pluginName === normalizedTarget.pluginName &&
      normalizedItem.source === normalizedTarget.source
    )
  })
}

/**
 * 在设置插件的多选列表中切换某个插件变体。
 */
export function togglePluginVariantRef(list: unknown, target: unknown): PluginVariantRef[] {
  const normalizedTarget = normalizePluginVariantRef(target)
  const normalizedList = Array.isArray(list)
    ? list
        .map((item) => normalizePluginVariantRef(item))
        .filter((item): item is PluginVariantRef => !!item)
    : []

  if (!normalizedTarget) {
    return normalizedList
  }

  if (includesPluginVariantRef(normalizedList, normalizedTarget)) {
    return normalizedList.filter(
      (item) =>
        !(
          item.pluginName === normalizedTarget.pluginName && item.source === normalizedTarget.source
        )
    )
  }

  return [...normalizedList, normalizedTarget]
}

/**
 * 判断某个插件实例是否匹配给定的插件变体引用。
 */
export function matchesPluginVariant(plugin: any, target: unknown): boolean {
  const normalizedTarget = normalizePluginVariantRef(target)
  if (!normalizedTarget || !plugin?.name) {
    return false
  }

  return (
    plugin.name === normalizedTarget.pluginName &&
    getPluginSource(plugin.isDevelopment) === normalizedTarget.source
  )
}
