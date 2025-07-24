import React from 'react'
import { Grid, Box, Card, CardContent, Typography, CircularProgress } from '@mui/material'
import PriceChart from './charts/PriceChart'
import OIDistributionChart from './charts/OIDistributionChart'
import Volume24hChart from './charts/Volume24hChart'
import FundingRateChart from './charts/FundingRateChart'
import { useStore } from '../store/useStore'

// 第一部分：价格图表和OI分布
const ChartSection1 = ({ data, currentToken }) => (
  <Box sx={{ display: 'block', mb: 1 }}>
    <Grid container spacing={2} sx={{ mb: 1 }}>
      <Grid item xs={12} lg={10}>
        <PriceChart data={data} currentToken={currentToken} />
      </Grid>
      <Grid item xs={12} lg={2}>
        <OIDistributionChart data={data} currentToken={currentToken} />
      </Grid>
    </Grid>
  </Box>
);

// 第二部分：资金费率图表（中间部分）
const ChartSection2 = ({ data, currentToken }) => (
  <Box sx={{ display: 'block', mb: 1 }}>
    <Grid container spacing={2}>
      <Grid item xs={12}> {/* 修正为xs=12 */}
        <FundingRateChart data={data} currentToken={currentToken} />
      </Grid>
    </Grid>
  </Box>
);

// 第三部分：24小时成交量图表
const ChartSection3 = ({ data, currentToken }) => (
  <Box sx={{ display: 'block' }}>
    <Grid container spacing={2} sx={{ mb: 1 }}>
      <Grid item xs={12}>
        <Volume24hChart data={data} currentToken={currentToken} />
      </Grid>
    </Grid>
  </Box>
);

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
    <>
      <ChartSection1 data={data} currentToken={currentToken} />
      <ChartSection2 data={data} currentToken={currentToken} />
      <ChartSection3 data={data} currentToken={currentToken} />
    </>
  )
}

// export default ChartsSection

export { ChartSection1, ChartSection2, ChartSection3 };
