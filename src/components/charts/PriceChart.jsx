import React, { useRef, useEffect, useState } from 'react'
import {
  Card,
  CardHeader,
  CardContent,
  Box,
  FormControl,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  ButtonGroup,
  Button,
  IconButton,
  Slider,
  Typography,
} from '@mui/material'
import { ZoomOutMap as ZoomOutIcon } from '@mui/icons-material'
import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import zoomPlugin from 'chartjs-plugin-zoom'
import { useStore } from '../../store/useStore'
import axios from 'axios'
import { openinterestCache } from '../../utils/chartCache'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
)

function PriceChart() {
  const chartRef = useRef(null)
  const [apiData, setApiData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const {
    data,
    showPrice,
    showOI,
    timeRangeStart,
    timeRangeEnd,
    currentExchange,
    currentAsset,
    currentTimeframe,
    currentChartType,
    currentToken,
    setShowPrice,
    setShowOI,
    setTimeRange,
    setCurrentExchange,
    setCurrentAsset,
    setCurrentTimeframe,
    setCurrentChartType,
  } = useStore()



  // 获取合约持仓量数据
  const fetchOpenInterestData = async () => {
    // 构建缓存键
    const cacheKey = `${currentToken}_${currentTimeframe}_${currentAsset.toUpperCase()}`
    console.log('🔍 检查OpenInterest缓存键:', cacheKey)

    // 检查缓存
    const cachedData = openinterestCache.get(cacheKey)
    if (cachedData) {
      console.log('💾 使用OpenInterest缓存数据')
      setApiData(cachedData)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('🌐 发送OpenInterest请求:', `/api/openinterest/${currentToken}`)
      const response = await axios.get(`/api/openinterest/${currentToken}`, {
        params: {
          interval: currentTimeframe,
          type: currentAsset.toUpperCase()
        }
      })

      if (response.data && response.data.success) {
        // 缓存数据
        openinterestCache.set(cacheKey, response.data.data)
        setApiData(response.data.data)
      } else {
        throw new Error(response.data?.error || '数据获取失败')
      }
    } catch (err) {
      console.error('Failed to fetch open interest data:', err)
      setError('加载合约持仓量数据失败')
    } finally {
      setLoading(false)
    }
  }

  // 当时间周期变化时重新获取数据
  useEffect(() => {
    if (currentToken && currentTimeframe) {
      fetchOpenInterestData()
    }
  }, [currentToken, currentTimeframe, currentAsset])

  const handleResetZoom = () => {
    if (chartRef.current) {
      chartRef.current.resetZoom()
    }
  }

  // 优先使用API数据，如果没有则使用原来的数据
  let labels, prices, oiValues, detailedOIData = []

  if (apiData && apiData.tss && apiData.dataValues) {
    // 使用API数据
    const timestamps = apiData.tss || []
    const pricesFromAPI = apiData.prices || []

    // 处理交易所数据 - 如果选择 'all'，则合并所有交易所数据
    let exchangeData = []
    if (currentExchange === 'all') {
      // 合并所有交易所的持仓量数据
      const allExchanges = Object.keys(apiData.dataValues)
      exchangeData = timestamps.map((_, index) => {
        let totalOI = 0
        let validCount = 0

        allExchanges.forEach(exchange => {
          const value = apiData.dataValues[exchange][index]
          if (value !== null && value !== undefined && !isNaN(value)) {
            totalOI += Number(value)
            validCount++
          }
        })

        return validCount > 0 ? totalOI : 0
      })
    } else {
      // 使用指定交易所的数据，需要匹配正确的交易所名称
      const exchangeKey = currentExchange === 'binance' ? 'Binance' :
                         currentExchange === 'okx' ? 'Okex' :
                         currentExchange === 'bybit' ? 'Bybit' :
                         currentExchange
      exchangeData = apiData.dataValues[exchangeKey] || []
    }

    // 确保时间轴按从左到右、从前到后的顺序排列
    // 由于API返回的数据可能是倒序的，我们需要检查并调整
    const isReversed = timestamps.length > 1 && timestamps[0] > timestamps[1]

    let sortedTimestamps = [...timestamps]
    let sortedPrices = [...pricesFromAPI]
    let sortedOiValues = [...exchangeData]

    if (isReversed) {
      sortedTimestamps.reverse()
      sortedPrices.reverse()
      sortedOiValues.reverse()
    }

    // 根据时间范围过滤数据
    const totalDataPoints = sortedTimestamps.length
    const startIndex = Math.floor(totalDataPoints * timeRangeStart / 100)
    const endIndex = Math.ceil(totalDataPoints * timeRangeEnd / 100)

    const filteredTimestamps = sortedTimestamps.slice(startIndex, endIndex)
    const filteredPrices = sortedPrices.slice(startIndex, endIndex)
    const filteredOiValues = sortedOiValues.slice(startIndex, endIndex)

    // 构建详细的交易所数据，用于 tooltip 显示
    const allExchanges = Object.keys(apiData.dataValues)
    detailedOIData = filteredTimestamps.map((timestamp, index) => {
      const actualIndex = startIndex + index
      const exchangeDetails = {}
      let totalOI = 0

      allExchanges.forEach(exchange => {
        const sortedExchangeData = isReversed ?
          [...(apiData.dataValues[exchange] || [])].reverse() :
          (apiData.dataValues[exchange] || [])

        const value = sortedExchangeData[actualIndex]
        const numValue = Number(value) || 0
        exchangeDetails[exchange] = numValue
        if (numValue > 0) totalOI += numValue
      })

      return {
        timestamp,
        price: Number(filteredPrices[index]) || 0,
        totalOI,
        exchanges: exchangeDetails
      }
    })

    labels = filteredTimestamps.map(timestamp => {
      const date = new Date(timestamp)
      return date.toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    })

    prices = filteredPrices.map(price => Number(price) || 0)
    oiValues = filteredOiValues.map(value => Number(value) || 0)
  } else if (data) {
    // 使用原来的数据作为后备
    const priceData = data.price_data || []
    const oiTimeSeriesData = data.oi_time_series || []

    // Sort and filter data based on time range
    const sortedPriceData = [...priceData].sort((a, b) => new Date(a.time) - new Date(b.time))
    const totalDataPoints = sortedPriceData.length
    const startIndex = Math.floor(totalDataPoints * timeRangeStart / 100)
    const endIndex = Math.ceil(totalDataPoints * timeRangeEnd / 100)
    const filteredPriceData = sortedPriceData.slice(startIndex, endIndex)

    // 构建详细数据（后备方案）
    detailedOIData = filteredPriceData.map(item => {
      const timestamp = new Date(item.time).getTime()
      let closestOI = null
      let minTimeDiff = Infinity

      oiTimeSeriesData.forEach(oiItem => {
        const oiTimestamp = new Date(oiItem.time).getTime()
        const timeDiff = Math.abs(timestamp - oiTimestamp)
        if (timeDiff < minTimeDiff) {
          minTimeDiff = timeDiff
          closestOI = oiItem.value
        }
      })

      return {
        timestamp,
        price: item.price,
        totalOI: closestOI || 0,
        exchanges: { 'Total': closestOI || 0 }
      }
    })

    // Prepare chart data
    labels = filteredPriceData.map(item => {
      const date = new Date(item.time)
      return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit'
      }).replace('/', '-')
    })

    prices = filteredPriceData.map(item => item.price)

    oiValues = filteredPriceData.map(item => {
      const timestamp = new Date(item.time).getTime()
      let closestOI = null
      let minTimeDiff = Infinity

      oiTimeSeriesData.forEach(oiItem => {
        const oiTimestamp = new Date(oiItem.time).getTime()
        const timeDiff = Math.abs(timestamp - oiTimestamp)
        if (timeDiff < minTimeDiff) {
          minTimeDiff = timeDiff
          closestOI = oiItem.value
        }
      })

      return closestOI || 0
    })
  } else {
    return null
  }
  const chartData = {
    labels,
    datasets: []
  }

  if (showPrice) {
    chartData.datasets.push({
      type: 'line',
      label: `${data.token || currentToken} 价格`,
      data: prices,
      borderColor: '#00d4ff',
      backgroundColor: currentChartType === 'area' ? 'rgba(0, 212, 255, 0.1)' : 'transparent',
      borderWidth: 2,
      fill: currentChartType === 'area',
      tension: 0.1,
      pointRadius: 0,
      pointHoverRadius: 6,
      yAxisID: 'y',
    })
  }

  if (showOI) {
    chartData.datasets.push({
      type: 'bar',
      label: '持仓量',
      data: oiValues,
      backgroundColor: 'rgba(0, 255, 136, 0.3)',
      borderColor: 'rgba(0, 255, 136, 1)',
      borderWidth: 1,
      yAxisID: 'y1',
    })
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: false, // 隐藏图例但保留数据
      },
      tooltip: {
        backgroundColor: 'rgba(37, 40, 54, 0.95)',
        titleColor: '#ffffff',
        bodyColor: '#b8bcc8',
        borderColor: '#00d4ff',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        displayColors: false,
        callbacks: {
          title: function(context) {
            if (context.length > 0 && detailedOIData.length > 0) {
              const dataIndex = context[0].dataIndex
              const detailData = detailedOIData[dataIndex]
              if (detailData) {
                const date = new Date(detailData.timestamp)
                return date.toLocaleString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              }
            }
            return context[0]?.label || ''
          },
          beforeBody: function(context) {
            if (context.length > 0 && detailedOIData.length > 0) {
              const dataIndex = context[0].dataIndex
              const detailData = detailedOIData[dataIndex]
              if (detailData) {
                return [`${currentToken} 价格: $${detailData.price.toFixed(8)}`]
              }
            }
            return []
          },
          label: function(context) {
            // 不显示默认的 label，我们在 afterBody 中自定义显示
            return null
          },
          afterBody: function(context) {
            if (context.length > 0 && detailedOIData.length > 0) {
              const dataIndex = context[0].dataIndex
              const detailData = detailedOIData[dataIndex]
              if (detailData && detailData.exchanges) {
                const lines = []

                // 按持仓量从大到小排序
                const sortedExchanges = Object.entries(detailData.exchanges)
                  .filter(([_, value]) => value > 0)
                  .sort(([,a], [,b]) => b - a)

                sortedExchanges.forEach(([exchange, value]) => {
                  const formattedValue = value >= 1e8 ?
                    `$${(value / 1e8).toFixed(2)}亿` :
                    value >= 1e4 ?
                    `$${(value / 1e4).toFixed(2)}万` :
                    `$${value.toFixed(2)}`

                  lines.push(`${exchange}: ${formattedValue}`)
                })

                // 添加总计
                const totalFormatted = detailData.totalOI >= 1e8 ?
                  `$${(detailData.totalOI / 1e8).toFixed(2)}亿` :
                  detailData.totalOI >= 1e4 ?
                  `$${(detailData.totalOI / 1e4).toFixed(2)}万` :
                  `$${detailData.totalOI.toFixed(2)}`

                lines.push('')
                lines.push(`ALL: ${totalFormatted}`)

                return lines
              }
            }
            return []
          }
        }
      },
      zoom: {
        pan: {
          enabled: true,
          mode: 'x',
        },
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true,
          },
          mode: 'x',
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          color: 'rgba(184, 188, 200, 0.1)',
        },
        ticks: {
          color: '#b8bcc8',
          maxTicksLimit: 12,
        },
      },
      y: {
        type: 'linear',
        display: showPrice,
        position: 'left',
        grid: {
          color: 'rgba(184, 188, 200, 0.1)',
        },
        ticks: {
          color: '#b8bcc8',
          callback: function(value) {
            return '$' + value.toFixed(8)
          }
        }
      },
      y1: {
        type: 'linear',
        display: showOI,
        position: 'right',
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: '#b8bcc8',
          callback: function(value) {
            return '$' + (value / 1e6).toFixed(1) + 'M'
          }
        }
      }
    }
  }

  return (
    <Card>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Left side dropdowns */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <FormControl size="small">
                <Select
                  value={currentExchange}
                  onChange={(e) => setCurrentExchange(e.target.value)}
                  sx={{ minWidth: 100 }}
                >
                  <MenuItem value="all">ALL</MenuItem>
                  <MenuItem value="binance">Binance</MenuItem>
                  <MenuItem value="okx">OKX</MenuItem>
                  <MenuItem value="bybit">Bybit</MenuItem>
                </Select>
              </FormControl>

              {/* <FormControl size="small">
                <Select
                  value={currentAsset}
                  onChange={(e) => setCurrentAsset(e.target.value)}
                  sx={{ minWidth: 80 }}
                >
                  <MenuItem value="usd">USD</MenuItem>
                  <MenuItem value="btc">BTC</MenuItem>
                  <MenuItem value="eth">ETH</MenuItem>
                </Select>
              </FormControl> */}

              <FormControl size="small">
                <Select
                  value={currentTimeframe}
                  onChange={(e) => setCurrentTimeframe(e.target.value)}
                  sx={{ minWidth: 80 }}
                >
                  <MenuItem value="5m">5分钟</MenuItem>
                  <MenuItem value="15m">15分钟</MenuItem>
                  <MenuItem value="30m">30分钟</MenuItem>
                  <MenuItem value="1h">1小时</MenuItem>
                  <MenuItem value="4h">4小时</MenuItem>
                  <MenuItem value="12h">12小时</MenuItem>
                  <MenuItem value="1d">1天</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small">
                <Select
                  value={currentChartType}
                  onChange={(e) => setCurrentChartType(e.target.value)}
                  sx={{ minWidth: 100 }}
                >
                  <MenuItem value="area">面积图</MenuItem>
                  <MenuItem value="line">折线图</MenuItem>
                  <MenuItem value="candle">K线图</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Center title */}
            <Typography variant="h6" sx={{ flex: 1, textAlign: 'center' }}>
              {currentToken} 合约持仓量变化图
            </Typography>

            {/* Right side controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
              <FormControlLabel
                control={
                  <Switch
                    checked={showOI}
                    onChange={(e) => setShowOI(e.target.checked)}
                    size="small"
                  />
                }
                label="持仓量"
                labelPlacement="end"
              />
              <ButtonGroup size="small" variant="outlined">
                <Button>1D</Button>
                <Button>7D</Button>
                <Button>30D</Button>
              </ButtonGroup>
            </Box>
          </Box>
        }
        action={
          <IconButton size="small" onClick={handleResetZoom}>
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
              onChange={(e, newValue) => setTimeRange(newValue[0], newValue[1])}
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
        <Line ref={chartRef} data={chartData} options={chartOptions} />
      </CardContent>
    </Card>
  )
}

export default PriceChart