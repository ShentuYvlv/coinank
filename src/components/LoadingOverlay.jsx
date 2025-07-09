import React from 'react'
import { Backdrop, CircularProgress, Box, Typography } from '@mui/material'
import { useStore } from '../store/useStore'

const LoadingOverlay = () => {
  const isLoading = useStore((state) => state.isLoading)
  
  return (
    <Backdrop
      sx={{
        color: '#fff',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
      }}
      open={isLoading}
    >
      <Box sx={{ textAlign: 'center' }}>
        <CircularProgress 
          color="primary" 
          size={60}
          thickness={4}
          sx={{ mb: 2 }}
        />
        <Typography variant="h6" sx={{ mt: 2 }}>
          加载中...
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
          正在获取最新市场数据
        </Typography>
      </Box>
    </Backdrop>
  )
}

export default LoadingOverlay