import React, { useState, useEffect } from 'react'
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
  CircularProgress,
} from '@mui/material'

import { useStore } from '../store/useStore'
import axios from 'axios'
import { queuedRequest } from '../utils/requestQueue'

const SpotMarketData = () => {
  const { currentToken, formatPrice, formatCurrencyWithComma } = useStore()
  const [spotData, setSpotData] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // 获取现货数据
  const fetchSpotData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // 使用请求队列，中等优先级
      const response = await queuedRequest(
        () => axios.get(`/api/spot-data/${currentToken}`),
        5 // 中等优先级
      )

      if (response.data && response.data.success) {
        setSpotData(response.data.data.spot_markets || [])
        console.log('✅ 现货数据获取成功:', response.data.data.spot_markets?.length)
      } else {
        setError(`API错误: ${response.data?.error || '未知错误'}`)
      }
    } catch (error) {
      console.error('❌ 现货数据获取失败:', error)
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
      setSpotData([])
    } finally {
      setIsLoading(false)
    }
  }

  // 当代币切换时重新获取数据（关键组件，不添加延迟）
  useEffect(() => {
    if (currentToken) {
      fetchSpotData()
    }
  }, [currentToken])
  
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

  if (isLoading) {
    return (
      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ height: '100%' }}>
        <Typography variant="h6" gutterBottom sx={{ px: 2, pt: 2, color: '#fff' }}>
          现货市场数据 - {currentToken}
        </Typography>
        <Box sx={{ px: 2, pb: 2, height: 'calc(100% - 60px)' }}>
          <Card sx={{ height: '100%', bgcolor: 'error.dark' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="h6" color="error" gutterBottom>
                ❌ 数据加载失败
              </Typography>
              <Typography variant="body2" sx={{ color: '#fff', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                {error}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>
    )
  }

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
