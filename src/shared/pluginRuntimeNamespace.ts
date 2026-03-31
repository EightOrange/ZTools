import type { PluginSource } from './pluginVariantRef'

/**
 * 开发版运行时命名空间后缀。
 * 只用于宿主内部的隔离键，不会回写到插件真实名称。
 */
export const DEVELOPMENT_RUNTIME_NAMESPACE_SUFFIX = '__dev'

/**
 * 插件变体在宿主内部的最小运行时标识。
 */
export interface PluginRuntimeVariant {
  /** 插件真实名称，对应 `plugin.json.name`。 */
  pluginName: string
  /** 当前插件来源。 */
  pluginSource: PluginSource
}

/**
 * 设置页“我的数据”所需的最小插件数据记录。
 */
export interface PluginDataVariantRecord extends PluginRuntimeVariant {
  /** 插件展示标题。 */
  pluginTitle: string | null
  /** 文档数量。 */
  docCount: number
  /** 附件数量。 */
  attachmentCount: number
  /** 插件图标。 */
  logo: string | null
  /** 是否为开发版，供界面直接渲染 DEV 标签。 */
  isDevelopment: boolean
}

/**
 * 根据真实插件名和来源，生成宿主内部使用的运行时命名空间。
 * 身份层继续使用 `pluginName`，隔离层统一使用该 namespace。
 */
export function getPluginRuntimeNamespace(pluginName: string, pluginSource: PluginSource): string {
  return pluginSource === 'development'
    ? `${pluginName}${DEVELOPMENT_RUNTIME_NAMESPACE_SUFFIX}`
    : pluginName
}

/**
 * 把运行时命名空间还原为“真实插件名 + 来源”。
 * 该逻辑只用于宿主内部统计与日志，避免把 `__dev` 直接暴露给业务层。
 */
export function parsePluginRuntimeNamespace(runtimeNamespace: string): PluginRuntimeVariant {
  if (runtimeNamespace.endsWith(DEVELOPMENT_RUNTIME_NAMESPACE_SUFFIX)) {
    return {
      pluginName: runtimeNamespace.slice(0, -DEVELOPMENT_RUNTIME_NAMESPACE_SUFFIX.length),
      pluginSource: 'development'
    }
  }

  return {
    pluginName: runtimeNamespace,
    pluginSource: 'installed'
  }
}

/**
 * 生成插件私有数据库文档前缀。
 */
export function getPluginDataPrefix(pluginName: string, pluginSource: PluginSource): string {
  return `PLUGIN/${getPluginRuntimeNamespace(pluginName, pluginSource)}/`
}

/**
 * 生成插件私有文档的完整 `_id`。
 */
export function getPluginDocId(
  pluginName: string,
  pluginSource: PluginSource,
  key: string
): string {
  return `${getPluginDataPrefix(pluginName, pluginSource)}${key}`
}

/**
 * 生成插件主视图与插件子窗口共享的 Session partition。
 */
export function getPluginSessionPartition(pluginName: string, pluginSource: PluginSource): string {
  return `persist:${getPluginRuntimeNamespace(pluginName, pluginSource)}`
}

/**
 * 生成插件 zbrowser 专用 Session partition。
 */
export function getPluginZBrowserPartition(pluginName: string, pluginSource: PluginSource): string {
  return `${getPluginRuntimeNamespace(pluginName, pluginSource)}.zbrowser`
}

/**
 * 分离窗口尺寸按运行时命名空间持久化，避免开发版和安装版串用。
 */
export function getDetachedWindowSizeKey(pluginName: string, pluginSource: PluginSource): string {
  return getPluginRuntimeNamespace(pluginName, pluginSource)
}

/**
 * 构造设置页“我的数据”列表所需的变体化记录。
 */
export function buildPluginDataVariantRecord(
  record: Omit<PluginDataVariantRecord, 'isDevelopment'>
): PluginDataVariantRecord {
  return {
    ...record,
    isDevelopment: record.pluginSource === 'development'
  }
}
