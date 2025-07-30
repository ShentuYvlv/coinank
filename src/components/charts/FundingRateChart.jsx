import React, { useState, useEffect, useRef } from 'react'
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Slider,
  Button,
  ButtonGroup,
  Alert,
  Skeleton,
  CircularProgress,
  IconButton
} from '@mui/material'
import { Refresh as RefreshIcon } from '@mui/icons-material'
import * as echarts from 'echarts'
import axios from 'axios'
import { useStore } from '../../store/useStore'
import { queuedRequest } from '../../utils/requestQueue'
import { useSharedData } from '../../hooks/useSharedData'

// 交易所颜色配置
const EXCHANGE_COLORS = {
  'Binance': '#F3BA2F',
  'Okex': '#FF4444',
  'Bitmex': '#0088CC',
  'Bybit': '#00C851',
  'Bitget': '#0066FF',
  'Gate': '#00DDDD',
  'Huobi': '#FF8800',
  'dYdX': '#00DD88',
  'Hyperliquid': '#FFDD00',
  'Bitunix': '#DD00DD'
}

// 时间间隔选项
const INTERVAL_OPTIONS = [
  { value: '5m', label: '5分钟' },

  { value: '8H', label: '8小时' },
]

function FundingRateChart() {
  const { currentToken } = useStore()
  const { setFundingRateData } = useSharedData()
  const chartRef = useRef(null)
  const chartInstance = useRef(null)

  // 状态管理
  const [interval, setInterval] = useState('5m')
  const [timeRangeStart, setTimeRangeStart] = useState(50)
  const [timeRangeEnd, setTimeRangeEnd] = useState(100)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [priceData, setPriceData] = useState([])
  const [fundingData, setFundingData] = useState([])
  const [exchanges, setExchanges] = useState([])
  
  // 控制显示的数据系列
  const [showPrice, setShowPrice] = useState(true)
  const [visibleExchanges, setVisibleExchanges] = useState({})
  
  // Y轴拖拽缩放状态
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ y: 0, yAxisMin: [0, 0], yAxisMax: [1, 1] })
  const mousePosition = useRef({ x: 0, y: 0 })

  // 获取资金费率数据
  const fetchData = async () => {
    if (!currentToken) return

    setLoading(true)
    setError(null)

    try {
      console.log('🔄 开始获取资金费率数据...')
      console.log('📋 请求参数:', {
        token: currentToken,
        interval
      })

      const requestUrl = `/api/fundingrate/${currentToken}`
      const requestParams = {
        interval
      }

      console.log('🌐 发送FundingRate请求:', requestUrl, requestParams)

      // 使用请求队列，中等优先级
      const response = await queuedRequest(
        () => axios.get(requestUrl, { params: requestParams }),
        4 // 中等偏低优先级
      )

      const data = response.data

      console.log('📡 FundingRate API 完整响应:', data)

      if (data.success && data.data) {
        const { priceData, fundingData, warnings } = data.data

        console.log('📊 处理资金费率图表数据:', priceData)
        console.log('📊 处理资金费率历史数据:', fundingData)
        
        // 处理警告信息
        if (warnings && warnings.length > 0) {
          console.log('⚠️ API警告:', warnings)
          // 可以选择显示警告给用户，目前先记录到控制台
        }

        // 设置价格数据
        if (priceData && priceData.chartData && priceData.chartData.length > 0) {
          setPriceData(priceData.chartData)
          setExchanges(priceData.exchanges || [])

          // 初始化交易所可见性
          const initialVisibility = {}
          priceData.exchanges?.forEach(exchange => {
            initialVisibility[exchange] = true
          })
          setVisibleExchanges(initialVisibility)
          
          console.log('✅ 图表数据设置完成:', {
            chartDataLength: priceData.chartData?.length,
            exchanges: priceData.exchanges
          })
        } else {
          console.log('⚠️ 资金费率图表数据为空')
          setPriceData([])
          setExchanges([])
          setVisibleExchanges({})
        }

        // 设置资金费率数据
        setFundingData(fundingData || [])

        // 更新全局共享数据
        setFundingRateData(fundingData || [])

        console.log('✅ 资金费率数据获取成功')
      } else {
        console.error('API response failed:', data)
        throw new Error(data?.error || '数据获取失败')
      }
    } catch (err) {
      console.error('Failed to fetch funding rate data:', err)
      setError(`加载数据失败: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 处理数据并创建图表
  const createChart = () => {
    if (!chartRef.current || !priceData.length) return

    // 销毁现有图表
    if (chartInstance.current) {
      chartInstance.current.dispose()
    }

    // 创建新图表
    chartInstance.current = echarts.init(chartRef.current, 'dark')

    // 处理价格数据
    const processedPriceData = priceData.map(item => [
      parseInt(item[0]), // 时间戳
      parseFloat(item[1]) || null // 价格
    ]).filter(item => item[1] !== null)

    // 处理资金费率数据 - 按交易所分组
    const fundingSeriesData = {}
    exchanges.forEach((exchange, index) => {
      fundingSeriesData[exchange] = priceData.map(item => [
        parseInt(item[0]), // 时间戳
        parseFloat(item[index + 2]) || null // 资金费率 (跳过时间戳和价格)
      ]).filter(item => item[1] !== null)
    })

    // 不再进行数据过滤，让ECharts的dataZoom来处理时间范围
    const filteredPriceData = processedPriceData
    const filteredFundingData = fundingSeriesData

    // 构建图表系列
    const series = []

    // 价格系列 (右Y轴)
    if (showPrice && filteredPriceData.length > 0) {
      series.push({
        name: `${currentToken} 价格`,
        type: 'line',
        yAxisIndex: 1,
        data: filteredPriceData,
        lineStyle: {
          color: '#FFA500',
          width: 2
        },
        symbol: 'none',
        smooth: false
      })
    }

    // 资金费率系列 (左Y轴)
    Object.keys(filteredFundingData).forEach(exchange => {
      if (visibleExchanges[exchange] && filteredFundingData[exchange].length > 0) {
        series.push({
          name: exchange,
          type: 'line',
          yAxisIndex: 0,
          data: filteredFundingData[exchange],
          lineStyle: {
            color: EXCHANGE_COLORS[exchange] || '#666',
            width: 1.5
          },
          symbol: 'none',
          smooth: false
        })
      }
    })

    // 图表配置
    const option = {
      backgroundColor: 'transparent',
      grid: {
        left: '1%',
        right: '1%',
        bottom: '8%',
        top: '8%',
        containLabel: true
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: '#333',
        textStyle: { color: '#fff' },
        formatter: function(params) {
          if (!params || params.length === 0) return ''
          
          const time = new Date(params[0].value[0]).toLocaleString('zh-CN')
          let content = `<div style="margin-bottom: 5px; font-weight: bold;">${time}</div>`
          
          params.forEach(param => {
            const value = param.value[1]
            if (param.seriesName.includes('价格')) {
              content += `<div style="color: ${param.color};">● ${param.seriesName}: $${value.toFixed(4)}</div>`
            } else {
              content += `<div style="color: ${param.color};">● ${param.seriesName}: ${(value * 100).toFixed(4)}%</div>`
            }
          })
          
          return content
        }
      },
      legend: {
        show: false
      },
      xAxis: {
        type: 'time',
        axisLine: { lineStyle: { color: '#333' } },
        axisTick: { lineStyle: { color: '#333' } },
        axisLabel: { 
          color: '#999',
          formatter: function(value) {
            const date = new Date(value)
            const now = new Date()
            const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))
            
            if (diffDays === 0) {
              return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
            } else if (diffDays < 7) {
              return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
            } else {
              return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
            }
          }
        },
        splitLine: { show: false }
      },
      yAxis: [
        {
          type: 'value',
          name: '资金费率',
          position: 'left',
          scale: true, // 启用自动缩放
          min: function(value) {
            // 动态计算最小值，确保有合理的边距
            const range = value.max - value.min
            const margin = Math.max(range * 0.1, Math.abs(value.min) * 0.05)
            return value.min - margin
          },
          max: function(value) {
            // 动态计算最大值，确保有合理的边距
            const range = value.max - value.min
            const margin = Math.max(range * 0.1, Math.abs(value.max) * 0.05)
            return value.max + margin
          },
          boundaryGap: [0, 0], // 移除边界间隙
          axisLine: { lineStyle: { color: '#333' } },
          axisTick: { lineStyle: { color: '#333' } },
          axisLabel: {
            color: '#999',
            formatter: function(value) {
              return `${(value * 100).toFixed(3)}%`
            }
          },
          splitLine: {
            lineStyle: { color: '#333', type: 'dashed' }
          }
        },
        {
          type: 'value',
          name: '价格 (USD)',
          position: 'right',
          scale: true, // 启用自动缩放
          min: function(value) {
            // 价格轴动态计算最小值，确保有合理的边距
            const range = value.max - value.min
            const margin = Math.max(range * 0.05, value.min * 0.02)
            return Math.max(0, value.min - margin) // 价格不能为负
          },
          max: function(value) {
            // 价格轴动态计算最大值，确保有合理的边距
            const range = value.max - value.min
            const margin = Math.max(range * 0.05, value.max * 0.02)
            return value.max + margin
          },
          boundaryGap: [0, 0], // 移除边界间隙
          axisLine: { lineStyle: { color: '#333' } },
          axisTick: { lineStyle: { color: '#333' } },
          axisLabel: {
            color: '#999',
            formatter: function(value) {
              return `$${value.toFixed(4)}`
            }
          },
          splitLine: { show: false }
        }
      ],
      series: series,
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: 0,
          filterMode: 'none',
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          moveOnMouseWheel: false,
          preventDefaultMouseMove: false,
          start: timeRangeStart,
          end: timeRangeEnd
        }
      ]
    }

    chartInstance.current.setOption(option)
    
    // 添加Y轴拖拽缩放功能
    chartInstance.current.off('mousedown')
    chartInstance.current.off('mousemove') 
    chartInstance.current.off('mouseup')
    
    chartInstance.current.on('mousedown', (params) => {
      const event = params.event?.event
      if (!event) return
      
      // 检查是否点击在Y轴区域
      const chartDom = chartInstance.current.getDom()
      const rect = chartDom.getBoundingClientRect()
      const x = event.clientX - rect.left
      const width = rect.width
      
      // 左侧Y轴区域 (0-80px) 或右侧Y轴区域 (width-80 - width)
      if (x < 80 || x > width - 80) {
        isDraggingRef.current = true
        const option = chartInstance.current.getOption()
        
        // 获取当前Y轴的实际数值范围
        const yAxis0 = option.yAxis[0]
        const yAxis1 = option.yAxis[1]
        
        dragStartRef.current = {
          y: event.clientY,
          yAxisMin: [
            typeof yAxis0.min === 'number' ? yAxis0.min : null,
            typeof yAxis1.min === 'number' ? yAxis1.min : null
          ],
          yAxisMax: [
            typeof yAxis0.max === 'number' ? yAxis0.max : null,
            typeof yAxis1.max === 'number' ? yAxis1.max : null
          ]
        }
        event.preventDefault()
        event.stopPropagation()
      }
    })
  }

  // 切换图表系列显示/隐藏（不重新绘制图表）
  const toggleSeriesVisibility = (seriesName, isVisible) => {
    if (!chartInstance.current) return
    
    if (seriesName === 'price') {
      setShowPrice(isVisible)
      // 查找价格系列并切换显示状态
      chartInstance.current.dispatchAction({
        type: isVisible ? 'legendSelect' : 'legendUnSelect',
        name: `${currentToken} 价格`
      })
    } else {
      // 处理交易所系列
      setVisibleExchanges(prev => ({
        ...prev,
        [seriesName]: isVisible
      }))
      
      // 切换交易所系列显示状态
      chartInstance.current.dispatchAction({
        type: isVisible ? 'legendSelect' : 'legendUnSelect',
        name: seriesName
      })
    }
  }

  // 监听数据变化，重新创建图表（移除timeRangeStart和timeRangeEnd依赖）
  useEffect(() => {
    createChart()
  }, [priceData, fundingData, currentToken])

  // 监听时间范围变化，更新dataZoom而不重新绘制图表
  useEffect(() => {
    if (chartInstance.current && priceData.length > 0) {
      chartInstance.current.setOption({
        dataZoom: [
          {
            type: 'inside',
            xAxisIndex: 0,
            filterMode: 'none',
            zoomOnMouseWheel: true,
            moveOnMouseMove: true,
            moveOnMouseWheel: false,
            preventDefaultMouseMove: false,
            start: timeRangeStart,
            end: timeRangeEnd
          }
        ]
      })
    }
  }, [timeRangeStart, timeRangeEnd])

  // 监听代币变化，添加防抖
  useEffect(() => {
    if (currentToken) {
      // 添加短暂延迟，避免在代币切换过程中发送旧token的请求
      const timer = setTimeout(() => {
        fetchData()
      }, 50)

      return () => clearTimeout(timer)
    }
  }, [currentToken, interval])

  // 组件卸载时销毁图表
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose()
      }
    }
  }, [])

  // 处理窗口大小变化和全局鼠标事件
  useEffect(() => {
    const handleResize = () => {
      if (chartInstance.current) {
        chartInstance.current.resize()
      }
    }

    const handleGlobalMouseUp = () => {
      isDraggingRef.current = false
    }

    const handleGlobalMouseMove = (event) => {
      mousePosition.current = { x: event.clientX, y: event.clientY }
      
      // 处理Y轴拖拽缩放
      if (isDraggingRef.current && chartInstance.current) {
        const deltaY = event.clientY - dragStartRef.current.y
        const scaleFactor = 1 + (deltaY * 0.005) // 缩放系数，调小一些使其更平滑
        
        if (scaleFactor > 0.1 && scaleFactor < 10) { // 限制缩放范围
          const option = chartInstance.current.getOption()
          const yAxis0 = option.yAxis[0]
          const yAxis1 = option.yAxis[1]
          
          // 计算新的Y轴范围
          const newMin0 = dragStartRef.current.yAxisMin[0] !== null 
            ? dragStartRef.current.yAxisMin[0] / scaleFactor 
            : 'dataMin'
          const newMax0 = dragStartRef.current.yAxisMax[0] !== null 
            ? dragStartRef.current.yAxisMax[0] / scaleFactor 
            : 'dataMax'
          const newMin1 = dragStartRef.current.yAxisMin[1] !== null 
            ? dragStartRef.current.yAxisMin[1] / scaleFactor 
            : 'dataMin'
          const newMax1 = dragStartRef.current.yAxisMax[1] !== null 
            ? dragStartRef.current.yAxisMax[1] / scaleFactor 
            : 'dataMax'
          
          const newOption = {
            yAxis: [
              {
                ...yAxis0,
                min: newMin0,
                max: newMax0
              },
              {
                ...yAxis1,
                min: newMin1,
                max: newMax1
              }
            ]
          }
          
          chartInstance.current.setOption(newOption, false)
        }
        
        event.preventDefault()
      }
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('mouseup', handleGlobalMouseUp)
    window.addEventListener('mousemove', handleGlobalMouseMove)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mouseup', handleGlobalMouseUp)
      window.removeEventListener('mousemove', handleGlobalMouseMove)
    }
  }, [])

  return (
    <Card>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Left side controls */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <FormControl size="small">
                <Select
                  value={interval}
                  onChange={(e) => setInterval(e.target.value)}
                  sx={{ minWidth: 100 }}
                >
                  {INTERVAL_OPTIONS.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Center title */}
            <Typography variant="h6" sx={{ flex: 1, textAlign: 'center' }}>
              资金费率历史图表 - {currentToken}
            </Typography>

            {/* Right side placeholder */}
            <Box sx={{ width: 120 }} />
          </Box>
        }
        action={
          <IconButton size="small" onClick={() => fetchData()}>
            <RefreshIcon />
          </IconButton>
        }
        sx={{ pb: 1 }}
      />

      <CardContent sx={{ pt: 0 }}>
        {/* 控制按钮组 */}
        <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* 价格显示控制 */}
        <Button
          size="small"
          variant={showPrice ? "contained" : "outlined"}
          onClick={() => toggleSeriesVisibility('price', !showPrice)}
          sx={{ 
            color: showPrice ? 'white' : '#FFA500',
            backgroundColor: showPrice ? '#FFA500' : 'transparent',
            borderColor: '#FFA500',
            '&:hover': {
              backgroundColor: showPrice ? '#FF8C00' : 'rgba(255, 165, 0, 0.1)'
            }
          }}
        >
          {currentToken} 价格
        </Button>

        {/* 交易所显示控制 */}
        {exchanges.map(exchange => (
          <Button
            key={exchange}
            size="small"
            variant={visibleExchanges[exchange] ? "contained" : "outlined"}
            onClick={() => toggleSeriesVisibility(exchange, !visibleExchanges[exchange])}
            sx={{ 
              color: visibleExchanges[exchange] ? 'white' : EXCHANGE_COLORS[exchange],
              backgroundColor: visibleExchanges[exchange] ? EXCHANGE_COLORS[exchange] : 'transparent',
              borderColor: EXCHANGE_COLORS[exchange],
              '&:hover': {
                backgroundColor: visibleExchanges[exchange] 
                  ? EXCHANGE_COLORS[exchange] 
                  : `${EXCHANGE_COLORS[exchange]}20`
              }
            }}
          >
            {exchange}
          </Button>
        ))}
      </Box>

        {/* 时间滑块 */}
        <Box sx={{ mb: -1, px: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              时间范围:
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {timeRangeStart === 0 && timeRangeEnd === 100 ? '显示全部' : `${timeRangeStart}%-${timeRangeEnd}%`}
            </Typography>
          </Box>
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
      </CardContent>
      
      <CardContent sx={{ height: 450, p: 1 }}>
        <Box sx={{ position: 'relative', height: '100%' }}>
          {loading && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 10
              }}
            >
              <CircularProgress />
            </Box>
          )}
          
          {error && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%'
              }}
            >
              <Typography color="error">{error}</Typography>
            </Box>
          )}

          {!loading && !error && (!priceData || priceData.length === 0) && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%'
              }}
            >
              <Typography color="text.secondary">
                {currentToken} 暂无资金费率数据，可能该代币不支持资金费率查询或数据暂未更新
              </Typography>
            </Box>
          )}
          
          {!loading && !error && priceData && priceData.length > 0 && (
            <div
              ref={chartRef}
              style={{
                width: '100%',
                height: '100%'
              }}
            />
          )}
      </Box>
    </CardContent>
    </Card>
  )
}

export default FundingRateChart
