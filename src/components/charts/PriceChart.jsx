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
    setLoading(true)
    setError(null)

    try {
      const response = await axios.get(`/api/openinterest/${currentToken}`, {
        params: {
          interval: currentTimeframe,
          type: currentAsset.toUpperCase()
        }
      })

      if (response.data && response.data.success) {
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
  let labels, prices, oiValues

  if (apiData && apiData.tss && apiData.dataValues) {
    // 使用API数据
    const timestamps = apiData.tss || []
    const pricesFromAPI = apiData.prices || []
    const exchangeData = apiData.dataValues[currentExchange] || []

    // 根据时间范围过滤数据
    const totalDataPoints = timestamps.length
    const startIndex = Math.floor(totalDataPoints * timeRangeStart / 100)
    const endIndex = Math.ceil(totalDataPoints * timeRangeEnd / 100)

    const filteredTimestamps = timestamps.slice(startIndex, endIndex)
    const filteredPrices = pricesFromAPI.slice(startIndex, endIndex)
    const filteredOiValues = exchangeData.slice(startIndex, endIndex)

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
      label: `${data.token || 'PEPE'} 价格`,
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
        callbacks: {
          label: function(context) {
            if (context.dataset.label.includes('价格')) {
              return `${context.dataset.label}: $${context.parsed.y.toFixed(8)}`
            } else {
              return `${context.dataset.label}: $${(context.parsed.y / 1e6).toFixed(2)}M`
            }
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
              PEPE 合约持仓量变化图
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