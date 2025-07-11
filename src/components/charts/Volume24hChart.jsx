import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  FormControl,
  Select,
  MenuItem,
  ButtonGroup,
  Button,
  CircularProgress,
  useTheme,
  Slider,
  IconButton
} from '@mui/material'
import { BarChart, ShowChart, ZoomOutMap as ZoomOutIcon } from '@mui/icons-material'
import ReactECharts from 'echarts-for-react'
import axios from 'axios'
import { useStore } from '../../store/useStore'

const EXCHANGES = [
  { value: 'ALL', label: '全部交易所' },
  { value: 'Binance', label: 'Binance' },
  { value: 'Huobi', label: 'Huobi' },
  { value: 'Okx', label: 'OKX' },
  { value: 'Bitget', label: 'Bitget' },
  { value: 'Bitmex', label: 'BitMEX' },
  { value: 'Bybit', label: 'Bybit' },
  { value: 'CME', label: 'CME' },
  { value: 'Gate', label: 'Gate' },
  { value: 'Bitfinex', label: 'Bitfinex' },
  { value: 'Deribit', label: 'Deribit' },
  { value: 'dydx', label: 'dYdX' },
  { value: 'Hyperliquid', label: 'Hyperliquid' },
  { value: 'Bitunix', label: 'Bitunix' },
  { value: 'Kraken', label: 'Kraken' }
]

const TIME_INTERVALS = [
  { value: '5m', label: '5分钟' },
  { value: '15m', label: '15分钟' },
  { value: '30m', label: '30分钟' },
  { value: '1h', label: '1小时' },
  { value: '4h', label: '4小时' },
  { value: '12h', label: '12小时' },
  { value: '1d', label: '1天' }
]

