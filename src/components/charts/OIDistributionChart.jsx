import React from 'react'
import { Card, CardHeader, CardContent, Typography } from '@mui/material'
import { PieChart as PieIcon } from '@mui/icons-material'
import { Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { useStore } from '../../store/useStore'

ChartJS.register(ArcElement, Tooltip, Legend)

function OIDistributionChart() {
  const data = useStore((state) => state.data)
  
  if (!data) return null

  const oiData = data.oi_data || []
  
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
            return `${context.label}: $${(value / 1e6).toFixed(1)}M`
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