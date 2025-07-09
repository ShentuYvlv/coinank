import React from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  IconButton,
  Chip,
} from '@mui/material'
import {
  ShowChart as ChartIcon,
  Refresh as RefreshIcon,
  VisibilityOff as HideIcon,
} from '@mui/icons-material'
import { useStore } from '../store/useStore'

function Navbar() {
  const { currentToken, refreshData } = useStore()

  const handleForceHideLoading = () => {
    const spinner = document.getElementById('loadingSpinner')
    if (spinner) {
      spinner.style.display = 'none'
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
            sx={{ borderColor: 'rgba(255, 255, 255, 0.23)' }}
          >
            刷新数据
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