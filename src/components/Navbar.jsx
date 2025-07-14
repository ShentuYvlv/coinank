import React, { useState } from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
} from '@mui/material'
import {
  ShowChart as ChartIcon,
  Refresh as RefreshIcon,
  VisibilityOff as HideIcon,
  Search as SearchIcon,
} from '@mui/icons-material'
import { useStore } from '../store/useStore'
import { useSnackbar } from 'notistack'

function Navbar() {
  const { currentToken, refreshData, switchToken, isLoading, clearAllCache } = useStore()
  const { enqueueSnackbar } = useSnackbar()
  const [tokenInput, setTokenInput] = useState('')

  const handleForceHideLoading = () => {
    const spinner = document.getElementById('loadingSpinner')
    if (spinner) {
      spinner.style.display = 'none'
    }
  }

  const handleTokenSearch = async () => {
    const token = tokenInput.trim().toUpperCase()
    if (!token) {
      enqueueSnackbar('请输入代币符号', { variant: 'warning' })
      return
    }

    if (token === currentToken) {
      enqueueSnackbar('已经是当前代币', { variant: 'info' })
      return
    }

    try {
      console.log(`🔍 搜索代币: ${token}`)
      await switchToken(token)
      setTokenInput('')

      // 更新 URL 参数
      const newUrl = new URL(window.location)
      newUrl.searchParams.set('basecoin', token.toLowerCase())
      window.history.pushState({}, '', newUrl)

      enqueueSnackbar(`成功切换到 ${token}`, { variant: 'success' })
    } catch (error) {
      console.error('代币切换失败:', error)
      enqueueSnackbar(`输入代币有误：${error.message || '代币切换失败'}`, { variant: 'error' })
    }
  }

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleTokenSearch()
    }
  }

  return (
    <AppBar 
      position="sticky" 
      sx={{ 
        background: 'linear-gradient(135deg, #1a1d29 0%, #252836 100%)',
        borderBottom: '1px solid #3a3f51',
        backdropFilter: 'blur(10px)',
      }}
    >
      <Toolbar>
        <ChartIcon sx={{ mr: 2 }} />
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
          Coinank Live
        </Typography>

        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* 代币搜索输入框 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              size="small"
              placeholder="输入代币符号"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              sx={{
                width: 140,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.23)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.4)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#00d4ff',
                  },
                },
                '& .MuiInputBase-input': {
                  color: '#fff',
                  '&::placeholder': {
                    color: 'rgba(255, 255, 255, 0.5)',
                  },
                },
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={handleTokenSearch}
                      disabled={isLoading || !tokenInput.trim()}
                      sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                    >
                      <SearchIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              当前代币：
            </Typography>
            <Chip
              label={currentToken}
              color="warning"
              size="small"
              sx={{ fontWeight: 'bold' }}
            />
          </Box>

          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={refreshData}
            disabled={isLoading}
            sx={{ borderColor: 'rgba(255, 255, 255, 0.23)' }}
          >
            刷新数据
          </Button>

          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              clearAllCache()
              enqueueSnackbar('缓存已清除', { variant: 'info' })
            }}
            disabled={isLoading}
            sx={{ borderColor: 'rgba(255, 255, 255, 0.23)', color: 'rgba(255, 255, 255, 0.7)' }}
          >
            清除缓存
          </Button>

          <IconButton
            size="small"
            color="warning"
            onClick={handleForceHideLoading}
            title="强制隐藏加载状态"
          >
            <HideIcon />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  )
}

export default Navbar