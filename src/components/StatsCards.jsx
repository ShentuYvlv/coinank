import React from 'react'
import { Grid, Card, CardContent, Typography, Box } from '@mui/material'
import {
  AttachMoney as DollarIcon,
  ShowChart as ChartIcon,
  SwapHoriz as ExchangeIcon,
  Business as BuildingIcon,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { useStore } from '../store/useStore'

const MotionCard = motion(Card)

function StatsCard({ title, value, subtitle, icon: Icon, color, delay = 0 }) {
  return (
    <MotionCard
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      sx={{
        background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          transform: 'translateY(-5px)',
          boxShadow: 6,
        },
        transition: 'all 0.3s ease',
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
              {value}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              {subtitle}
            </Typography>
          </Box>
          <Box
            sx={{
              opacity: 0.7,
              transition: 'all 0.3s ease',
              '&:hover': { transform: 'scale(1.1)', opacity: 1 },
            }}
          >
            <Icon sx={{ fontSize: 40 }} />
          </Box>
        </Box>
      </CardContent>
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(45deg, rgba(0, 212, 255, 0.05), transparent)',
          pointerEvents: 'none',
        }}
      />
    </MotionCard>
  )
}

function StatsCards() {
  const { data, formatPrice, formatCurrency } = useStore()
  
  if (!data) return null

  const stats = data.stats || {}
  const priceChange = stats.price_change_percent || 0
  const priceChangeDisplay = `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%`

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid item xs={12} sm={6} md={3}>
        <StatsCard
          title="当前价格"
          value={formatPrice(stats.current_price)}
          subtitle={priceChangeDisplay}
          icon={DollarIcon}
          color="#00d4ff"
          delay={0}
        />
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <StatsCard
          title="总持仓量"
          value={formatCurrency(stats.total_oi)}
          subtitle="期货市场"
          icon={ChartIcon}
          color="#00ff88"
          delay={0.1}
        />
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <StatsCard
          title="24h交易量"
          value={formatCurrency(stats.total_volume)}
          subtitle="现货市场"
          icon={ExchangeIcon}
          color="#ffb800"
          delay={0.2}
        />
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <StatsCard
          title="交易所数量"
          value={stats.exchanges_count || 0}
          subtitle="支持交易"
          icon={BuildingIcon}
          color="#00d4ff"
          delay={0.3}
        />
      </Grid>
    </Grid>
  )
}

export default StatsCards