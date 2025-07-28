/**
 * 全局数据共享Hook
 * 用于在不同组件间共享API数据，避免重复请求
 */

import { create } from 'zustand'

// 创建全局数据存储
const useSharedDataStore = create((set, get) => ({
  // 资金费率数据
  fundingRateData: null,
  setFundingRateData: (data) => set({ fundingRateData: data }),
  
  // 持仓量数据
  openInterestData: null,
  setOpenInterestData: (data) => set({ openInterestData: data }),
  
  // 期货市场数据
  futuresMarketData: null,
  setFuturesMarketData: (data) => set({ futuresMarketData: data }),
  
  // 清除所有数据
  clearAllData: () => set({
    fundingRateData: null,
    openInterestData: null,
    futuresMarketData: null
  })
}))

// 格式化数值为万/亿单位
const formatLargeNumber = (value) => {
  if (!value || value === 0) return '-'
  
  const num = parseFloat(value)
  if (num >= 100000000) { // 1亿
    return `$${(num / 100000000).toFixed(2)}亿`
  } else if (num >= 10000) { // 1万
    return `$${(num / 10000).toFixed(2)}万`
  } else {
    return `$${num.toFixed(2)}`
  }
}

// 导出共享数据Hook
export const useSharedData = () => {
  const store = useSharedDataStore()
  
  // 获取总持仓量
  const getTotalOI = () => {
    const oiData = store.openInterestData
    if (oiData && oiData.tss && oiData.tss.length > 0) {
      const latestIndex = oiData.tss.length - 1
      let totalOI = 0

      Object.keys(oiData).forEach(key => {
        if (key !== 'tss' && Array.isArray(oiData[key])) {
          const latestValue = oiData[key][latestIndex]
          if (latestValue && latestValue > 0) {
            totalOI += latestValue
          }
        }
      })

      return formatLargeNumber(totalOI)
    }
    return '-'
  }
  
  // 获取前三个交易所的资金费率
  const getTopFundingRates = () => {
    const fundingData = store.fundingRateData
    if (fundingData && Array.isArray(fundingData) && fundingData.length > 0) {
      return fundingData
        .filter(item => item.exchangeName && typeof item.fundingRate === 'number')
        .sort((a, b) => Math.abs(b.fundingRate) - Math.abs(a.fundingRate))
        .slice(0, 3)
        .map(item => ({
          exchange: item.exchangeName,
          rate: ((item.fundingRate || 0) * 100).toFixed(4) + '%'
        }))
    }
    return []
  }
  
  return {
    ...store,
    getTotalOI,
    getTopFundingRates
  }
}

// 导出存储实例供组件直接使用
export { useSharedDataStore }
