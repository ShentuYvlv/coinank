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
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { useStore } from '../../store/useStore'
import axios from 'axios'
import { oichartCache } from '../../utils/chartCache'

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
)

const OpenInterestChart = () => {
  const theme = useTheme()
  const { currentToken } = useStore()
  
  // 状态管理
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [interval, setInterval] = useState('1h')
  const [dataType, setDataType] = useState('USD')
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
  
  // 数据类型选项
  const typeOptions = [
    { value: 'USD', label: 'USD' },
    { value: 'BTC', label: 'BTC' },
    { value: 'ETH', label: 'ETH' }
  ]
  
  // 获取合约持仓量数据
  const fetchOpenInterestData = async () => {
    // 构建缓存键
    const cacheKey = `${currentToken}_${interval}_${dataType}`
    console.log('🔍 检查OpenInterestChart缓存键:', cacheKey)

    // 检查缓存
    const cachedData = oichartCache.get(cacheKey)
    if (cachedData) {
      console.log('💾 使用OpenInterestChart缓存数据')
      setData(cachedData)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('🌐 发送OpenInterestChart请求:', `/api/openinterest/${currentToken}`)
      const response = await axios.get(`/api/openinterest/${currentToken}`, {
        params: {
          interval,
          type: dataType
        }
      })

      if (response.data && response.data.success) {
        // 缓存数据
        oichartCache.set(cacheKey, response.data.data)
        setData(response.data.data)
      } else {
        throw new Error(response.data?.error || '数据获取失败')
      }
    } catch (err) {
      console.error('Failed to fetch open interest data:', err)
      setError('加载数据失败')
    } finally {
      setLoading(false)
    }
  }
  
  // 组件挂载和参数变化时获取数据
  useEffect(() => {
    fetchOpenInterestData()
  }, [interval, dataType, currentToken])
  
  // 处理图表数据
  const chartData = React.useMemo(() => {
    if (!data || !data.data) return null

    const oiData = data.data
    const timestamps = oiData.tss || []
    const values = oiData.values || []

    if (timestamps.length === 0) return null

    // 根据时间范围过滤数据
    const totalDataPoints = timestamps.length
    const startIndex = Math.floor(totalDataPoints * timeRangeStart / 100)
    const endIndex = Math.ceil(totalDataPoints * timeRangeEnd / 100)
    
    const filteredTimestamps = timestamps.slice(startIndex, endIndex)
    const filteredValues = values.slice(startIndex, endIndex)

    const labels = filteredTimestamps.map(ts => {
      const date = new Date(ts)
      return date.toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    })

    return {
      labels,
      datasets: [
        {
          label: `合约持仓量 (${dataType})`,
          data: filteredValues,
          borderColor: theme.palette.primary.main,
          backgroundColor: theme.palette.primary.main + '20',
          borderWidth: 2,
          fill: true,
          tension: 0.1,
          pointRadius: 1,
          pointHoverRadius: 4,
        },
      ],
    }
  }, [data, timeRangeStart, timeRangeEnd, theme, dataType])
  
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
      tooltip: {
        callbacks: {
          label: (context) => {
            let label = context.dataset.label || ''
            if (label) {
              label += ': '
            }
            if (context.parsed.y !== null) {
              const value = context.parsed.y
              if (dataType === 'USD') {
                label += new Intl.NumberFormat('zh-CN', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(value)
              } else {
                label += value.toFixed(4) + ' ' + dataType
              }
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
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: theme.palette.text.secondary,
          font: {
            size: 11,
          },
          callback: function(value) {
            if (dataType === 'USD') {
              return new Intl.NumberFormat('zh-CN', {
                style: 'currency',
                currency: 'USD',
                notation: 'compact',
                maximumFractionDigits: 1,
              }).format(value)
            } else {
              return value.toFixed(4) + ' ' + dataType
            }
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
            合约持仓量
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

  if (error || !chartData) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            合约持仓量
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

              <FormControl size="small">
                <Select
                  value={dataType}
                  onChange={(e) => setDataType(e.target.value)}
                  sx={{ minWidth: 60 }}
                >
                  {typeOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Center title */}
            <Typography variant="h6" sx={{ flex: 1, textAlign: 'center' }}>
              合约持仓量 - {currentToken}
            </Typography>

            {/* Right side controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* 可以添加其他控制按钮 */}
            </Box>
          </Box>
        }
        action={
          <IconButton size="small" onClick={() => fetchOpenInterestData()}>
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
        <Line data={chartData} options={options} />
      </CardContent>
    </Card>
  )
}

export default OpenInterestChart
