import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import axios from 'axios'

// 缓存配置
const CACHE_DURATION = 5 * 60 * 1000 // 5分钟
const CACHE_KEY_PREFIX = 'coinank_cache_'

// 缓存工具函数
const cacheUtils = {
  set: (key, data) => {
    const cacheData = {
      data,
      timestamp: Date.now(),
      expires: Date.now() + CACHE_DURATION
    }
    localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify(cacheData))
  },

  get: (key) => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_PREFIX + key)
      if (!cached) return null

      const cacheData = JSON.parse(cached)
      if (Date.now() > cacheData.expires) {
        localStorage.removeItem(CACHE_KEY_PREFIX + key)
        return null
      }

      return cacheData.data
    } catch (error) {
      console.warn('缓存读取失败:', error)
      return null
    }
  },

  clear: (key) => {
    if (key) {
      localStorage.removeItem(CACHE_KEY_PREFIX + key)
    } else {
      // 清除所有缓存
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith(CACHE_KEY_PREFIX)) {
          localStorage.removeItem(k)
        }
      })
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
    initializeApp: () => {
      const { loadTokenData, setupPageVisibility, startDataRefresh, currentToken } = get()
      loadTokenData(currentToken)
      setupPageVisibility()
      startDataRefresh()
    },
    
    setupPageVisibility: () => {
      const handleVisibilityChange = () => {
        const isVisible = !document.hidden
        set({ isPageVisible: isVisible })

        // 移除自动刷新逻辑，只更新页面可见状态
        // 数据刷新由定时器控制，不再由页面切换触发
        console.log(`📱 页面可见性变化: ${isVisible ? '可见' : '隐藏'}`)
      }

      document.addEventListener('visibilitychange', handleVisibilityChange)

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    },

    startDataRefresh: () => {
      const { refreshInterval, stopDataRefresh } = get()
      
      if (refreshInterval) {
        stopDataRefresh()
      }
      
      const interval = setInterval(() => {
        const { refreshData, isPageVisible, lastUpdate } = get()

        // 检查页面是否可见
        if (!isPageVisible) {
          console.log('⏸️ 页面不可见，跳过定时刷新')
          return
        }

        // 检查距离上次更新是否已经超过5分钟
        const now = new Date()
        if (lastUpdate) {
          const timeDiff = now - lastUpdate
          const minsSinceUpdate = Math.floor(timeDiff / (1000 * 60))
          console.log(`⏰ 距离上次更新: ${minsSinceUpdate} 分钟`)

          // 如果距离上次更新不足4分钟，跳过刷新
          if (timeDiff < 4 * 60 * 1000) {
            console.log('⏭️ 距离上次更新不足4分钟，跳过刷新')
            return
          }
        }

        console.log('🔄 执行定时数据刷新')
        refreshData()
      }, 5 * 60 * 1000) // 5 minutes
      
      set({ refreshInterval: interval })
    },
    
    stopDataRefresh: () => {
      const { refreshInterval } = get()
      if (refreshInterval) {
        clearInterval(refreshInterval)
        set({ refreshInterval: null })
      }
    },

    loadTokenData: async (token) => {
      const { isLoading } = get()
      if (isLoading) return

      // 检查缓存
      const cacheKey = `token_${token}`
      const cachedData = cacheUtils.get(cacheKey)

      if (cachedData) {
        console.log(`💾 使用缓存数据: ${token}`)
        set({
          data: cachedData,
          marketData: cachedData,
          lastUpdate: new Date(),
          isLoading: false
        })
        return
      }

      set({ isLoading: true })

      try {
        console.log(`📊 正在加载代币数据: ${token}`)
        const response = await axios.get(`/api/token/${token}`)

        if (response.data.success) {
          console.log(`✅ ${token} 数据加载成功`)
          const tokenData = response.data.data

          // 缓存数据
          cacheUtils.set(cacheKey, tokenData)

          set({
            data: tokenData,
            marketData: tokenData,
            lastUpdate: new Date(),
            isLoading: false
          })
        } else {
          console.error(`❌ ${token} 数据加载失败:`, response.data.error)
          set({ isLoading: false })
          throw new Error(response.data.error || 'Data loading failed')
        }
      } catch (error) {
        console.error('Failed to load token data:', error)
        set({ isLoading: false })

        // 重新抛出错误，让调用者处理
        if (error.response && error.response.data && error.response.data.error) {
          throw new Error(error.response.data.error)
        } else {
          throw new Error(error.message || '网络连接失败，请检查网络或稍后重试')
        }
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
      // 清除状态
      set({
        data: null,
        marketData: null,
        lastUpdate: null
      })
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