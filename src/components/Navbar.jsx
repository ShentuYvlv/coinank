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
  Grid,
  Skeleton,
  Tooltip,
} from '@mui/material'
import {
  ShowChart as ChartIcon,
  Refresh as RefreshIcon,
  VisibilityOff as HideIcon,
  Search as SearchIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalance as AccountBalanceIcon,
  MonetizationOn as MonetizationOnIcon,
} from '@mui/icons-material'
import { useStore } from '../store/useStore'
import { useSnackbar } from 'notistack'
import { useNavbarData } from '../hooks/useNavbarData'

function Navbar() {
  const { currentToken, refreshData, switchToken, isLoading, clearAllCache } = useStore()
  const { enqueueSnackbar } = useSnackbar()
  const [tokenInput, setTokenInput] = useState('')
  const navbarData = useNavbarData()

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

        <Box sx={{ flexGrow: 1 }} />
          {/* 数据显示区域 */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'left', flexWrap: 'wrap' }}>
            {/* 总持仓量 */}
            <Tooltip title="总持仓量">
              <Chip
                icon={<TrendingUpIcon />}
                label={navbarData.loading ? <Skeleton width={60} /> : `持仓: ${navbarData.totalOI || '-'}`}
                size="small"
                variant="outlined"
                sx={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  borderColor: 'rgba(255, 255, 255, 0.23)',
                  '& .MuiChip-icon': { color: '#4caf50' }
                }}
              />
            </Tooltip>

            {/* 资金费率 */}
            {navbarData.fundingRates.length > 0 && (
              <Tooltip title="前三交易所资金费率">
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {navbarData.fundingRates.map((item, index) => (
                    <Chip
                      key={index}
                      label={`${item.exchange}: ${item.rate}`}
                      size="small"
                      variant="outlined"
                      sx={{
                        color: 'rgba(255, 255, 255, 0.8)',
                        borderColor: 'rgba(255, 255, 255, 0.23)',
                        fontSize: '0.7rem'
                      }}
                    />
                  ))}
                </Box>
              </Tooltip>
            )}

            {/* 市值 */}
            <Tooltip title="市值">
              <Chip
                icon={<MonetizationOnIcon />}
                label={navbarData.loading ? <Skeleton width={60} /> : `市值: ${navbarData.marketCap || '-'}`}
                size="small"
                variant="outlined"
                sx={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  borderColor: 'rgba(255, 255, 255, 0.23)',
                  '& .MuiChip-icon': { color: '#ff9800' }
                }}
              />
            </Tooltip>

            {/* FDV */}
            <Tooltip title="完全稀释估值">
              <Chip
                icon={<AccountBalanceIcon />}
                label={navbarData.loading ? <Skeleton width={60} /> : `FDV: ${navbarData.fdv || '-'}`}
                size="small"
                variant="outlined"
                sx={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  borderColor: 'rgba(255, 255, 255, 0.23)',
                  '& .MuiChip-icon': { color: '#2196f3' }
                }}
              />
            </Tooltip>

            {/* 供应量信息 */}
            <Tooltip title={`总供应量: ${navbarData.maxSupply || '-'} | 流通量: ${navbarData.circulatingSupply || '-'}`}>
              <Chip
                label={navbarData.loading ? <Skeleton width={80} /> : `供应: ${navbarData.circulatingSupply || '-'}/${navbarData.maxSupply || '-'}`}
                size="small"
                variant="outlined"
                sx={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  borderColor: 'rgba(255, 255, 255, 0.23)',
                  fontSize: '0.7rem'
                }}
              />
            </Tooltip>
          </Box>
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


          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={() => {
              refreshData()
              navbarData.refresh()
            }}
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

          {/* <IconButton
            size="small"
            color="warning"
            onClick={handleForceHideLoading}
            title="强制隐藏加载状态"
          >
            <HideIcon />
          </IconButton> */}
        </Box>
      </Toolbar>
    </AppBar>
  )
}

export default Navbar