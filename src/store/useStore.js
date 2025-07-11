import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import axios from 'axios'

const useStore = create(
  devtools((set, get) => ({
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
        
        if (isVisible) {
          const { refreshData } = get()
          refreshData()
        }
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
        const { refreshData, isPageVisible } = get()
        if (isPageVisible) {
          refreshData()
        }
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
      
      set({ isLoading: true })
      
      try {
        const response = await axios.get(`/api/token/${token}`)
        
        if (response.data.success) {
          set({ 
            data: response.data.data,
            marketData: response.data.data,
            lastUpdate: new Date(),
            isLoading: false
          })
        } else {
          throw new Error(response.data.error || 'Data loading failed')
        }
      } catch (error) {
        console.error('Failed to load token data:', error)
        set({ isLoading: false })
      }
    },

    switchToken: async (token) => {
      const { currentToken, loadTokenData } = get()
      if (token === currentToken) return
      
      set({ currentToken: token })
      await loadTokenData(token)
    },

    refreshData: () => {
      const { currentToken, loadTokenData } = get()
      loadTokenData(currentToken)
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
  }))
)

export { useStore }