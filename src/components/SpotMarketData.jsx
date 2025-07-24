import React from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material'
import { OpenInNew } from '@mui/icons-material'
import { useStore } from '../store/useStore'

const SpotMarketData = () => {
  const { marketData, currentToken, formatPrice, formatCurrencyWithComma } = useStore()

  // 详细调试信息
  console.log('=== SpotMarketData 调试信息 ===')
  console.log('marketData:', marketData)
  console.log('marketData keys:', marketData ? Object.keys(marketData) : 'null')
  console.log('spot_markets:', marketData?.spot_markets)
  console.log('spot_markets length:', marketData?.spot_markets?.length)
  console.log('spot_markets type:', typeof marketData?.spot_markets)
  if (marketData?.spot_markets && Array.isArray(marketData.spot_markets)) {
    console.log('spot_markets sample:', marketData.spot_markets[0])
  }
  console.log('currentToken:', currentToken)
  console.log('=== SpotMarketData 调试结束 ===')

  const formatPercent = (num) => {
    if (num === null || num === undefined) return '-'
    const formatted = num.toFixed(2)
    const color = num >= 0 ? 'success' : 'error'
    const sign = num >= 0 ? '+' : ''
    return (
      <Chip
        label={`${sign}${formatted}%`}
        size="small"
        color={color}
        sx={{
          minWidth: 80,
          fontSize: '0.75rem',
          fontWeight: 'bold'
        }}
      />
    )
  }
  
  const spotData = marketData?.spot_markets || []
  
  return (
    <Box sx={{ height: '100%' }}>
      <Typography variant="h6" gutterBottom sx={{ px: 2, pt: 2, color: '#fff' }}>
        现货市场数据 - {currentToken}
      </Typography>
      <Box sx={{ px: 2, pb: 2, height: 'calc(100% - 60px)' }}>
        <TableContainer 
          component={Paper} 
          sx={{ 
            maxHeight: '100%', 
            bgcolor: 'background.default',
            borderRadius: '0.5rem'
          }}
        >
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: '18%' }}>交易所</TableCell>
                <TableCell align="right" sx={{ width: '20%' }}>价格</TableCell>
                <TableCell align="right" sx={{ width: '18%', minWidth: 100 }}>24H涨跌</TableCell>
                <TableCell align="right" sx={{ width: '22%' }}>24H成交额</TableCell>
                <TableCell align="right" sx={{ width: '22%' }}>市场深度</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {spotData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                spotData.map((row, index) => (
                  <TableRow key={index} hover>
                    <TableCell>{row.exchange}</TableCell>
                    <TableCell align="right">{formatPrice(row.price)}</TableCell>
                    <TableCell align="right">{formatPercent(row.change_24h)}</TableCell>
                    <TableCell align="right">{formatCurrencyWithComma(row.volume_24h)}</TableCell>
                    <TableCell align="right">{formatCurrencyWithComma(row.depth)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  )
}

export default SpotMarketData
