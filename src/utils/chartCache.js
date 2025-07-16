/**
 * 图表数据缓存工具
 * 为各种图表组件提供统一的缓存机制
 */

// 缓存配置
const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存
const CACHE_KEY_PREFIX = 'chart_cache_'

/**
 * 创建缓存工具实例
 * @param {string} namespace - 缓存命名空间，用于区分不同类型的缓存
 * @returns {Object} 缓存工具对象
 */
export const createCacheUtils = (namespace) => {
  const fullPrefix = CACHE_KEY_PREFIX + namespace + '_'
  
  return {
    /**
     * 保存数据到缓存
     * @param {string} key - 缓存键
     * @param {any} data - 要缓存的数据
     */
    set: (key, data) => {
      try {
        const cacheData = {
          data,
          timestamp: Date.now(),
          expires: Date.now() + CACHE_DURATION
        }
        localStorage.setItem(fullPrefix + key, JSON.stringify(cacheData))
        console.log(`💾 ${namespace}缓存已保存: ${key}`)
      } catch (error) {
        console.error(`${namespace}缓存保存失败:`, error)
      }
    },

    /**
     * 从缓存获取数据
     * @param {string} key - 缓存键
     * @returns {any|null} 缓存的数据或null
     */
    get: (key) => {
      try {
        const cached = localStorage.getItem(fullPrefix + key)
        if (!cached) {
          console.log(`🔍 ${namespace}缓存未找到: ${key}`)
          return null
        }

        const cacheData = JSON.parse(cached)
        
        // 检查缓存是否过期
        if (Date.now() > cacheData.expires) {
          console.log(`⏰ ${namespace}缓存已过期: ${key}`)
          localStorage.removeItem(fullPrefix + key)
          return null
        }

        console.log(`✅ ${namespace}缓存命中: ${key}`)
        return cacheData.data
      } catch (error) {
        console.error(`❌ ${namespace}缓存读取失败 (${key}):`, error)
        try {
          localStorage.removeItem(fullPrefix + key)
        } catch (removeError) {
          console.error(`清除损坏${namespace}缓存失败:`, removeError)
        }
        return null
      }
    },

    /**
     * 清除缓存
     * @param {string} key - 要清除的缓存键，如果不提供则清除所有该命名空间的缓存
     */
    clear: (key) => {
      try {
        if (key) {
          localStorage.removeItem(fullPrefix + key)
          console.log(`🗑️ 清除${namespace}缓存: ${key}`)
        } else {
          // 清除所有该命名空间的缓存
          const keysToRemove = []
          for (let i = 0; i < localStorage.length; i++) {
            const storageKey = localStorage.key(i)
            if (storageKey && storageKey.startsWith(fullPrefix)) {
              keysToRemove.push(storageKey)
            }
          }
          
          keysToRemove.forEach(k => localStorage.removeItem(k))
          console.log(`🗑️ 清除所有${namespace}缓存，共 ${keysToRemove.length} 项`)
        }
      } catch (error) {
        console.error(`${namespace}缓存清除失败:`, error)
      }
    },

    /**
     * 获取缓存统计信息
     * @returns {Object} 缓存统计信息
     */
    getStats: () => {
      try {
        let totalItems = 0
        let totalSize = 0
        let expiredItems = 0
        const now = Date.now()

        for (let i = 0; i < localStorage.length; i++) {
          const storageKey = localStorage.key(i)
          if (storageKey && storageKey.startsWith(fullPrefix)) {
            totalItems++
            const value = localStorage.getItem(storageKey)
            if (value) {
              totalSize += value.length
              try {
                const cacheData = JSON.parse(value)
                if (now > cacheData.expires) {
                  expiredItems++
                }
              } catch (e) {
                expiredItems++
              }
            }
          }
        }

        return {
          namespace,
          totalItems,
          totalSize,
          expiredItems,
          validItems: totalItems - expiredItems
        }
      } catch (error) {
        console.error(`获取${namespace}缓存统计失败:`, error)
        return {
          namespace,
          totalItems: 0,
          totalSize: 0,
          expiredItems: 0,
          validItems: 0
        }
      }
    }
  }
}

// 预定义的缓存工具实例
export const netflowCache = createCacheUtils('netflow')
export const openinterestCache = createCacheUtils('openinterest')
export const volume24hCache = createCacheUtils('volume24h')
export const oichartCache = createCacheUtils('oichart') // 专门用于OpenInterestChart组件

/**
 * 清除所有图表缓存
 */
export const clearAllChartCache = () => {
  console.log('🗑️ 清除所有图表缓存')
  netflowCache.clear()
  openinterestCache.clear()
  volume24hCache.clear()
  oichartCache.clear()
}

/**
 * 获取所有图表缓存统计
 */
export const getAllChartCacheStats = () => {
  return {
    netflow: netflowCache.getStats(),
    openinterest: openinterestCache.getStats(),
    volume24h: volume24hCache.getStats(),
    oichart: oichartCache.getStats()
  }
}

/**
 * 清理过期缓存
 */
export const cleanupExpiredCache = () => {
  console.log('🧹 清理过期图表缓存')
  const stats = getAllChartCacheStats()
  
  Object.values(stats).forEach(stat => {
    if (stat.expiredItems > 0) {
      console.log(`清理 ${stat.namespace} 中的 ${stat.expiredItems} 个过期项`)
      // 这里可以添加具体的清理逻辑
    }
  })
}
