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
  IconButton
} from '@mui/material'
import { ZoomOutMap as ZoomOutIcon } from '@mui/icons-material'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { useStore } from '../../store/useStore'
import axios from 'axios'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
)

const NetFlowChart = () => {
  const theme = useTheme()
  const { currentToken } = useStore()

  // 状态管理
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [exchangeName, setExchangeName] = useState('')
  const [interval, setInterval] = useState('12h')
  const [timeRangeStart, setTimeRangeStart] = useState(0)
  const [timeRangeEnd, setTimeRangeEnd] = useState(100)

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
    { value: '', label: 'ALL' },
    { value: 'Binance', label: 'Binance' },
    { value: 'OKX', label: 'OKX' },
    { value: 'Bybit', label: 'Bybit' },
    { value: 'Bitget', label: 'Bitget' }
  ]
  
  // 获取净流入数据
  const fetchNetFlowData = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await axios.get(`/api/netflow/${currentToken}`, {
        params: {
          exchangeName,
          interval,
          limit: 500
        }
      })

      console.log('NetFlow API response:', response.data) // 调试日志

      if (response.data && response.data.success) {
        const responseData = response.data.data
        console.log('NetFlow data type:', typeof responseData, 'isArray:', Array.isArray(responseData))

        if (responseData && typeof responseData === 'object') {
          // 直接使用返回的数据对象，它包含 tss, longRatios, shortRatios, prices 等字段
          setData(responseData)
        } else {
          throw new Error('数据格式不正确')
        }
      } else {
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
    fetchNetFlowData()
  }, [exchangeName, interval, currentToken])

  // 处理图表数据
  const netFlowData = React.useMemo(() => {
    if (!data || typeof data !== 'object') {
      console.log('NetFlow data not available:', data)
      return null
    }

    console.log('NetFlow data structure:', data) // 调试日志

    // 检查数据结构 - 根据实际API响应格式
    const timestamps = data.tss || []
    const longRatios = data.longRatios || []
    const shortRatios = data.shortRatios || []
    const prices = data.prices || []

    console.log('Data arrays length:', {
      timestamps: timestamps.length,
      longRatios: longRatios.length,
      shortRatios: shortRatios.length,
      prices: prices.length
    })

    if (timestamps.length === 0) {
      console.log('No timestamp data available')
      return null
    }

    // 根据时间范围过滤数据
    const totalDataPoints = timestamps.length
    const startIndex = Math.floor(totalDataPoints * timeRangeStart / 100)
    const endIndex = Math.ceil(totalDataPoints * timeRangeEnd / 100)

    const filteredTimestamps = timestamps.slice(startIndex, endIndex)
    const filteredLongRatios = longRatios.slice(startIndex, endIndex)
    const filteredShortRatios = shortRatios.slice(startIndex, endIndex)
    const filteredPrices = prices.slice(startIndex, endIndex)

    const labels = filteredTimestamps.map(timestamp => {
      const date = new Date(timestamp)
      return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    })

    // 使用longRatios和shortRatios作为买入和卖出数据
    const buyFlows = filteredLongRatios.map(ratio => Number(ratio) || 0)
    const sellFlows = filteredShortRatios.map(ratio => Number(ratio) || 0)
    const netFlows = buyFlows.map((buy, index) => buy - sellFlows[index])
    const priceData = filteredPrices.map(price => Number(price) || 0)

    return {
      labels,
      datasets: [
        {
          label: '多头比例',
          data: buyFlows,
          backgroundColor: 'rgba(0, 255, 136, 0.6)',
          borderColor: 'rgba(0, 255, 136, 1)',
          borderWidth: 1,
          type: 'bar',
          yAxisID: 'y',
        },
        {
          label: '空头比例',
          data: sellFlows,
          backgroundColor: 'rgba(255, 71, 87, 0.6)',
          borderColor: 'rgba(255, 71, 87, 1)',
          borderWidth: 1,
          type: 'bar',
          yAxisID: 'y',
        },
        {
          label: '净流入差值',
          data: netFlows,
          backgroundColor: netFlows.map(value =>
            value >= 0 ? 'rgba(0, 212, 255, 0.6)' : 'rgba(255, 184, 0, 0.6)'
          ),
          borderColor: netFlows.map(value =>
            value >= 0 ? 'rgba(0, 212, 255, 1)' : 'rgba(255, 184, 0, 1)'
          ),
          borderWidth: 1,
          type: 'bar',
          yAxisID: 'y',
        },
        {
          label: '价格',
          data: priceData,
          borderColor: 'rgba(255, 206, 84, 1)',
          backgroundColor: 'rgba(255, 206, 84, 0.2)',
          borderWidth: 2,
          type: 'line',
          yAxisID: 'y1',
          fill: false,
          tension: 0.1,
        },
      ],
    }
  }, [data, timeRangeStart, timeRangeEnd])
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: theme.palette.text.primary,
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            let label = context.dataset.label || ''
            if (label) {
              label += ': '
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('zh-CN', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(context.parsed.y)
            }
            return label
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: theme.palette.text.secondary,
          font: {
            size: 11,
          },
        },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: theme.palette.text.secondary,
          font: {
            size: 11,
          },
          callback: function(value) {
            return value.toFixed(2) + '%'
          },
        },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: theme.palette.text.secondary,
          font: {
            size: 11,
          },
          callback: function(value) {
            return '$' + value.toFixed(8)
          },
        },
      },
    },
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

  if (error || !netFlowData) {
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* 可以添加其他控制按钮 */}
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
        <Bar data={netFlowData} options={options} />
      </CardContent>
    </Card>
  )
}

export default NetFlowChart