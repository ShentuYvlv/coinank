import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useStore } from '../store/useStore'
import { queuedRequest } from '../utils/requestQueue'
import { useSharedData } from './useSharedData'

export const useNavbarData = () => {
  const { currentToken } = useStore()
  const { getTotalOI, getTopFundingRates } = useSharedData()
  const abortControllerRef = useRef(null)
  const [navbarData, setNavbarData] = useState({
    totalOI: null,
    fundingRates: [],
    marketCap: null,
    fdv: null,
    maxSupply: null,
    circulatingSupply: null,
    loading: true,
    error: null
  })

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

  // 格式化供应量
  const formatSupply = (value) => {
    if (!value || value === 0) return '-'
    
    const num = parseFloat(value)
    if (num >= 1000000000000) { // 万亿
      return `${(num / 1000000000000).toFixed(2)}万亿`
    } else if (num >= 100000000) { // 亿
      return `${(num / 100000000).toFixed(2)}亿`
    } else if (num >= 10000) { // 万
      return `${(num / 10000).toFixed(2)}万`
    } else {
      return num.toLocaleString()
    }
  }

  // 从全局共享数据获取总持仓量和资金费率
  const updateSharedData = () => {
    const totalOI = getTotalOI()
    const fundingRates = getTopFundingRates()

    setNavbarData(prev => ({
      ...prev,
      totalOI,
      fundingRates
    }))
  }

  // 获取代币详情数据
  const fetchCoinDetail = async (signal) => {
    try {
      console.log(`🔍 开始获取代币详情: ${currentToken}`)

      const response = await queuedRequest(
        () => {
          console.log(`📡 发送coindetail请求: /api/coindetail/${currentToken}`)
          return axios.get(`/api/coindetail/${currentToken}`, { signal })
        },
        6 // 中等优先级
      )

      console.log(`📊 coindetail响应:`, response.data)

      if (response.data && response.data.success) {
        const detail = response.data.data
        console.log(`📋 代币详情原始数据:`, detail)

        // 根据detail.json的实际数据结构解析
        const marketData = detail.marketData || {}
        console.log(`💰 市场数据:`, marketData)

        const result = {
          marketCap: formatLargeNumber(marketData.market_cap?.usd),
          fdv: formatLargeNumber(marketData.fully_diluted_valuation?.usd),
          maxSupply: formatSupply(marketData.max_supply),
          circulatingSupply: formatSupply(marketData.circulating_supply)
        }

        console.log(`✅ 处理后的代币详情:`, result)
        return result
      }

      console.log(`⚠️ coindetail API返回失败:`, response.data)
      return {
        marketCap: '-',
        fdv: '-',
        maxSupply: '-',
        circulatingSupply: '-'
      }
    } catch (error) {
      console.error('❌ 获取代币详情失败:', error)
      return {
        marketCap: '-',
        fdv: '-',
        maxSupply: '-',
        circulatingSupply: '-'
      }
    }
  }

  // 获取代币详情数据（只获取这个，其他数据从共享状态获取）
  const fetchAllData = async () => {
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // 创建新的AbortController
    abortControllerRef.current = new AbortController()

    setNavbarData(prev => ({ ...prev, loading: true, error: null }))

    try {
      // 只获取代币详情，其他数据从共享状态获取
      const coinDetail = await fetchCoinDetail(abortControllerRef.current.signal)

      // 检查请求是否被取消
      if (abortControllerRef.current.signal.aborted) {
        return
      }

      // 更新共享数据
      updateSharedData()

      setNavbarData(prev => ({
        ...prev,
        marketCap: coinDetail.marketCap,
        fdv: coinDetail.fdv,
        maxSupply: coinDetail.maxSupply,
        circulatingSupply: coinDetail.circulatingSupply,
        loading: false,
        error: null
      }))
    } catch (error) {
      // 忽略取消的请求
      if (error.name === 'AbortError') {
        console.log('请求被取消:', error.message)
        return
      }

      console.error('获取Navbar数据失败:', error)
      setNavbarData(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }))
    }
  }

  // 当代币切换时重新获取数据（关键组件，不添加延迟）
  useEffect(() => {
    if (currentToken) {
      fetchAllData()
    }
  }, [currentToken])

  // 定期更新共享数据（每5秒检查一次）
  useEffect(() => {
    const interval = setInterval(() => {
      updateSharedData()
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  // 立即更新一次共享数据
  useEffect(() => {
    updateSharedData()
  }, [])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    ...navbarData,
    refresh: fetchAllData
  }
}
