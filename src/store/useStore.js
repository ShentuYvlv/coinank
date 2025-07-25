import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import axios from 'axios'
import { clearAllChartCache, getAllChartCacheStats } from '../utils/chartCache'

// 缓存配置
const CACHE_DURATION = 30 * 60 * 1000 // 30分钟（从5分钟增加到30分钟）
const CACHE_KEY_PREFIX = 'coinank_cache_'

// 缓存工具函数
const cacheUtils = {
  set: (key, data) => {
    try {
    const cacheData = {
      data,
      timestamp: Date.now(),
      expires: Date.now() + CACHE_DURATION
    }
    localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify(cacheData))
      console.log(`💾 缓存已保存: ${key}`)
    } catch (error) {
      console.error('缓存保存失败:', error)
    }
  },

  get: (key) => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_PREFIX + key)
      if (!cached) {
        console.log(`🔍 缓存未找到: ${key}`)
        return null
      }

      const cacheData = JSON.parse(cached)
      
      // 检查缓存是否过期
      if (Date.now() > cacheData.expires) {
        console.log(`⏰ 缓存已过期: ${key}`)
        localStorage.removeItem(CACHE_KEY_PREFIX + key)
        return null
      }

      console.log(`✅ 缓存命中: ${key}`)
      return cacheData.data
    } catch (error) {
      console.error(`❌ 缓存读取失败 (${key}):`, error)
      // 如果缓存数据损坏，清除它
      try {
        localStorage.removeItem(CACHE_KEY_PREFIX + key)
      } catch (removeError) {
        console.error('清除损坏缓存失败:', removeError)
      }
      return null
    }
  },

  clear: (key) => {
    try {
    if (key) {
      localStorage.removeItem(CACHE_KEY_PREFIX + key)
        console.log(`🗑️ 清除缓存: ${key}`)
    } else {
      // 清除所有缓存
        const keysToRemove = []
        for (let i = 0; i < localStorage.length; i++) {
          const storageKey = localStorage.key(i)
          if (storageKey && storageKey.startsWith(CACHE_KEY_PREFIX)) {
            keysToRemove.push(storageKey)
          }
        }
        
        keysToRemove.forEach(k => localStorage.removeItem(k))
        console.log(`🗑️ 清除所有缓存，共 ${keysToRemove.length} 项`)
        }
    } catch (error) {
      console.error('缓存清除失败:', error)
    }
  }
}

