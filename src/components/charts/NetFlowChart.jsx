import React, { useState, useEffect } from 'react'
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
import ReactECharts from 'echarts-for-react'
import { useStore } from '../../store/useStore'
import axios from 'axios'

const NetFlowChart = () => {
  const theme = useTheme()
  const { currentToken } = useStore()

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

  // 数值格式化函数
  const formatValue = (value) => {
    const absValue = Math.abs(value)
    if (absValue >= 100000000) { // 1亿
      return (value / 100000000).toFixed(1) + '亿'
    } else if (absValue >= 10000) { // 1万
      return (value / 10000).toFixed(1) + '万'
    } else if (absValue >= 1000) { // 1千
      return (value / 1000).toFixed(1) + 'K'
    } else {
      return value.toFixed(0)
    }
  }

  // 价格格式化函数 - 改进精度处理
  const formatPrice = (value) => {
    if (value >= 1) {
      return '$' + value.toFixed(4)
    } else if (value >= 0.0001) {
      return '$' + value.toFixed(6)
    } else {
      return '$' + value.toFixed(8)
    }
  }

  // 计算价格轴的合理范围
  const calculatePriceRange = (prices) => {
    if (!prices || prices.length === 0) return { min: 'dataMin', max: 'dataMax' }

    const validPrices = prices.filter(p => p > 0)
    if (validPrices.length === 0) return { min: 'dataMin', max: 'dataMax' }

    const minPrice = Math.min(...validPrices)
    const maxPrice = Math.max(...validPrices)
    const range = maxPrice - minPrice
    const center = (maxPrice + minPrice) / 2

    // 根据价格范围调整显示范围
    let padding
    if (range / center < 0.01) { // 变化很小，增加padding
      padding = Math.max(range * 10, center * 0.02) // 至少2%的变化范围
    } else if (range / center < 0.05) { // 变化较小
      padding = range * 2
    } else { // 变化正常
      padding = range * 0.1
    }

    return {
      min: Math.max(0, minPrice - padding),
      max: maxPrice + padding
    }
  }

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
      console.log('📊 NetFlow API response:', response.data)

      if (response.data && response.data.success) {
        const responseData = response.data.data
        console.log('NetFlow data type:', typeof responseData, 'isArray:', Array.isArray(responseData))
        console.log('NetFlow data keys:', responseData ? Object.keys(responseData) : 'no data')
        console.log('NetFlow data content:', responseData)

        if (responseData && typeof responseData === 'object') {
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

  // 生成ECharts配置选项
  const getChartOption = () => {
    if (!data || typeof data !== 'object') {
      console.log('❌ NetFlow data not available:', data)
      return {}
    }

    console.log('✅ NetFlow data structure:', data)

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

    if (timestamps.length === 0) {
      console.log('❌ No timestamp data available')
      return {}
    }

    // 根据时间范围过滤数据
    const totalDataPoints = timestamps.length
    const startIndex = Math.floor(totalDataPoints * (100 - timeRangeEnd) / 100)
    const endIndex = Math.ceil(totalDataPoints * (100 - timeRangeStart) / 100)

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
    // 将数据缩放到合理范围（除以1000000，转换为百万单位）
    const buyFlows = reversedLongRatios.map(ratio => (Number(ratio) || 0) / 1000000)
    const sellFlows = reversedShortRatios.map(ratio => (Number(ratio) || 0) / 1000000)
    const netFlows = buyFlows.map((buy, index) => buy - sellFlows[index])
    const priceData = reversedPrices.map(price => Number(price) || 0)

    // 计算价格轴范围
    const priceRange = calculatePriceRange(priceData)

    console.log('📊 计算后的数据:', {
      buyFlows: buyFlows.length,
      sellFlows: sellFlows.length,
      netFlows: netFlows.length,
      priceData: priceData.length,
      sampleBuyFlows: buyFlows.slice(0, 3),
      sampleSellFlows: sellFlows.slice(0, 3),
      sampleNetFlows: netFlows.slice(0, 3),
      samplePriceData: priceData.slice(0, 3),
      priceRange: priceRange
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
        },
        formatter: (params) => {
          let result = params[0].axisValueLabel + '<br/>'
          params.forEach(param => {
            const value = param.value
            let formattedValue
            if (param.seriesName === '价格') {
              formattedValue = formatPrice(value)
            } else {
              formattedValue = formatValue(value)
            }
            result += `${param.marker} ${param.seriesName}: ${formattedValue}<br/>`
          })
          return result
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
          name: '净流入 (百万)',
          position: 'left',
          axisLine: {
            lineStyle: {
              color: '#333'
            }
          },
          axisLabel: {
            color: '#999',
            formatter: (value) => value.toFixed(1) + 'M'
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
          min: priceRange.min,
          max: priceRange.max,
          axisLine: {
            lineStyle: {
              color: '#333'
            }
          },
          axisLabel: {
            color: '#999',
            formatter: (value) => formatPrice(value)
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

    return option
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
              onChange={(_, newValue) => {
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
        <ReactECharts
          option={getChartOption()}
          style={{ height: '100%', width: '100%' }}
          notMerge={true}
          lazyUpdate={true}
          theme="dark"
        />
      </CardContent>
    </Card>
  )
}

export default NetFlowChart