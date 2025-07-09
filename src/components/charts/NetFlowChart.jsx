import React from 'react'
import { Box, Card, CardContent, Typography, useTheme } from '@mui/material'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { useStore } from '../../store/useStore'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

const NetFlowChart = () => {
  const theme = useTheme()
  const { marketData, currentToken } = useStore()
  
  const netFlowData = React.useMemo(() => {
    if (!marketData || !marketData.net_flow) return null

    const flows = marketData.net_flow
    if (!flows || flows.length === 0) return null

    // 取最近的20个数据点用于显示
    const recentFlows = flows.slice(-20)

    const labels = recentFlows.map(item => {
      const date = new Date(item.time)
      return date.toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    })
    const buyFlows = recentFlows.map(item => item.buy_flow)
    const sellFlows = recentFlows.map(item => item.sell_flow)
    const netFlows = recentFlows.map(item => item.net_flow)

    return {
      labels,
      datasets: [
        {
          label: '买入流入',
          data: buyFlows,
          backgroundColor: 'rgba(0, 255, 136, 0.6)',
          borderColor: 'rgba(0, 255, 136, 1)',
          borderWidth: 1,
        },
        {
          label: '卖出流入',
          data: sellFlows,
          backgroundColor: 'rgba(255, 71, 87, 0.6)',
          borderColor: 'rgba(255, 71, 87, 1)',
          borderWidth: 1,
        },
        {
          label: '净流入',
          data: netFlows,
          backgroundColor: netFlows.map(value =>
            value >= 0 ? 'rgba(0, 212, 255, 0.6)' : 'rgba(255, 184, 0, 0.6)'
          ),
          borderColor: netFlows.map(value =>
            value >= 0 ? 'rgba(0, 212, 255, 1)' : 'rgba(255, 184, 0, 1)'
          ),
          borderWidth: 1,
        },
      ],
    }
  }, [marketData])
  
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
  
  if (!netFlowData) {
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
        <Typography variant="h6" gutterBottom>
          资金净流入 - {currentToken}
        </Typography>
        <Box sx={{ height: 300 }}>
          <Bar options={options} data={netFlowData} />
        </Box>
      </CardContent>
    </Card>
  )
}

export default NetFlowChart