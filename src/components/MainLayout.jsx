import React from 'react';
import { Box } from '@mui/material';
import Navbar from './Navbar';
import { ChartSection1, ChartSection2, ChartSection3 } from './ChartsSection';
import LoadingOverlay from './LoadingOverlay';
import TokenNews from './TokenNews';
import NetFlowChart from './charts/NetFlowChart';
import FuturesMarketData from './FuturesMarketData';
import SpotMarketData from './SpotMarketData';
// import QueueStatus from './QueueStatus'; // 已禁用队列机制
import { useStore } from '../store/useStore';

function MainLayout() {
  const { data, currentToken, isLoading } = useStore((state) => ({
    data: state.data,
    currentToken: state.currentToken,
    isLoading: state.isLoading,
  }));

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />

      {/* 顶部布局：TokenNews（左） - 中间图表（中） - 预留内容（右） */}
      <Box sx={{ display: 'flex', width: '100%', px: 1, py: 1, gap: 1 }}>
        {/* 左边栏：TokenNews */}
        <Box
          sx={{
            width: '20%',
            bgcolor: 'background.paper',
            borderRadius: '0.5rem',
            border: '1px solid #3a3f51',
            height: 'calc(50vh)',
            overflow: 'hidden',
          }}
        >
          <TokenNews />
        </Box>

        {/* 中间主内容区域，包含 ChartSection1、2、3 */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            width: '60%',
            gap: 1,
          }}
        >
          {/* ChartSection1 */}
          <Box sx={{ px: 1 }}>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>加载中...</Box>
            ) : data ? (
              <ChartSection1 data={data} currentToken={currentToken} />
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>暂无数据</Box>
            )}
          </Box>
        </Box>

        {/* 右边栏：空内容预留 */}
        <Box
          sx={{
            width: '20%',
            bgcolor: 'background.paper',
            borderRadius: '0.5rem',
            border: '1px solid #3a3f51',
            height: 'calc(50vh)',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ p: 2 }}>{/* 右侧内容 */}</Box>
        </Box>
      </Box>

        {/* 中间 期货市场数据 资金费率历史 现货市场数据 */}
      <Box sx={{ display: 'flex', width: '100%', px: 1, py: 1, gap: 1 }}>

        {/* 中间主内容区域，包含 ChartSection1、2、3 */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            gap: 1,
          }}
        >

          {/* 中间嵌套三栏：左 Futures，中 ChartSection2，右 Spot */}
          <Box sx={{ display: 'flex', width: '100%', gap: 1, px: 1,height:'60vh' }}>
            {/* FuturesMarketData */}
            <Box
              sx={{
                width: '30%',
                bgcolor: 'background.paper',
                borderRadius: '0.5rem',
                border: '1px solid #3a3f51',
                overflow: 'hidden',
              }}
            >
              <FuturesMarketData />
            </Box>

            {/* ChartSection2 */}
            <Box sx={{ width: '40%' }}>
              {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>加载中...</Box>
              ) : data ? (
                <ChartSection2 data={data} currentToken={currentToken} />
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>暂无数据</Box>
              )}
            </Box>

            {/* SpotMarketData */}
            <Box
              sx={{
                width: '30%',
                bgcolor: 'background.paper',
                borderRadius: '0.5rem',
                border: '1px solid #3a3f51',
                overflow: 'hidden',
              }}
            >
              <SpotMarketData />
            </Box>
          </Box>

      
        </Box>
      </Box>


    {/* 24H成交额趋势图 + NetFlowChart */}
    <Box sx={{ display: 'flex', width: '100%', px: 1, py: 1, gap: 1 }}>
      {/* ChartSection3 - 左半部分 */}
      <Box
        sx={{
          width: '50%',
        }}
      >
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>加载中...</Box>
        ) : data ? (
          <ChartSection3 data={data} currentToken={currentToken} />
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>暂无数据</Box>
        )}
      </Box>

      {/* NetFlowChart - 右半部分 */}
      <Box
        sx={{
          width: '50%',
        }}
      >
        <NetFlowChart />
      </Box>
    </Box>


      {/* 底部占位扩展区域 */}
      <Box sx={{ display: 'flex', width: '100%', px: 1, py: 1 }}>
        <Box sx={{ width: '20%' }} />
        <Box sx={{ width: '60%' }}>{/* 额外内容扩展区域 */}</Box>
        <Box sx={{ width: '20%' }} />
      </Box>

      <LoadingOverlay />
      {/* <QueueStatus /> 已禁用队列机制 */}
    </Box>
  );
}

export default MainLayout;
