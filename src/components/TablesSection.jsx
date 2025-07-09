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

const TablesSection = () => {
  const { marketData, currentToken } = useStore()
  
  const formatNumber = (num) => {
    if (!num) return '-'
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num)
  }
  
  const formatCurrency = (num) => {
    if (!num) return '-'
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num)
  }
  
  const formatPercent = (num) => {
    if (num === null || num === undefined) return '-'
    const formatted = num.toFixed(2)
    const color = num >= 0 ? 'success' : 'error'
    return (
      <Chip
        label={`${formatted}%`}
        size="small"
        color={color}
        sx={{ minWidth: 70 }}
      />
    )
  }
  
  const FuturesTable = () => {
    const futuresData = marketData?.futures_markets || []
    
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            期货市场数据 - {currentToken}
          </Typography>
          <TableContainer component={Paper} sx={{ maxHeight: 400, bgcolor: 'background.default' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>交易所</TableCell>
                  <TableCell align="right">价格</TableCell>
                  <TableCell align="right">24H涨跌</TableCell>
                  <TableCell align="right">持仓量</TableCell>
                  <TableCell align="right">24H成交额</TableCell>
                  <TableCell align="center">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {futuresData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  futuresData.map((row, index) => (
                    <TableRow key={index} hover>
                      <TableCell>{row.exchange}</TableCell>
                      <TableCell align="right">${formatNumber(row.price)}</TableCell>
                      <TableCell align="right">{formatPercent(row.change_24h)}</TableCell>
                      <TableCell align="right">{formatCurrency(row.open_interest)}</TableCell>
                      <TableCell align="right">{formatCurrency(row.volume_24h)}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="查看详情">
                          <IconButton size="small" color="primary">
                            <OpenInNew fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    )
  }
  
  const SpotTable = () => {
    const spotData = marketData?.spot_markets || []
    
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            现货市场数据 - {currentToken}
          </Typography>
          <TableContainer component={Paper} sx={{ maxHeight: 400, bgcolor: 'background.default' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>交易所</TableCell>
                  <TableCell align="right">价格</TableCell>
                  <TableCell align="right">24H涨跌</TableCell>
                  <TableCell align="right">24H成交额</TableCell>
                  <TableCell align="right">市场深度</TableCell>
                  <TableCell align="center">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {spotData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  spotData.map((row, index) => (
                    <TableRow key={index} hover>
                      <TableCell>{row.exchange}</TableCell>
                      <TableCell align="right">${formatNumber(row.price)}</TableCell>
                      <TableCell align="right">{formatPercent(row.change_24h)}</TableCell>
                      <TableCell align="right">{formatCurrency(row.volume_24h)}</TableCell>
                      <TableCell align="right">{formatCurrency(row.depth)}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="查看详情">
                          <IconButton size="small" color="primary">
                            <OpenInNew fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, mb: 3 }}>
      <FuturesTable />
      <SpotTable />
    </Box>
  )
}

export default TablesSection