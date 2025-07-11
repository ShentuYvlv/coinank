import React from 'react'
import { Grid, Box } from '@mui/material'
import PriceChart from './charts/PriceChart'
import OIDistributionChart from './charts/OIDistributionChart'
import NetFlowChart from './charts/NetFlowChart'
import VolumeChart from './charts/VolumeChart'
import Volume24hChart from './charts/Volume24hChart'
import { useStore } from '../store/useStore'

function ChartsSection() {
  const data = useStore((state) => state.data)
  
  if (!data) return null

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

      {/* Net Flow and Volume Charts in same row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={6}>
          <NetFlowChart />
        </Grid>
        <Grid item xs={12} lg={6}>
          <VolumeChart />
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