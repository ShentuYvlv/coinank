import React, { useState, useEffect } from 'react'
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Chip,
  LinearProgress,
  IconButton,
  Collapse
} from '@mui/material'
import { 
  ExpandMore as ExpandMoreIcon,
  Queue as QueueIcon,
  Speed as SpeedIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material'
import { getQueueStatus, clearQueue } from '../utils/requestQueue'

const QueueStatus = () => {
  const [status, setStatus] = useState({
    queueLength: 0,
    activeRequests: 0,
    tokens: 0,
    successRate: '0%',
    recentRequests: 0
  })
  const [expanded, setExpanded] = useState(false)

  // 定期更新状态
  useEffect(() => {
    const updateStatus = () => {
      setStatus(getQueueStatus())
    }

    // 立即更新一次
    updateStatus()

    // 每秒更新状态
    const interval = setInterval(updateStatus, 1000)

    return () => clearInterval(interval)
  }, [])

  const getQueueColor = () => {
    if (status.queueLength === 0) return 'success'
    if (status.queueLength < 5) return 'warning'
    return 'error'
  }

  const getSuccessRateColor = () => {
    const rate = parseFloat(status.successRate)
    if (rate >= 90) return 'success'
    if (rate >= 70) return 'warning'
    return 'error'
  }

  const getTokensProgress = () => {
    // 假设最大令牌数为8
    return (status.tokens / 8) * 100
  }

  return (
    <Card sx={{ 
      position: 'fixed', 
      bottom: 16, 
      right: 16, 
      minWidth: 280,
      zIndex: 1000,
      bgcolor: 'background.paper',
      border: '1px solid #3a3f51'
    }}>
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <QueueIcon fontSize="small" />
            请求队列状态
          </Typography>
          <IconButton 
            size="small" 
            onClick={() => setExpanded(!expanded)}
            sx={{ 
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s'
            }}
          >
            <ExpandMoreIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* 基本状态 */}
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <Chip 
            icon={<QueueIcon />}
            label={`队列: ${status.queueLength}`}
            size="small"
            color={getQueueColor()}
            variant="outlined"
          />
          <Chip 
            icon={<SpeedIcon />}
            label={`活跃: ${status.activeRequests}`}
            size="small"
            color={status.activeRequests > 0 ? 'primary' : 'default'}
            variant="outlined"
          />
        </Box>

        {/* 令牌桶状态 */}
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            令牌桶: {status.tokens}/8
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={getTokensProgress()} 
            sx={{ height: 4, borderRadius: 2 }}
            color={status.tokens > 3 ? 'success' : 'warning'}
          />
        </Box>

        <Collapse in={expanded}>
          <Box sx={{ pt: 1, borderTop: '1px solid #3a3f51' }}>
            {/* 成功率 */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                成功率:
              </Typography>
              <Chip 
                icon={<CheckCircleIcon />}
                label={status.successRate}
                size="small"
                color={getSuccessRateColor()}
                variant="filled"
              />
            </Box>

            {/* 最近请求数 */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                最近请求:
              </Typography>
              <Typography variant="caption">
                {status.recentRequests}
              </Typography>
            </Box>

            {/* 清空队列按钮 */}
            {status.queueLength > 0 && (
              <Box sx={{ mt: 1 }}>
                <IconButton 
                  size="small" 
                  onClick={clearQueue}
                  sx={{ 
                    bgcolor: 'error.dark',
                    color: 'white',
                    '&:hover': { bgcolor: 'error.main' }
                  }}
                  fullWidth
                >
                  <Typography variant="caption">
                    清空队列
                  </Typography>
                </IconButton>
              </Box>
            )}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  )
}

export default QueueStatus