const Volume24hChart = () => {
  const theme = useTheme()
  const { currentToken, formatCurrencyWithComma } = useStore()
  
  const [exchange, setExchange] = useState('ALL')
  const [interval, setInterval] = useState('1h')
  const [chartType, setChartType] = useState('bar')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [timeRangeStart, setTimeRangeStart] = useState(0)
  const [timeRangeEnd, setTimeRangeEnd] = useState(100)
  
  useEffect(() => {
    fetchData()
  }, [currentToken, exchange, interval])
  
  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      // 使用后端API而不是直接调用Coinank API
      const response = await axios.get(`/api/volume24h/${currentToken}`, {
        params: {
          exchangeName: exchange,
          interval: interval
        }
      })

      if (response.data && response.data.success) {
        setData(response.data.data)
      } else {
        throw new Error(response.data?.error || '数据获取失败')
      }
    } catch (err) {
      console.error('Failed to fetch volume data:', err)
      setError('加载数据失败')
    } finally {
      setLoading(false)
    }
  }
  
  const getChartOption = () => {
    if (!data || !data.data) return {}

    // 处理后端返回的数据格式
    const chartData = data.data
    const timestamps = chartData.tss || []
    const prices = chartData.prices || []
    const volumes = chartData.single || []

    if (timestamps.length === 0) return {}

    // 根据时间范围过滤数据
    const totalDataPoints = timestamps.length
    const startIndex = Math.floor(totalDataPoints * timeRangeStart / 100)
    const endIndex = Math.ceil(totalDataPoints * timeRangeEnd / 100)

    const filteredTimestamps = timestamps.slice(startIndex, endIndex)
    const filteredPrices = prices.slice(startIndex, endIndex)
    const filteredVolumes = volumes.slice(startIndex, endIndex)

    const formattedTimestamps = filteredTimestamps.map(ts => {
      const date = new Date(ts)
      return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    })

    // 过滤掉null值
    const validVolumes = filteredVolumes.map(v => v || 0)
    const validPrices = filteredPrices.map(p => p || 0)
    
    const option = {
      backgroundColor: 'transparent',
      grid: {
        top: 40,
        right: 20,
        bottom: 40,
        left: 60,
        containLabel: true
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          crossStyle: {
            color: '#999'
          }
        },
        formatter: function(params) {
          let result = params[0].name + '<br/>'
          params.forEach(param => {
            if (param.seriesName === '24H成交额') {
              result += param.marker + param.seriesName + ': ' + formatCurrencyWithComma(param.value) + '<br/>'
            } else {
              result += param.marker + param.seriesName + ': $' + param.value.toFixed(6) + '<br/>'
            }
          })
          return result
        }
      },
      legend: {
        data: ['24H成交额', '价格'],
        top: 10,
        textStyle: {
          color: theme.palette.text.primary
        }
      },
      xAxis: {
        type: 'category',
        data: formattedTimestamps,
        axisPointer: {
          type: 'shadow'
        },
        axisLabel: {
          color: theme.palette.text.secondary,
          rotate: 45
        },
        axisLine: {
          lineStyle: {
            color: theme.palette.divider
          }
        }
      },
      yAxis: [
        {
          type: 'value',
          name: '24H成交额',
          position: 'left',
          axisLabel: {
            color: theme.palette.text.secondary,
            formatter: function(value) {
              if (value >= 1e8) {
                return '$' + (value / 1e8).toFixed(1) + '亿'
              } else if (value >= 1e4) {
                return '$' + (value / 1e4).toFixed(0) + '万'
              }
              return '$' + value
            }
          },
          axisLine: {
            lineStyle: {
              color: theme.palette.primary.main
            }
          },
          splitLine: {
            lineStyle: {
              color: theme.palette.divider,
              opacity: 0.3
            }
          }
        },
        {
          type: 'value',
          name: '价格',
          position: 'right',
          axisLabel: {
            color: theme.palette.text.secondary,
            formatter: function(value) {
              if (value < 0.01) {
                return '$' + value.toFixed(6)
              }
              return '$' + value.toFixed(4)
            }
          },
          axisLine: {
            lineStyle: {
              color: theme.palette.warning.main
            }
          },
          splitLine: {
            show: false
          }
        }
      ],
      series: [
        {
          name: '24H成交额',
          type: chartType,
          data: validVolumes,
          itemStyle: {
            color: theme.palette.primary.main,
            borderRadius: chartType === 'bar' ? [4, 4, 0, 0] : 0
          },
          barWidth: '60%'
        },
        {
          name: '价格',
          type: 'line',
          yAxisIndex: 1,
          data: validPrices,
          smooth: true,
          lineStyle: {
            color: theme.palette.warning.main,
            width: 2
          },
          itemStyle: {
            color: theme.palette.warning.main
          },
          symbol: 'circle',
          symbolSize: 4
        }
      ]
    }
    
    return option
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
                  value={exchange}
                  onChange={(e) => setExchange(e.target.value)}
                  sx={{ minWidth: 120 }}
                >
                  {EXCHANGES.map(ex => (
                    <MenuItem key={ex.value} value={ex.value}>
                      {ex.label}
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
                  {TIME_INTERVALS.map(ti => (
                    <MenuItem key={ti.value} value={ti.value}>
                      {ti.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Center title */}
            <Typography variant="h6" sx={{ flex: 1, textAlign: 'center' }}>
              24H成交额趋势 - {currentToken}
            </Typography>

            {/* Right side controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ButtonGroup size="small">
                <Button
                  variant={chartType === 'bar' ? 'contained' : 'outlined'}
                  onClick={() => setChartType('bar')}
                  startIcon={<BarChart />}
                >
                  柱状图
                </Button>
                <Button
                  variant={chartType === 'line' ? 'contained' : 'outlined'}
                  onClick={() => setChartType('line')}
                  startIcon={<ShowChart />}
                >
                  折线图
                </Button>
              </ButtonGroup>
            </Box>
          </Box>
        }
        action={
          <IconButton size="small" onClick={() => fetchData()}>
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

          {!loading && !error && data && (
            <ReactECharts
              option={getChartOption()}
              style={{ height: '100%', width: '100%' }}
              notMerge={true}
              lazyUpdate={true}
              theme="dark"
            />
          )}
        </Box>
      </CardContent>
    </Card>
  )
}

export default Volume24hChart