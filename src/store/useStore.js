import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import io from 'socket.io-client'
import axios from 'axios'

const useStore = create(
  devtools((set, get) => ({
    // State
    currentToken: 'PEPE',
    supportedTokens: ['PEPE'],
    socket: null,
    data: null,
    marketData: null,
    isLoading: false,
    connectionStatus: 'disconnected',
    isConnected: false,
    lastUpdate: null,
    isPageVisible: true,
    
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
      const { connectWebSocket, setupPageVisibility } = get()
      connectWebSocket()
      setupPageVisibility()
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

    connectWebSocket: () => {
      const socket = io(window.location.origin)
      
      socket.on('connect', () => {
        console.log('✅ WebSocket connected')
        set({ 
          socket, 
          connectionStatus: 'connected',
          isConnected: true
        })
        
        const { currentToken } = get()
        socket.emit('subscribe_token', { token: currentToken })
      })
      
      socket.on('disconnect', () => {
        console.log('❌ WebSocket disconnected')
        set({ connectionStatus: 'disconnected', isConnected: false })
      })
      
      socket.on('data_update', (data) => {
        const { currentToken } = get()
        if (data.token === currentToken) {
          set({ 
            data: data.data,
            marketData: data.data,
            lastUpdate: new Date()
          })
        }
      })
      
      socket.on('token_data', (data) => {
        const { currentToken } = get()
        if (data.token === currentToken) {
          set({ 
            data: data.data,
            marketData: data.data,
            lastUpdate: new Date(),
            isLoading: false
          })
        }
      })
      
      set({ socket })
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
      const { currentToken, socket, loadTokenData } = get()
      if (token === currentToken) return
      
      set({ currentToken: token })
      
      if (socket) {
        socket.emit('subscribe_token', { token })
      }
      
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
      
      if (price < 0.001) {
        return '$' + price.toFixed(8)
      } else if (price < 1) {
        return '$' + price.toFixed(4)
      } else {
        return '$' + price.toFixed(2)
      }
    },

    formatCurrency: (amount) => {
      if (!amount) return '$0.00'
      
      if (amount >= 1e9) {
        return '$' + (amount / 1e9).toFixed(1) + 'B'
      } else if (amount >= 1e6) {
        return '$' + (amount / 1e6).toFixed(1) + 'M'
      } else if (amount >= 1e3) {
        return '$' + (amount / 1e3).toFixed(1) + 'K'
      } else {
        return '$' + amount.toFixed(2)
      }
    }
  }))
)

export { useStore }