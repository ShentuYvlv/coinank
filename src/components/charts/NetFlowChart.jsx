import React, { useState, useEffect, useRef } from 'react'
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  useTheme,
  FormControl,
  Select,
  MenuItem,
  Slider,
  IconButton,
  FormControlLabel,
  Switch
} from '@mui/material'
import { ZoomOutMap as ZoomOutIcon } from '@mui/icons-material'
import * as echarts from 'echarts'
import { useStore } from '../../store/useStore'
import axios from 'axios'

const NetFlowChart = () => {
  const theme = useTheme()
  const { currentToken } = useStore()
  const chartRef = useRef(null)
  const chartInstance = useRef(null)

  // 状态管理
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [exchangeName, setExchangeName] = useState('ALL')
  const [interval, setInterval] = useState('5m')
  const [timeRangeStart, setTimeRangeStart] = useState(0)
  const [timeRangeEnd, setTimeRangeEnd] = useState(100)

  // 控制数据集显示的状态
  const [showLongRatio, setShowLongRatio] = useState(true)
  const [showShortRatio, setShowShortRatio] = useState(true)
  const [showNetFlow, setShowNetFlow] = useState(true)
  const [showPrice, setShowPrice] = useState(true)

  // 时间周期选项
  const intervalOptions = [
    { value: '5m', label: '5分钟' },
    { value: '15m', label: '15分钟' },
    { value: '30m', label: '30分钟' },
    { value: '1h', label: '1小时' },
    { value: '4h', label: '4小时' },
    { value: '12h', label: '12小时' },
    { value: '1d', label: '1天' }
  ]

  // 交易所选项
  const exchangeOptions = [
    { value: 'ALL', label: 'ALL' },
    { value: 'Binance', label: 'Binance' },
    { value: 'OKX', label: 'OKX' },
    { value: 'Bybit', label: 'Bybit' },
    { value: 'Bitget', label: 'Bitget' }
  ]
  
  // 获取净流入数据
  const fetchNetFlowData = async () => {
    console.log('🔄 开始获取净流入数据...')
    console.log('📋 请求参数:', {
      token: currentToken,
      exchangeName: exchangeName === 'ALL' ? '' : exchangeName,
      interval,
      limit: 500
    })

    setLoading(true)
    setError(null)

    try {
      const requestUrl = `/api/netflow/${currentToken}`
      const requestParams = {
        exchangeName: exchangeName === 'ALL' ? '' : exchangeName,
        interval,
        limit: 500
      }

      console.log('🌐 发送请求:', requestUrl, requestParams)

      const response = await axios.get(requestUrl, {
        params: requestParams
      })

      console.log('📡 NetFlow API 完整响应:', response)
      console.log('📊 NetFlow API response:', response.data) // 调试日志

      if (response.data && response.data.success) {
        const responseData = response.data.data
        console.log('NetFlow data type:', typeof responseData, 'isArray:', Array.isArray(responseData))
        console.log('NetFlow data keys:', responseData ? Object.keys(responseData) : 'no data')
        console.log('NetFlow data content:', responseData)

        if (responseData && typeof responseData === 'object') {
          // 直接使用返回的数据对象，它包含 tss, longRatios, shortRatios, prices 等字段
          setData(responseData)
        } else {
          console.error('Invalid data format:', responseData)
          throw new Error('数据格式不正确')
        }
      } else {
        console.error('API response failed:', response.data)
        throw new Error(response.data?.error || '数据获取失败')
      }
    } catch (err) {
      console.error('Failed to fetch net flow data:', err)
      setError(`加载数据失败: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 组件挂载和参数变化时获取数据
  useEffect(() => {
    console.log('🔄 参数变化，重新获取数据:', { exchangeName, interval, currentToken })
    fetchNetFlowData()
  }, [exchangeName, interval, currentToken])

  // 初始化ECharts
  useEffect(() => {
    console.log('🎨 ECharts初始化useEffect触发')
    console.log('📊 echarts对象:', echarts)
    console.log('📊 echarts.init方法:', typeof echarts.init)
    console.log('📊 chartRef.current状态:', chartRef.current)
    console.log('📊 DOM元素信息:', chartRef.current ? {
      tagName: chartRef.current.tagName,
      clientWidth: chartRef.current.clientWidth,
      clientHeight: chartRef.current.clientHeight,
      offsetParent: chartRef.current.offsetParent
    } : 'null')

    // 延迟初始化，确保DOM完全渲染
    const timer = setTimeout(() => {
      console.log('⏰ 延迟初始化开始...')
      console.log('📊 延迟后chartRef.current状态:', chartRef.current)

      if (chartRef.current) {
        try {
          console.log('🎨 开始初始化ECharts...')
          chartInstance.current = echarts.init(chartRef.current, 'dark')
          console.log('✅ ECharts initialized successfully')
          console.log('📊 图表实例:', chartInstance.current)

          // 监听窗口大小变化
          const handleResize = () => {
            chartInstance.current?.resize()
          }
          window.addEventListener('resize', handleResize)

        } catch (error) {
          console.error('❌ Failed to initialize ECharts:', error)
          console.error('❌ 错误详情:', error.stack)
          setError('图表初始化失败')
        }
      } else {
        console.log('❌ 延迟后chartRef.current仍为null，无法初始化ECharts')
      }
    }, 100)

    return () => {
      console.log('🧹 清理ECharts实例')
      clearTimeout(timer)
      chartInstance.current?.dispose()
    }
  }, [])

  // 更新图表数据
  useEffect(() => {
    console.log('🔄 图表数据或配置变化:', {
      hasChartInstance: !!chartInstance.current,
      hasData: !!data,
      timeRangeStart,
      timeRangeEnd,
      showLongRatio,
      showShortRatio,
      showNetFlow,
      showPrice
    })

    if (chartInstance.current && data) {
      console.log('✅ 条件满足，开始更新图表')
      updateChart()
    } else {
      console.log('❌ 更新图表条件不满足:', {
        chartInstance: !!chartInstance.current,
        data: !!data
      })
    }
  }, [data, timeRangeStart, timeRangeEnd, showLongRatio, showShortRatio, showNetFlow, showPrice])

  // 更新图表
  const updateChart = () => {
    console.log('🎨 开始更新图表...')
    console.log('📊 当前数据状态:', data)
    console.log('📊 图表实例状态:', chartInstance.current ? '已初始化' : '未初始化')

    if (!data || typeof data !== 'object') {
      console.log('❌ NetFlow data not available:', data)
      return
    }

    console.log('✅ NetFlow data structure:', data) // 调试日志

    // 检查数据结构 - 根据实际API响应格式
    const timestamps = data.tss || []
    const longRatios = data.longRatios || []
    const shortRatios = data.shortRatios || []
    const prices = data.prices || []

    console.log('📊 Data arrays length:', {
      timestamps: timestamps.length,
      longRatios: longRatios.length,
      shortRatios: shortRatios.length,
      prices: prices.length
    })

    console.log('📊 Sample data preview:')
    console.log('  - timestamps[0-2]:', timestamps.slice(0, 3))
    console.log('  - longRatios[0-2]:', longRatios.slice(0, 3))
    console.log('  - shortRatios[0-2]:', shortRatios.slice(0, 3))
    console.log('  - prices[0-2]:', prices.slice(0, 3))

    if (timestamps.length === 0) {
      console.log('❌ No timestamp data available')
      return
    }

    // 根据时间范围过滤数据
    const totalDataPoints = timestamps.length
    const startIndex = Math.floor(totalDataPoints * timeRangeStart / 100)
    const endIndex = Math.ceil(totalDataPoints * timeRangeEnd / 100)

    console.log('🔍 数据过滤信息:', {
      totalDataPoints,
      timeRangeStart,
      timeRangeEnd,
      startIndex,
      endIndex,
      filteredLength: endIndex - startIndex
    })

    const filteredTimestamps = timestamps.slice(startIndex, endIndex)
    const filteredLongRatios = longRatios.slice(startIndex, endIndex)
    const filteredShortRatios = shortRatios.slice(startIndex, endIndex)
    const filteredPrices = prices.slice(startIndex, endIndex)

    console.log('📊 过滤后数据长度:', {
      filteredTimestamps: filteredTimestamps.length,
      filteredLongRatios: filteredLongRatios.length,
      filteredShortRatios: filteredShortRatios.length,
      filteredPrices: filteredPrices.length
    })

    // 反转数据，使最新的在左边
    const reversedTimestamps = [...filteredTimestamps].reverse()
    const reversedLongRatios = [...filteredLongRatios].reverse()
    const reversedShortRatios = [...filteredShortRatios].reverse()
    const reversedPrices = [...filteredPrices].reverse()

    const labels = reversedTimestamps.map(timestamp => {
      const date = new Date(timestamp)
      return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    })

    // 使用longRatios和shortRatios作为买入和卖出数据
    const buyFlows = reversedLongRatios.map(ratio => Number(ratio) || 0)
    const sellFlows = reversedShortRatios.map(ratio => Number(ratio) || 0)
    const netFlows = buyFlows.map((buy, index) => buy - sellFlows[index])
    const priceData = reversedPrices.map(price => Number(price) || 0)

    console.log('📊 计算后的数据:', {
      buyFlows: buyFlows.length,
      sellFlows: sellFlows.length,
      netFlows: netFlows.length,
      priceData: priceData.length,
      sampleBuyFlows: buyFlows.slice(0, 3),
      sampleSellFlows: sellFlows.slice(0, 3),
      sampleNetFlows: netFlows.slice(0, 3),
      samplePriceData: priceData.slice(0, 3)
    })

    console.log('🎛️ 显示选项:', {
      showLongRatio,
      showShortRatio,
      showNetFlow,
      showPrice
    })

    // 构建ECharts配置
    const series = []

    if (showLongRatio) {
      series.push({
        name: '多头比例',
        type: 'bar',
        data: buyFlows,
        itemStyle: {
          color: 'rgba(0, 255, 136, 0.8)'
        },
        yAxisIndex: 0
      })
    }

    if (showShortRatio) {
      series.push({
        name: '空头比例',
        type: 'bar',
        data: sellFlows.map(value => -value), // 负值显示在下方
        itemStyle: {
          color: 'rgba(255, 71, 87, 0.8)'
        },
        yAxisIndex: 0
      })
    }

    if (showNetFlow) {
      series.push({
        name: '净流入差值',
        type: 'bar',
        data: netFlows,
        itemStyle: {
          color: (params) => {
            return params.value >= 0 ? 'rgba(0, 212, 255, 0.8)' : 'rgba(255, 184, 0, 0.8)'
          }
        },
        yAxisIndex: 0
      })
    }

    if (showPrice) {
      series.push({
        name: '价格',
        type: 'line',
        data: priceData,
        lineStyle: {
          color: 'rgba(255, 206, 84, 1)',
          width: 2
        },
        itemStyle: {
          color: 'rgba(255, 206, 84, 1)'
        },
        symbol: 'none', // 不显示点
        yAxisIndex: 1
      })
    }

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: '#333',
        textStyle: {
          color: '#fff'
        }
      },
      legend: {
        data: series.map(s => s.name),
        textStyle: {
          color: '#fff'
        },
        top: 10
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: labels,
        axisLine: {
          lineStyle: {
            color: '#333'
          }
        },
        axisLabel: {
          color: '#999',
          rotate: 45
        }
      },
      yAxis: [
        {
          type: 'value',
          name: '净流入',
          position: 'left',
          axisLine: {
            lineStyle: {
              color: '#333'
            }
          },
          axisLabel: {
            color: '#999'
          },
          splitLine: {
            lineStyle: {
              color: '#333'
            }
          }
        },
        {
          type: 'value',
          name: '价格',
          position: 'right',
          axisLine: {
            lineStyle: {
              color: '#333'
            }
          },
          axisLabel: {
            color: '#999'
          },
          splitLine: {
            show: false
          }
        }
      ],
      series: series
    }

    console.log('📊 ECharts配置:', option)
    console.log('📊 系列数量:', series.length)
    console.log('📊 标签数量:', labels.length)

    try {
      if (!chartInstance.current) {
        console.error('❌ 图表实例不存在')
        setError('图表实例未初始化')
        return
      }

      console.log('🎨 开始设置ECharts选项...')
      chartInstance.current.setOption(option)
      console.log('✅ Chart updated successfully with', series.length, 'series')
      console.log('✅ 图表更新完成')
    } catch (error) {
      console.error('❌ Failed to update chart:', error)
      console.error('❌ 错误堆栈:', error.stack)
      setError('图表更新失败')
    }
  }
  

  
  if (loading) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            资金净流入
          </Typography>
          <Box sx={{
            height: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Typography color="text.secondary">
              加载中...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            资金净流入
          </Typography>
          <Box sx={{
            height: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Typography color="text.secondary">
              {error || '暂无数据'}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Left side dropdowns */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <FormControl size="small">
                <Select
                  value={exchangeName}
                  onChange={(e) => setExchangeName(e.target.value)}
                  sx={{ minWidth: 100 }}
                >
                  {exchangeOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small">
                <Select
                  value={interval}
                  onChange={(e) => setInterval(e.target.value)}
                  sx={{ minWidth: 80 }}
                >
                  {intervalOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Center title */}
            <Typography variant="h6" sx={{ flex: 1, textAlign: 'center' }}>
              资金净流入 - {currentToken}
            </Typography>

            {/* Right side controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showLongRatio}
                    onChange={(e) => setShowLongRatio(e.target.checked)}
                    size="small"
                  />
                }
                label="多头"
                labelPlacement="end"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={showShortRatio}
                    onChange={(e) => setShowShortRatio(e.target.checked)}
                    size="small"
                  />
                }
                label="空头"
                labelPlacement="end"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={showNetFlow}
                    onChange={(e) => setShowNetFlow(e.target.checked)}
                    size="small"
                  />
                }
                label="净流入"
                labelPlacement="end"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={showPrice}
                    onChange={(e) => setShowPrice(e.target.checked)}
                    size="small"
                  />
                }
                label="价格"
                labelPlacement="end"
              />
            </Box>
          </Box>
        }
        action={
          <IconButton size="small" onClick={() => fetchNetFlowData()}>
            <ZoomOutIcon />
          </IconButton>
        }
      />
      <Box sx={{ px: 2, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="caption">时间周期:</Typography>
          <Box sx={{ flex: 1, mx: 2 }}>
            <Slider
              value={[timeRangeStart, timeRangeEnd]}
              onChange={(e, newValue) => {
                setTimeRangeStart(newValue[0])
                setTimeRangeEnd(newValue[1])
              }}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${value}%`}
              sx={{
                '& .MuiSlider-thumb': {
                  width: 16,
                  height: 16,
                }
              }}
            />
          </Box>
          <Typography variant="caption" sx={{ minWidth: 100, textAlign: 'center' }}>
            {timeRangeStart === 0 && timeRangeEnd === 100 ? '显示全部' : `${timeRangeStart}%-${timeRangeEnd}%`}
          </Typography>
        </Box>
      </Box>
      <CardContent sx={{ height: 400, p: 1 }}>
        <div
          ref={chartRef}
          style={{
            width: '100%',
            height: '100%'
          }}
        />
      </CardContent>
    </Card>
  )
}

export default NetFlowChart