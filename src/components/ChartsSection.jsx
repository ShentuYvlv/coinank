import React from 'react'
import { Grid, Box, Card, CardContent, Typography, CircularProgress } from '@mui/material'
import PriceChart from './charts/PriceChart'
import OIDistributionChart from './charts/OIDistributionChart'
import NetFlowChart from './charts/NetFlowChart'

import Volume24hChart from './charts/Volume24hChart'
import { useStore } from '../store/useStore'

function ChartsSection() {
  const { data, isLoading, currentToken } = useStore((state) => ({
    data: state.data,
    isLoading: state.isLoading,
    currentToken: state.currentToken
  }))
  
  // 显示加载状态
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400, mb: 4 }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={40} sx={{ mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            正在加载 {currentToken} 数据...
          </Typography>
        </Box>
      </Box>
    )
  }

  // 显示错误状态或空数据状态
  if (!data) {
    return (
      <Box sx={{ display: 'block', mb: 4 }}>
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <CardContent>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              暂无数据
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {currentToken} 的数据正在加载中，请稍后...
            </Typography>
          </CardContent>
        </Card>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'block', mb: 4 }}>
      {/* Price Chart and OI Distribution in same row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={10}>
          <PriceChart />
        </Grid>
        <Grid item xs={12} lg={2}>
          <OIDistributionChart />
        </Grid>
      </Grid>

      {/* Net Flow Chart - 占据整行 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <NetFlowChart />
        </Grid>
      </Grid>
      
      {/* 24H Volume Chart */}
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Volume24hChart />
        </Grid>
      </Grid>
    </Box>
  )
}

export default ChartsSection