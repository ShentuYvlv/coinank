import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  IconButton,
  Link,
  Skeleton,
  Alert
} from '@mui/material'
import {
  AccessTime as TimeIcon,
  Share as ShareIcon,
  OpenInNew as ExternalIcon
} from '@mui/icons-material'
import { useStore } from '../store/useStore'

// 时间格式化函数
const formatTimeAgo = (timestamp) => {
  const now = Date.now() / 1000
  const diff = now - timestamp
  
  if (diff < 60) {
    return `${Math.floor(diff)}秒前`
  } else if (diff < 3600) {
    return `${Math.floor(diff / 60)}分钟前`
  } else if (diff < 86400) {
    return `${Math.floor(diff / 3600)}小时前`
  } else {
    return `${Math.floor(diff / 86400)}天前`
  }
}

// 新闻卡片组件
function NewsCard({ news }) {
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: news.title,
        text: news.abstract || news.title,
        url: `https://www.theblockbeats.info/news/${news.article_id}`
      })
    } else {
      // 复制到剪贴板
      navigator.clipboard.writeText(`${news.title} - https://www.theblockbeats.info/news/${news.article_id}`)
    }
  }

  return (
    <Card 
      sx={{ 
        mb: 2, 
        bgcolor: 'background.default',
        border: '1px solid #3a3f51',
        '&:hover': {
          borderColor: '#00d4ff',
          transform: 'translateY(-2px)',
          transition: 'all 0.3s ease'
        }
      }}
    >
      <CardContent sx={{ p: 2 }}>
        {/* 时间和来源 */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <TimeIcon sx={{ fontSize: 14, color: 'text.secondary', mr: 0.5 }} />
          <Typography variant="caption" color="text.secondary">
            {formatTimeAgo(news.add_time)}
          </Typography>
          <Typography variant="caption" color="primary" sx={{ ml: 1 }}>
            ForesightNews
          </Typography>
        </Box>

        {/* 标题 */}
        <Typography 
          variant="subtitle2" 
          sx={{ 
            fontWeight: 600,
            mb: 1,
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {news.title}
        </Typography>

        {/* 内容摘要 */}
        {news.content && (
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ 
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.4,
              mb: 1
            }}
            dangerouslySetInnerHTML={{ 
              __html: news.content.replace(/<em>/g, '<span style="color: #00d4ff;">').replace(/<\/em>/g, '</span>') 
            }}
          />
        )}

        {/* 标签和操作 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {news.type === 1 && (
              <Chip 
                label="快讯" 
                size="small" 
                sx={{ 
                  height: 20, 
                  fontSize: '0.7rem',
                  bgcolor: '#00d4ff',
                  color: 'white'
                }} 
              />
            )}
          </Box>
          
          <Box>
            <IconButton 
              size="small" 
              onClick={handleShare}
              sx={{ color: 'text.secondary' }}
            >
              <ShareIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton 
              size="small"
              component={Link}
              href={`https://www.theblockbeats.info/news/${news.article_id}`}
              target="_blank"
              sx={{ color: 'text.secondary' }}
            >
              <ExternalIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

// 加载骨架屏
function NewsCardSkeleton() {
  return (
    <Card sx={{ mb: 2, bgcolor: 'background.default', border: '1px solid #3a3f51' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Skeleton variant="circular" width={14} height={14} sx={{ mr: 0.5 }} />
          <Skeleton variant="text" width={80} height={16} />
          <Skeleton variant="text" width={100} height={16} sx={{ ml: 1 }} />
        </Box>
        <Skeleton variant="text" width="100%" height={20} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="80%" height={20} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="100%" height={16} />
        <Skeleton variant="text" width="90%" height={16} />
        <Skeleton variant="text" width="70%" height={16} sx={{ mb: 1 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton variant="rectangular" width={40} height={20} sx={{ borderRadius: 1 }} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Skeleton variant="circular" width={24} height={24} />
            <Skeleton variant="circular" width={24} height={24} />
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

// 主要新闻组件
function TokenNews() {
  const { currentToken } = useStore()
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // 获取新闻数据
  const fetchNews = async (token) => {
    if (!token) return

    setLoading(true)
    setError(null)

    try {
      // 直接请求外部API
      const apiUrl = `https://api.blockbeats.cn/v2/search/list?page=1&limit=10&title=${token}&start_time=1752650683&end_time=1753255483&order=1&is_flash=1`

      const response = await fetch(apiUrl)

      if (!response.ok) {
        throw new Error('获取新闻失败')
      }

      const data = await response.json()

      if (data.code === 0) {
        setNews(data.data.list || [])
      } else {
        throw new Error(data.msg || '获取新闻失败')
      }
    } catch (err) {
      console.error('获取新闻失败:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 监听代币变化
  useEffect(() => {
    if (currentToken) {
      fetchNews(currentToken)
    }
  }, [currentToken])

  return (
    <Box sx={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* 标题 */}
      {/* <Box sx={{borderBottom: '1px solid #3a3f51' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          代币新闻
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {currentToken} 相关资讯
        </Typography>
      </Box> */}

      {/* 新闻列表 */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        {loading && (
          <>
            {[...Array(3)].map((_, index) => (
              <NewsCardSkeleton key={index} />
            ))}
          </>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && news.length === 0 && (
          <Alert severity="info">
            暂无 {currentToken} 相关新闻
          </Alert>
        )}

        {!loading && !error && news.length > 0 && (
          <>
            {news.map((item) => (
              <NewsCard key={item.id} news={item} />
            ))}
          </>
        )}
      </Box>
    </Box>
  )
}

export default TokenNews
