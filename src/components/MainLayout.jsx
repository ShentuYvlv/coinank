import React from 'react'
import { Box } from '@mui/material'
import Navbar from './Navbar'
import ChartsSection from './ChartsSection'
import TablesSection from './TablesSection'
import LoadingOverlay from './LoadingOverlay'
import TokenNews from './TokenNews'

function MainLayout() {

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />

      {/* 新的三栏布局容器 */}
      <Box sx={{
        display: 'flex',
        width: '100%',
        px: 1,
        py: 1
      }}>
        {/* 左侧边栏 - 20% 宽度 */}
        <Box
          className="box-left"
          sx={{
            width: '20%',
            bgcolor: 'background.paper',
            borderRight: '1px solid #3a3f51',
            borderRadius: '0.5rem',
            height: 'calc(100vh - 120px)', // 调整高度，因为没有StatsCards了
            overflow: 'hidden'
          }}
        >
          <TokenNews />
        </Box>

        {/* 中间主内容区域 - 60% 宽度 */}
        <Box
          sx={{
            width: '60%',
            px: 2
          }}
        >
          <ChartsSection />
          <TablesSection />
        </Box>

        {/* 右侧边栏 - 20% 宽度 */}
        <Box
          className="box-right"
          sx={{
            width: '20%',
            pl: 2,
            bgcolor: 'background.paper',
            borderLeft: '1px solid #3a3f51',
            borderRadius: '0.5rem',
          }}
        >
          {/* 右侧内容区域 - 可以在这里添加侧边栏内容 */}
          <Box sx={{ p: 2 }}>
            {/* 预留给右侧内容 */}
          </Box>
        </Box>
      </Box>

      <LoadingOverlay />
    </Box>
  )
}

export default MainLayout