const useStore = create(
  devtools(
    persist(
      (set, get) => ({
    // State
    currentToken: 'PEPE',
    supportedTokens: ['PEPE'],
    data: null,
    marketData: null,
    isLoading: false,
    lastUpdate: null,
    isPageVisible: true,
    refreshInterval: null,
    
    // Chart state
    showPrice: true,
    showOI: true,
    timeRangeStart: 0,
    timeRangeEnd: 100,
    currentExchange: 'all',
    currentAsset: 'usd',
    currentTimeframe: '1d',
    currentChartType: 'area',
    
    // Net flow chart state
    netFlowTimeRangeStart: 0,
    netFlowTimeRangeEnd: 100,
    showNetFlowAll: true,
    
    // Volume chart state
    volumeTimeRangeStart: 0,
    volumeTimeRangeEnd: 100,
    volumeChartType: 'bar',

    // Actions
    initializeApp: async () => {
      const { loadTokenData, setupPageVisibility, startDataRefresh, currentToken } = get()
      
      console.log('🚀 开始初始化应用...')
      console.log(`📋 当前状态:`, {
        currentToken,
        localStorage: {
          hasZustandStorage: !!localStorage.getItem('coinank-storage'),
          hasTokenCache: !!localStorage.getItem(`coinank_cache_token_${currentToken}`),
          storageKeys: Object.keys(localStorage).filter(key => key.startsWith('coinank'))
        }
      })
      
      try {
        // 等待数据加载完成
        await loadTokenData(currentToken)
        console.log('✅ 应用初始化完成')
      } catch (error) {
        console.error('❌ 应用初始化失败:', error)
        // 即使数据加载失败，也要设置其他功能
      }
      
      // 设置页面可见性监听（移除自动刷新）
      setupPageVisibility()
      console.log('🚫 自动刷新功能已禁用，仅支持手动刷新')
    },
    
    setupPageVisibility: () => {
      const handleVisibilityChange = () => {
        const isVisible = !document.hidden
        set({ isPageVisible: isVisible })

        // 移除自动刷新逻辑，只更新页面可见状态
        // 自动刷新功能已完全禁用，只保留手动刷新
        console.log(`📱 页面可见性变化: ${isVisible ? '可见' : '隐藏'}`)
      }

      document.addEventListener('visibilitychange', handleVisibilityChange)

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    },

    // 移除自动刷新功能，只保留手动刷新
    startDataRefresh: () => {
      console.log('🚫 自动刷新功能已禁用')
    },

    stopDataRefresh: () => {
      console.log('🚫 自动刷新功能已禁用')
    },

    loadTokenData: async (token) => {
      const { isLoading } = get()
      if (isLoading) {
        console.log(`⚠️ ${token} 数据正在加载中，跳过重复请求`)
        return
      }

      console.log(`🔄 开始加载代币数据: ${token}`)

      // 检查缓存
      const cacheKey = `token_${token}`
      console.log(`🔍 检查缓存键: ${CACHE_KEY_PREFIX}${cacheKey}`)
      
      // 先检查localStorage中是否有这个键
      const rawCached = localStorage.getItem(CACHE_KEY_PREFIX + cacheKey)
      console.log(`📝 localStorage原始数据:`, rawCached ? '存在' : '不存在')
      
      if (rawCached) {
        try {
          const parsedCache = JSON.parse(rawCached)
          console.log(`📊 缓存数据结构:`, {
            hasData: !!parsedCache.data,
            timestamp: new Date(parsedCache.timestamp).toLocaleString(),
            expires: new Date(parsedCache.expires).toLocaleString(),
            now: new Date().toLocaleString(),
            isExpired: Date.now() > parsedCache.expires
          })
        } catch (e) {
          console.error(`❌ 缓存数据解析失败:`, e)
        }
      }
      
      const cachedData = cacheUtils.get(cacheKey)

      if (cachedData) {
        console.log(`💾 使用缓存数据: ${token}`)
        console.log(`📋 缓存数据预览:`, {
          hasStats: !!cachedData.stats,
          hasFutures: !!cachedData.futures,
          dataKeys: Object.keys(cachedData)
        })
        
        set({
          data: cachedData,
          marketData: cachedData,
          lastUpdate: new Date(),
          isLoading: false
        })
        return Promise.resolve(cachedData)
      } else {
        console.log(`❌ 缓存未命中，原因见上方详细信息`)
      }

      set({ isLoading: true })

      try {
        console.log(`📊 从API加载代币数据: ${token}`)
        const response = await axios.get(`/api/token/${token}`)

        if (response.data && response.data.success) {
          console.log(`✅ ${token} 数据加载成功`)
          const tokenData = response.data.data

          // 缓存数据
          console.log(`💾 保存缓存数据到: ${CACHE_KEY_PREFIX}${cacheKey}`)
          cacheUtils.set(cacheKey, tokenData)

          set({
            data: tokenData,
            marketData: tokenData,
            lastUpdate: new Date(),
            isLoading: false
          })
          
          return Promise.resolve(tokenData)
        } else {
          console.error(`❌ ${token} 数据加载失败:`, response.data?.error || '未知错误')
          set({ isLoading: false })
          const error = new Error(response.data?.error || 'Data loading failed')
          throw error
        }
      } catch (error) {
        console.error(`❌ 加载代币数据失败 (${token}):`, error)
        set({ isLoading: false })

        // 构建有意义的错误信息
        let errorMessage = '网络连接失败，请检查网络或稍后重试'
        if (error.response?.data?.error) {
          errorMessage = error.response.data.error
        } else if (error.message) {
          errorMessage = error.message
        }

        // 重新抛出错误，让调用者处理
        throw new Error(errorMessage)
      }
    },



    switchToken: async (token) => {
      const { currentToken, loadTokenData } = get()
      if (token === currentToken) return

      console.log(`🔄 切换代币: ${currentToken} -> ${token}`)

      try {
        // 直接加载完整数据（已优化为并发）
        console.log(`📊 加载 ${token} 完整数据...`)
        await loadTokenData(token)
        set({ currentToken: token })
        console.log(`✅ 成功切换到代币: ${token}`)

      } catch (error) {
        console.error(`❌ 切换到代币 ${token} 失败:`, error)
        // 不更新 currentToken，保持原来的代币
        throw error // 重新抛出错误让UI处理
      }
    },

    refreshData: () => {
      const { currentToken, loadTokenData, isLoading, lastUpdate } = get()

      // 防止重复调用
      if (isLoading) {
        console.log('⚠️ 数据正在加载中，跳过刷新请求')
        return
      }

      // 清除当前代币的缓存
      if (currentToken) {
        cacheUtils.clear(`token_${currentToken}`)
      }

      // 记录刷新原因
      const now = new Date()
      const timeSinceLastUpdate = lastUpdate ? Math.floor((now - lastUpdate) / (1000 * 60)) : '未知'
      console.log(`🔄 刷新数据 - 代币: ${currentToken}, 距离上次更新: ${timeSinceLastUpdate} 分钟`)

      loadTokenData(currentToken)
    },

    clearCache: () => {
      console.log('🗑️ 清除所有缓存')
      cacheUtils.clear()
    },

    clearAllCache: () => {
      console.log('🗑️ 清除所有本地缓存和状态')
      // 清除本地缓存
      cacheUtils.clear()
      // 清除图表缓存
      clearAllChartCache()
      // 清除状态
      set({
        data: null,
        marketData: null,
        lastUpdate: null
      })
    },

    // 获取缓存统计信息
    getCacheStats: () => {
      const mainCacheStats = {
        // 主要数据缓存统计
        mainCache: {
          totalItems: 0,
          totalSize: 0
        }
      }

      // 获取图表缓存统计
      const chartStats = getAllChartCacheStats()

      return {
        ...mainCacheStats,
        charts: chartStats
      }
    },

    // Chart control actions
    setShowPrice: (show) => set({ showPrice: show }),
    setShowOI: (show) => set({ showOI: show }),
    setTimeRange: (start, end) => set({ timeRangeStart: start, timeRangeEnd: end }),
    setCurrentExchange: (exchange) => set({ currentExchange: exchange }),
    setCurrentAsset: (asset) => set({ currentAsset: asset }),
    setCurrentTimeframe: (timeframe) => set({ currentTimeframe: timeframe }),
    setCurrentChartType: (type) => set({ currentChartType: type }),
    
    // Net flow chart actions
    setNetFlowTimeRange: (start, end) => set({ netFlowTimeRangeStart: start, netFlowTimeRangeEnd: end }),
    setShowNetFlowAll: (show) => set({ showNetFlowAll: show }),
    
    // Volume chart actions
    setVolumeTimeRange: (start, end) => set({ volumeTimeRangeStart: start, volumeTimeRangeEnd: end }),
    setVolumeChartType: (type) => set({ volumeChartType: type }),

    // Utility functions
    debugCache: () => {
      console.log('🔍 缓存调试信息:')
      
      // 检查所有相关的localStorage键
      const allKeys = Object.keys(localStorage)
      const coinankKeys = allKeys.filter(key => key.startsWith('coinank'))
      
      console.log('📋 所有coinank相关键:', coinankKeys)
      
      coinankKeys.forEach(key => {
        const value = localStorage.getItem(key)
        if (key.startsWith('coinank_cache_')) {
          try {
            const parsed = JSON.parse(value)
            console.log(`🔧 缓存键 ${key}:`, {
              hasData: !!parsed.data,
              timestamp: new Date(parsed.timestamp).toLocaleString(),
              expires: new Date(parsed.expires).toLocaleString(),
              isExpired: Date.now() > parsed.expires,
              timeLeft: Math.round((parsed.expires - Date.now()) / 1000 / 60) + '分钟'
            })
          } catch (e) {
            console.log(`❌ 缓存键 ${key} 解析失败:`, e)
          }
        } else {
          console.log(`ℹ️ 其他键 ${key}:`, value?.length > 100 ? value.substring(0, 100) + '...' : value)
        }
      })
      
      const { currentToken } = get()
      const expectedCacheKey = `coinank_cache_token_${currentToken}`
      console.log(`🎯 当前token: ${currentToken}`)
      console.log(`🎯 期望缓存键: ${expectedCacheKey}`)
      console.log(`🎯 缓存键存在: ${!!localStorage.getItem(expectedCacheKey)}`)
    },

    formatPrice: (price) => {
      if (!price) return '$0.00'
      
      // 不截断价格，根据价格大小自动调整小数位数
      if (price < 0.00001) {
        return '$' + price.toFixed(10)
      } else if (price < 0.0001) {
        return '$' + price.toFixed(8)
      } else if (price < 0.001) {
        return '$' + price.toFixed(6)
      } else if (price < 0.01) {
        return '$' + price.toFixed(5)
      } else if (price < 1) {
        return '$' + price.toFixed(4)
      } else if (price < 100) {
        return '$' + price.toFixed(3)
      } else {
        return '$' + price.toFixed(2)
      }
    },

    formatCurrency: (amount) => {
      if (!amount) return '$0.00'
      
      // 转换为亿和万
      if (amount >= 1e8) {
        return '$' + (amount / 1e8).toFixed(2) + '亿'
      } else if (amount >= 1e4) {
        return '$' + (amount / 1e4).toFixed(2).replace(/\.?0+$/, '') + '万'
      } else {
        return '$' + amount.toFixed(2)
      }
    },
    
    formatCurrencyWithComma: (amount) => {
      if (!amount) return '$0.00'
      
      // 转换为亿和万，使用逗号格式化
      if (amount >= 1e8) {
        const billions = (amount / 1e8).toFixed(2)
        return '$' + billions + '亿'
      } else if (amount >= 1e4) {
        const thousands = (amount / 1e4).toFixed(2)
        // 添加千位分隔符
        const [intPart, decPart] = thousands.split('.')
        const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
        return '$' + formattedInt + (decPart ? '.' + decPart : '') + '万'
      } else {
        return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      }
    }
  }),
      {
        name: 'coinank-storage',
        partialize: (state) => ({
          currentToken: state.currentToken,
          currentExchange: state.currentExchange,
          currentAsset: state.currentAsset,
          currentTimeframe: state.currentTimeframe,
          currentChartType: state.currentChartType,
          showPrice: state.showPrice,
          showOI: state.showOI,
          timeRangeStart: state.timeRangeStart,
          timeRangeEnd: state.timeRangeEnd,
        }),
      }
    )
  )
)

export { useStore }