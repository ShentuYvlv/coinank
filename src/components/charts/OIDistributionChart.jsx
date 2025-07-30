import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent, Typography, CircularProgress } from '@mui/material'
import { PieChart as PieIcon } from '@mui/icons-material'
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { useStore } from '../../store/useStore'
import axios from 'axios'
import { queuedRequest } from '../../utils/requestQueue'

ChartJS.register(ArcElement, Tooltip, Legend)

function OIDistributionChart() {
  const { currentToken } = useStore()
  const [oiData, setOiData] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // 获取持仓量分布数据 - 使用期货数据中的持仓量信息
  const fetchOIData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // 使用请求队列，低优先级（图表数据不如表格数据重要）
      const response = await queuedRequest(
        () => axios.get(`/api/futures-data/${currentToken}`),
        3 // 低优先级
      )

      if (response.data && response.data.success) {
        const futuresMarkets = response.data.data.futures_markets || []

        // 处理数据为持仓量分布格式
        const processedOiData = []

        futuresMarkets.forEach(market => {
          if (market.exchange && market.open_interest && market.open_interest > 0) {
            processedOiData.push({
              exchange: market.exchange,
              value: market.open_interest  // 使用持仓量数据，不是价格
            })
          }
        })

        // 按持仓量从大到小排序
        processedOiData.sort((a, b) => b.value - a.value)

        setOiData(processedOiData)
        console.log('✅ 持仓量分布数据获取成功:', processedOiData.length, '个交易所')
        console.log('持仓量数据示例:', processedOiData.slice(0, 3))
      } else {
        setError(`API错误: ${response.data?.error || '未知错误'}`)
      }
    } catch (error) {
      console.error('❌ 持仓量分布数据获取失败:', error)
      if (error.response) {
        // 服务器返回了错误响应
        let errorMessage = `HTTP ${error.response.status}`
        if (error.response.data) {
          if (typeof error.response.data === 'string') {
            errorMessage += `: ${error.response.data}`
          } else if (typeof error.response.data === 'object') {
            errorMessage += `:\n${JSON.stringify(error.response.data, null, 2)}`
          }
        } else {
          errorMessage += `: ${error.response.statusText}`
        }
        setError(errorMessage)
      } else if (error.request) {
        // 请求发出但没有收到响应
        setError('网络错误: 无法连接到服务器')
      } else {
        // 其他错误
        setError(`请求错误: ${error.message}`)
      }
      setOiData([])
    } finally {
      setIsLoading(false)
    }
  }

  // 当代币切换时重新获取数据，添加防抖
  useEffect(() => {
    if (currentToken) {
      // 添加短暂延迟，避免在代币切换过程中发送旧token的请求
      const timer = setTimeout(() => {
        fetchOIData()
      }, 50)

      return () => clearTimeout(timer)
    }
  }, [currentToken])

  if (isLoading) {
    return (
      <Card sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Card>
    )
  }

  if (error) {
    return (
      <Card sx={{ height: '100%', bgcolor: 'error.dark' }}>
        <CardHeader
          avatar={<PieIcon />}
          title="持仓量分布"
          titleTypographyProps={{ variant: 'h6', color: 'error' }}
        />
        <CardContent sx={{ p: 2 }}>
          <Typography variant="h6" color="error" gutterBottom>
            ❌ 数据加载失败
          </Typography>
          <Typography variant="body2" sx={{ color: '#fff', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
            {error}
          </Typography>
        </CardContent>
      </Card>
    )
  }
  
  // Process OI data
  const exchangeOI = {}
  oiData.forEach(item => {
    const exchangeName = item.exchange
    const totalValue = item.value || 0
    if (exchangeName && totalValue > 0) {
      exchangeOI[exchangeName] = totalValue
    }
  })

  // Sort and get top 8 exchanges
  const sortedExchanges = Object.entries(exchangeOI)
    .filter(([_, value]) => value > 0)
    .sort(([_, a], [__, b]) => b - a)
    .slice(0, 8)

  if (sortedExchanges.length === 0) {
    return (
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardHeader
          title={
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
              <PieIcon sx={{ mr: 1 }} />
              持仓量分布
            </Typography>
          }
        />
        <CardContent sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            暂无持仓量数据
          </Typography>
        </CardContent>
      </Card>
    )
  }

  const labels = sortedExchanges.map(([exchange]) => exchange)
  const values = sortedExchanges.map(([_, value]) => value)
  const total = values.reduce((a, b) => a + b, 0)

  const colors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
    '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
  ]

  const chartData = {
    labels: labels.map((label, i) => {
      const percentage = ((values[i] / total) * 100).toFixed(1)
      return `${label} (${percentage}%)`
    }),
    datasets: [{
      data: values,
      backgroundColor: colors.slice(0, labels.length),
      borderColor: '#ffffff',
      borderWidth: 2,
      hoverBorderWidth: 3,
      hoverOffset: 15,
    }]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 10,
          usePointStyle: true,
          font: {
            size: 11
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(31, 31, 31, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#F7931A',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: function(context) {
            const value = context.parsed
            const percentage = ((value / total) * 100).toFixed(1)
            return `${context.label}: $${(value / 1e6).toFixed(1)}M (${percentage}%)`
          }
        }
      }
    }
  }

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        title={
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
            <PieIcon sx={{ mr: 1 }} />
            持仓量分布
          </Typography>
        }
      />
      <CardContent sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Doughnut data={chartData} options={chartOptions} />
      </CardContent>
    </Card>
  )
}

export default OIDistributionChart