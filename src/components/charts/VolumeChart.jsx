import React from 'react'
import { Box, Card, CardContent, Typography, ToggleButton, ToggleButtonGroup, useTheme } from '@mui/material'
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
import { Bar, Line } from 'react-chartjs-2'
import { useStore } from '../../store/useStore'

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

const VolumeChart = () => {
  const theme = useTheme()
  const { marketData, currentToken } = useStore()
  const [chartType, setChartType] = React.useState('bar')
  
  const volumeData = React.useMemo(() => {
    if (!marketData || !marketData.volume_24h) return null

    const volumes = marketData.volume_24h
    if (!volumes || volumes.length === 0) return null

    // 取前10个交易所的数据
    const topVolumes = volumes.slice(0, 10)
    const labels = topVolumes.map(item => item.exchange)
    const data = topVolumes.map(item => item.volume)

    return {
      labels,
      datasets: [
        {
          label: '24H成交额',
          data: data,
          backgroundColor: chartType === 'bar'
            ? 'rgba(0, 212, 255, 0.6)'
            : 'rgba(0, 212, 255, 0.2)',
          borderColor: 'rgba(0, 212, 255, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(0, 212, 255, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(0, 212, 255, 1)',
          tension: 0.4,
        },
      ],
    }
  }, [marketData, chartType])
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
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
          maxRotation: 45,
          minRotation: 45,
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
            return new Intl.NumberFormat('zh-CN', {
              style: 'currency',
              currency: 'USD',
              notation: 'compact',
              minimumFractionDigits: 0,
              maximumFractionDigits: 1,
            }).format(value)
          },
        },
      },
    },
  }
  
  const handleChartTypeChange = (event, newType) => {
    if (newType !== null) {
      setChartType(newType)
    }
  }
  
  if (!volumeData) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            24H成交额 TOP10
          </Typography>
          <Box sx={{ 
            height: 300, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <Typography color="text.secondary">
              暂无数据
            </Typography>
          </Box>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            24H成交额 TOP10 - {currentToken}
          </Typography>
          <ToggleButtonGroup
            value={chartType}
            exclusive
            onChange={handleChartTypeChange}
            size="small"
          >
            <ToggleButton value="bar" sx={{ px: 2 }}>
              柱状图
            </ToggleButton>
            <ToggleButton value="line" sx={{ px: 2 }}>
              折线图
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <Box sx={{ height: 300 }}>
          {chartType === 'bar' ? (
            <Bar options={options} data={volumeData} />
          ) : (
            <Line options={options} data={volumeData} />
          )}
        </Box>
      </CardContent>
    </Card>
  )
}

export default VolumeChart